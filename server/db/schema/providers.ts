import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { workspaces } from './workspaces.js';

export const providers = sqliteTable('providers', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  name: text('name', {
    enum: ['anthropic', 'openai', 'google', 'openrouter', 'ollama', 'custom'],
  }).notNull(),
  displayName: text('display_name').notNull(),
  baseUrl: text('base_url'),
  apiKeyEncrypted: text('api_key_encrypted'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});
