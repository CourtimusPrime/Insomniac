import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { workspaces } from "./workspaces.js";

export const agents = sqliteTable("agents", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  name: text("name").notNull(),
  role: text("role"),
  model: text("model"),
  provider: text("provider"),
  systemPrompt: text("system_prompt"),
  status: text("status", {
    enum: ["idle", "working", "paused", "error"],
  })
    .notNull()
    .default("idle"),
  currentTask: text("current_task"),
  progress: integer("progress").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
