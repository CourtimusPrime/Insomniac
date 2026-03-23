import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { agents } from './agents.js';
import { pipelineStages } from './pipeline-stages.js';
import { projects } from './projects.js';
import { workspaces } from './workspaces.js';

export const decisions = sqliteTable('decisions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  projectId: text('project_id').references(() => projects.id),
  agentId: text('agent_id').references(() => agents.id),
  stageId: text('stage_id').references(() => pipelineStages.id),
  question: text('question').notNull(),
  options: text('options', { mode: 'json' }),
  resolution: text('resolution'),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});
