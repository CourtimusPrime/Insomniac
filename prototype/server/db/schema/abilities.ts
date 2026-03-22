import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { workspaces } from "./workspaces.js";

export const abilities = sqliteTable("abilities", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["skill", "plugin", "mcp"],
  }).notNull(),
  active: integer("active", { mode: "boolean" })
    .notNull()
    .default(true),
  config: text("config", { mode: "json" }),
  version: text("version"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
