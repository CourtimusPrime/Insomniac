import { sql } from 'drizzle-orm';
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import { abilities } from './abilities.js';
import { pipelineStages } from './pipeline-stages.js';

export const stageAbilities = sqliteTable(
  'stage_abilities',
  {
    stageId: text('stage_id')
      .notNull()
      .references(() => pipelineStages.id),
    abilityId: text('ability_id')
      .notNull()
      .references(() => abilities.id),
    assignedAt: integer('assigned_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [primaryKey({ columns: [table.stageId, table.abilityId] })],
);
