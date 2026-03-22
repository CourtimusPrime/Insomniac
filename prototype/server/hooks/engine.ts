import { spawn } from "node:child_process";
import { eq, and, or, isNull } from "drizzle-orm";
import { db } from "../db/connection.js";
import { hooks } from "../db/schema/hooks.js";
import { broadcast } from "../ws/handler.js";
import { SlackNotifier } from "../integrations/slack.js";

type HookRow = typeof hooks.$inferSelect;

export interface HookContext {
  pipelineId?: string;
  stageId?: string;
  projectId?: string;
  status?: string;
  error?: string;
  [key: string]: unknown;
}

export type HookTrigger = HookRow["trigger"];

interface HookResult {
  success: boolean;
  error?: string;
}

export class HooksEngine {
  private slackNotifier = new SlackNotifier();

  /**
   * Fire all enabled hooks matching the given trigger.
   * Hooks run asynchronously and do not block the caller.
   */
  fire(trigger: HookTrigger, context: HookContext): void {
    const projectId = context.projectId ?? null;

    const matchingHooks = db
      .select()
      .from(hooks)
      .where(
        and(
          eq(hooks.trigger, trigger),
          eq(hooks.enabled, true),
          or(
            projectId ? eq(hooks.projectId, projectId) : isNull(hooks.projectId),
            isNull(hooks.projectId)
          )
        )
      )
      .all();

    for (const hook of matchingHooks) {
      this.executeHook(hook, context).then((result) => {
        broadcast("hook:fired", {
          hookId: hook.id,
          trigger,
          result,
        });
      });
    }
  }

  /**
   * Execute a single hook's action and return the result.
   */
  async executeHook(hook: HookRow, context: HookContext): Promise<HookResult> {
    const actionType = hook.action.type;

    try {
      switch (actionType) {
        case "shell":
          return await this.executeShell(hook.action.config, context);
        case "webhook":
          return await this.executeWebhook(hook.action.config, context);
        case "slack":
          return await this.executeSlack(hook.action.config, context, hook);
        default:
          return { success: false, error: `Unknown action type: ${actionType}` };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  private executeShell(
    config: Record<string, unknown>,
    context: HookContext
  ): Promise<HookResult> {
    const command = String(config.command ?? "");
    if (!command) {
      return Promise.resolve({ success: false, error: "No shell command provided" });
    }

    return new Promise((resolve) => {
      const proc = spawn("sh", ["-c", command], {
        env: {
          ...process.env,
          HOOK_TRIGGER: String(context.pipelineId ?? ""),
          HOOK_PIPELINE_ID: String(context.pipelineId ?? ""),
          HOOK_STAGE_ID: String(context.stageId ?? ""),
          HOOK_PROJECT_ID: String(context.projectId ?? ""),
          HOOK_STATUS: String(context.status ?? ""),
        },
        timeout: 30_000,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString();
      });
      proc.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: stderr || `Exited with code ${code}` });
        }
      });

      proc.on("error", (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  }

  private async executeWebhook(
    config: Record<string, unknown>,
    context: HookContext
  ): Promise<HookResult> {
    const url = String(config.url ?? "");
    if (!url) {
      return { success: false, error: "No webhook URL provided" };
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });

      if (!response.ok) {
        const body = await response.text();
        return { success: false, error: `Webhook error (${response.status}): ${body}` };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Webhook failed: ${message}` };
    }
  }

  private async executeSlack(
    config: Record<string, unknown>,
    context: HookContext,
    hook: HookRow
  ): Promise<HookResult> {
    const webhookUrl = String(config.webhookUrl ?? "");
    if (!webhookUrl) {
      return { success: false, error: "No Slack webhook URL provided" };
    }

    const message = String(config.message ?? `Hook "${hook.name}" fired (${hook.trigger})`);
    const details = [
      context.pipelineId ? `Pipeline: ${context.pipelineId}` : null,
      context.stageId ? `Stage: ${context.stageId}` : null,
      context.status ? `Status: ${context.status}` : null,
      context.error ? `Error: ${context.error}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    return this.slackNotifier.sendMessage(webhookUrl, {
      text: message,
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: `*${message}*` } },
        ...(details
          ? [{ type: "section", text: { type: "mrkdwn", text: details } }]
          : []),
      ],
    });
  }
}
