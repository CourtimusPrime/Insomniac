import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { projects } from './projects.js';
import { providers } from './providers.js';

export const projectPreferences = sqliteTable('project_preferences', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  providerId: text('provider_id')
    .notNull()
    .references(() => providers.id),
  defaultModel: text('default_model'),
  taskTypeOverrides: text('task_type_overrides', { mode: 'json' }).$type<
    Record<string, string>
  >(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});
