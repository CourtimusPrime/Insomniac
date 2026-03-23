import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { workspaces } from './workspaces.js';

export const settings = sqliteTable('settings', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  key: text('key').notNull(),
  value: text('value', { mode: 'json' }),
  category: text('category'),
});
