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
   * Executes the pipeline stages sequentially in sortOrder.
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
      for (const stage of this.stages) {
        await this.executeStage(stage);
      }
      // All stages complete
      this.updatePipelineStatus("completed");
    } catch (err) {
      this.updatePipelineStatus("error");
      throw err;
    }
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
      // Clean up the agent
      if (agent) {
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
   * Updates the pipeline status in the database and broadcasts a WebSocket event.
   */
  private updatePipelineStatus(
    status: "idle" | "running" | "completed" | "error",
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
    status: "queued" | "running" | "done" | "needs-you" | "error",
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
}
