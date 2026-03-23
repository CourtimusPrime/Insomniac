import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { projects } from './projects.js';
import { workspaces } from './workspaces.js';

export const pipelines = sqliteTable('pipelines', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  name: text('name').notNull(),
  status: text('status', {
    enum: ['idle', 'running', 'completed', 'error', 'paused', 'cancelled'],
  })
    .notNull()
    .default('idle'),
  checkpointStageId: text('checkpoint_stage_id'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});
