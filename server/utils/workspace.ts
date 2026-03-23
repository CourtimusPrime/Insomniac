import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { workspaces } from '../db/schema/index.js';

const DEFAULT_WORKSPACE_NAME = 'Default';

export async function getOrCreateDefaultWorkspace(): Promise<string> {
  const existing = db
    .select()
    .from(workspaces)
    .where(eq(workspaces.name, DEFAULT_WORKSPACE_NAME))
    .get();

  if (existing) return existing.id;

  const id = crypto.randomUUID();
  db.insert(workspaces).values({ id, name: DEFAULT_WORKSPACE_NAME }).run();
  return id;
}
