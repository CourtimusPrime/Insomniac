import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { workspaces } from "./workspaces.js";
import { projects } from "./projects.js";
import { pipelines } from "./pipelines.js";
import { pipelineStages } from "./pipeline-stages.js";

export const usageRecords = sqliteTable("usage_records", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  projectId: text("project_id").references(() => projects.id),
  pipelineId: text("pipeline_id").references(() => pipelines.id),
  stageId: text("stage_id").references(() => pipelineStages.id),
  agentName: text("agent_name").notNull(),
  model: text("model").notNull(),
  provider: text("provider").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  toolCalls: integer("tool_calls").notNull().default(0),
  estimatedCost: real("estimated_cost").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
