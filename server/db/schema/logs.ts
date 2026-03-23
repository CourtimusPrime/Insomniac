import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const logEntries = sqliteTable('log_entries', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  source: text('source').notNull(), // 'orchestrator' | 'agent' | 'system' | 'error'
  level: text('level').notNull().default('info'), // 'info' | 'warn' | 'error'
  message: text('message').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});
