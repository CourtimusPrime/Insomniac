import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { workspaces } from './workspaces.js';

export const templates = sqliteTable('templates', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category', {
    enum: ['workflow', 'agent-config', 'template', 'mcp-adapter'],
  }).notNull(),
  chainDefinition: text('chain_definition', { mode: 'json' }),
  author: text('author'),
  version: text('version'),
  isBuiltIn: integer('is_built_in', { mode: 'boolean' })
    .notNull()
    .default(false),
  installCount: integer('install_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});
