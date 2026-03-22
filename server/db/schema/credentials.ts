import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { workspaces } from "./workspaces.js";
import { projects } from "./projects.js";

export const credentials = sqliteTable("credentials", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  name: text("name").notNull(),
  providerName: text("provider_name").notNull(),
  clientId: text("client_id").notNull(), // AES-256-GCM encrypted
  clientSecret: text("client_secret").notNull(), // AES-256-GCM encrypted
  redirectUri: text("redirect_uri").notNull(),
  scopes: text("scopes", { mode: "json" }).$type<string[]>().notNull(),
  projectId: text("project_id").references(() => projects.id), // null = global
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
