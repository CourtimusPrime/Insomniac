import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { workspaces } from './workspaces.js';

// Legacy table — kept during migration period
export const abilities = sqliteTable('abilities', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['skill', 'plugin', 'mcp'],
  }).notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  config: text('config', { mode: 'json' }),
  version: text('version'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// New unified abilities table — slug-based IDs, disk-synced
export const abilitiesV2 = sqliteTable('abilities_v2', {
  id: text('id').primaryKey(), // slug from YAML frontmatter, e.g. "summarize-code"
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  version: text('version').notNull().default('1.0.0'),
  author: text('author').notNull().default(''),
  tags: text('tags', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  executor: text('executor', {
    enum: ['skill', 'command', 'mcp', 'workflow'],
  }).notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  document: text('document', { mode: 'json' }).$type<Record<string, unknown>>(),
  filePath: text('file_path').notNull(),
  contentHash: text('content_hash').notNull(),
  syncedAt: integer('synced_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});
