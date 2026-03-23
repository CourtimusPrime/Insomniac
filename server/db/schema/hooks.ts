import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { projects } from './projects.js';
import { workspaces } from './workspaces.js';

export const hooks = sqliteTable('hooks', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  name: text('name').notNull(),
  trigger: text('trigger', {
    enum: [
      'pre-stage',
      'post-stage',
      'on-decision',
      'on-agent-error',
      'on-pipeline-complete',
      'on-file-change',
      'on-test-fail',
      'on-test-pass',
      'scheduled',
    ],
  }).notNull(),
  action: text('action', { mode: 'json' })
    .$type<{ type: string; config: Record<string, unknown> }>()
    .notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  projectId: text('project_id').references(() => projects.id),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});
