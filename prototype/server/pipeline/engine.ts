import { eq, asc } from "drizzle-orm";
import { db } from "../db/connection.js";
import { pipelines, pipelineStages, agents } from "../db/schema/index.js";
import { createAgent, getTransportSetting } from "../agents/index.js";
import type { AgentAdapter, AgentConfig } from "../agents/types.js";
import { broadcast } from "../ws/handler.js";

type PipelineRow = typeof pipelines.$inferSelect;
type StageRow = typeof pipelineStages.$inferSelect;

export class PipelineEngine {
  private pipelineId: string;
  private pipeline: PipelineRow | null = null;
  private stages: StageRow[] = [];
  private pauseRequested = false;
  private cancelRequested = false;
  private activeAgents: AgentAdapter[] = [];

  constructor(pipelineId: string) {
    this.pipelineId = pipelineId;
  }

  /**
   * Loads the pipeline and its stages from the database.
   * Stages are sorted by sortOrder ascending.
   */
  private load(): void {
    const row = db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, this.pipelineId))
      .get();

    if (!row) {
      throw new Error(`Pipeline not found: ${this.pipelineId}`);
    }

    this.pipeline = row;

    this.stages = db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, this.pipelineId))
      .orderBy(asc(pipelineStages.sortOrder))
      .all();
  }

  /**
   * Executes the pipeline stages in sortOrder.
   * Stages with the same sortOrder are executed in parallel.
   */
  async run(): Promise<void> {
    this.load();

    if (!this.pipeline) {
      throw new Error(`Pipeline not found: ${this.pipelineId}`);
    }

    if (this.stages.length === 0) {
      throw new Error(`Pipeline has no stages: ${this.pipelineId}`);
    }

    // Set pipeline status to running
    this.updatePipelineStatus("running");

    try {
      const groups = this.groupStagesBySortOrder(this.stages);
      for (const group of groups) {
        if (this.shouldStop()) break;
        await this.executeStageGroup(group);
        // Update status AFTER the group completes, not when pause() is called
        if (this.pauseRequested) {
          this.updatePipelineStatus("paused");
          break;
        }
      }
      // Only mark completed if we weren't interrupted
      if (!this.shouldStop()) {
        this.updatePipelineStatus("completed");
      }
    } catch (err) {
      if (!this.cancelRequested) {
        this.updatePipelineStatus("error");
      }
      throw err;
    }
  }

  /**
   * Pauses the pipeline after the current stage group completes.
   * Sets status to 'paused' and stops the execution loop.
   */
  pause(): void {
    if (this.cancelRequested) return;
    this.pauseRequested = true;
    // Status update deferred to the run loop — only set "paused" after the
    // current stage group finishes, preventing a DB/WS lie while agents
    // are still active.
  }

  /**
   * Cancels the pipeline immediately, aborting any active agents.
   */
  async cancel(): Promise<void> {
    this.cancelRequested = true;
    this.pauseRequested = false;
    this.updatePipelineStatus("cancelled");

    // Abort all active agents
    const abortPromises = this.activeAgents.map(async (agent) => {
      try {
        await agent.abort();
      } catch {
        // Ignore abort errors during cancellation
      }
    });
    await Promise.all(abortPromises);
    this.activeAgents = [];
  }

  /**
   * Resumes the pipeline from the stage after the last checkpoint.
   * Skips stages that already have status 'done'.
   */
  async resume(): Promise<void> {
    this.load();

    if (!this.pipeline) {
      throw new Error(`Pipeline not found: ${this.pipelineId}`);
    }

    if (this.stages.length === 0) {
      throw new Error(`Pipeline has no stages: ${this.pipelineId}`);
    }

    // Find the index to resume from
    const startIndex = this.getResumeIndex();
    const remainingStages = this.stages.slice(startIndex);

    // Set pipeline status to running
    this.updatePipelineStatus("running");

    // Reset interrupt flags on resume
    this.pauseRequested = false;
    this.cancelRequested = false;

    try {
      const groups = this.groupStagesBySortOrder(remainingStages);
      for (const group of groups) {
        if (this.shouldStop()) break;
        // Filter out already-done stages within the group
        const pending = group.filter((s) => s.status !== "done" && s.status !== "skipped");
        if (pending.length === 0) continue;
        await this.executeStageGroup(pending);
      }
      // Only mark completed if we weren't interrupted
      if (!this.shouldStop()) {
        this.updatePipelineStatus("completed");
      }
    } catch (err) {
      if (!this.cancelRequested) {
        this.updatePipelineStatus("error");
      }
      throw err;
    }
  }

  /**
   * Determines the stage index to resume from based on the checkpoint.
   * Returns the index of the stage after the checkpointed stage,
   * or 0 if no checkpoint exists.
   */
  private getResumeIndex(): number {
    if (!this.pipeline?.checkpointStageId) {
      return 0;
    }

    const checkpointIndex = this.stages.findIndex(
      (s) => s.id === this.pipeline!.checkpointStageId,
    );

    if (checkpointIndex === -1) {
      return 0;
    }

    // Start from the stage after the checkpoint
    return checkpointIndex + 1;
  }

  /**
   * Groups stages by their sortOrder value.
   * Returns an array of groups, sorted by sortOrder ascending.
   * Stages within the same group execute in parallel.
   */
  private groupStagesBySortOrder(stages: StageRow[]): StageRow[][] {
    const groups = new Map<number, StageRow[]>();
    for (const stage of stages) {
      const order = stage.sortOrder;
      if (!groups.has(order)) {
        groups.set(order, []);
      }
      groups.get(order)!.push(stage);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([, g]) => g);
  }

  /**
   * Executes a group of stages. If the group has a single stage, it runs
   * directly. If multiple, they run in parallel via Promise.allSettled.
   * All parallel stages complete even if some fail. If any fail, the
   * pipeline reports partial failure. Checkpoints after full group success.
   */
  private async executeStageGroup(group: StageRow[]): Promise<void> {
    if (group.length === 1) {
      await this.executeStage(group[0]);
      this.updateCheckpoint(group[0].id);
      return;
    }

    // Execute parallel stages — allSettled lets all finish even if some fail
    const results = await Promise.allSettled(
      group.map((stage) => this.executeStage(stage)),
    );

    const failures = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );

    if (failures.length > 0) {
      // Do NOT checkpoint — the group had partial failures
      throw new Error(
        `${failures.length} of ${group.length} parallel stages failed`,
      );
    }

    // All stages in the group succeeded — checkpoint the last one
    this.updateCheckpoint(group[group.length - 1].id);
  }

  /**
   * Executes a single pipeline stage: spawns an agent, sends the prompt,
   * waits for the response, and updates the stage status.
   */
  private async executeStage(stage: StageRow): Promise<void> {
    // Set stage status to running
    this.updateStageStatus(stage.id, "running");

    let agent: AgentAdapter | null = null;

    try {
      const config = this.buildAgentConfig(stage);
      agent = await createAgent(config);
      this.activeAgents.push(agent);

      // Send the stage description (or name) as the prompt
      const prompt = stage.description ?? stage.name;
      await agent.sendMessage(prompt);

      // Wait for the agent to complete
      await agent.getResponse();

      this.updateStageStatus(stage.id, "done");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[PipelineEngine] Stage "${stage.name}" failed: ${message}`);
      this.updateStageStatus(stage.id, "error");
      throw err;
    } finally {
      // Remove from active agents and clean up
      if (agent) {
        this.activeAgents = this.activeAgents.filter((a) => a !== agent);
        try {
          await agent.abort();
        } catch {
          // Ignore abort errors during cleanup
        }
      }
    }
  }

  /**
   * Builds an AgentConfig for the given stage, looking up the agent
   * record from the database if an agentId is set.
   */
  private buildAgentConfig(stage: StageRow): AgentConfig {
    if (!this.pipeline) {
      throw new Error("Pipeline not loaded");
    }

    // Look up the agent record if the stage has an agentId
    const agentRow = stage.agentId
      ? db.select().from(agents).where(eq(agents.id, stage.agentId)).get()
      : null;

    const transport = getTransportSetting(this.pipeline.workspaceId);

    return {
      name: agentRow?.name ?? stage.name,
      model: stage.model ?? agentRow?.model ?? "claude-sonnet-4-6",
      provider: agentRow?.provider ?? "anthropic",
      systemPrompt: agentRow?.systemPrompt ?? "",
      transport,
    };
  }

  /**
   * Returns true if the engine should stop executing further groups.
   */
  private shouldStop(): boolean {
    return this.pauseRequested || this.cancelRequested;
  }

  /**
   * Updates the pipeline status in the database and broadcasts a WebSocket event.
   */
  private updatePipelineStatus(
    status: "idle" | "running" | "completed" | "error" | "paused" | "cancelled",
  ): void {
    db.update(pipelines)
      .set({ status, updatedAt: new Date() })
      .where(eq(pipelines.id, this.pipelineId))
      .run();

    broadcast("pipeline:status", {
      pipelineId: this.pipelineId,
      status,
    });
  }

  /**
   * Updates a stage status in the database and broadcasts a WebSocket event.
   */
  private updateStageStatus(
    stageId: string,
    status: "queued" | "running" | "done" | "needs-you" | "error" | "skipped",
  ): void {
    db.update(pipelineStages)
      .set({ status })
      .where(eq(pipelineStages.id, stageId))
      .run();

    broadcast("stage:status", {
      pipelineId: this.pipelineId,
      stageId,
      status,
    });
  }

  /**
   * Updates the pipeline's checkpoint to the given stage ID.
   */
  private updateCheckpoint(stageId: string): void {
    db.update(pipelines)
      .set({ checkpointStageId: stageId, updatedAt: new Date() })
      .where(eq(pipelines.id, this.pipelineId))
      .run();
  }
}
