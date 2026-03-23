import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { pipelines } from './pipelines.js';

export const pipelineStages = sqliteTable('pipeline_stages', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  pipelineId: text('pipeline_id')
    .notNull()
    .references(() => pipelines.id),
  name: text('name').notNull(),
  agentId: text('agent_id'),
  model: text('model'),
  status: text('status', {
    enum: ['queued', 'running', 'done', 'needs-you', 'error', 'skipped'],
  })
    .notNull()
    .default('queued'),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
});
