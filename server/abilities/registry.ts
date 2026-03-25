import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { abilitiesV2 } from '../db/schema/index.js';
import { parseAbilityYaml, serializeAbilityYaml } from './parser.js';
import type { AbilityDocument } from './types.js';

export interface SyncResult {
  added: number;
  updated: number;
  removed: number;
  errors: Array<{ file: string; error: string }>;
}

export class AbilityRegistry {
  private dir: string;

  constructor(dir?: string) {
    this.dir = dir ?? join(homedir(), '.insomniac', 'abilities');
  }

  /** Get (and create if needed) the registry directory */
  getRegistryDir(): string {
    mkdirSync(this.dir, { recursive: true });
    return this.dir;
  }

  /** List all *.yaml filenames in the registry */
  listFiles(): string[] {
    const dir = this.getRegistryDir();
    return readdirSync(dir).filter((f) => f.endsWith('.yaml'));
  }

  /** Read and parse an ability YAML file */
  readAbility(filename: string): AbilityDocument {
    const filePath = join(this.getRegistryDir(), filename);
    const raw = readFileSync(filePath, 'utf-8');
    return parseAbilityYaml(raw);
  }

  /** Serialize and write an AbilityDocument to disk */
  writeAbility(doc: AbilityDocument): string {
    const filename = `${doc.frontmatter.id}.yaml`;
    const filePath = join(this.getRegistryDir(), filename);
    const content = serializeAbilityYaml(doc);
    writeFileSync(filePath, content, 'utf-8');
    return filename;
  }

  /** Delete an ability file from disk */
  deleteAbility(filename: string): void {
    const filePath = join(this.getRegistryDir(), filename);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  /** Compute SHA-256 hash of a file */
  hashFile(filename: string): string {
    const filePath = join(this.getRegistryDir(), filename);
    const content = readFileSync(filePath, 'utf-8');
    return createHash('sha256').update(content).digest('hex');
  }

  /** Full disk -> DB reconciliation */
  syncToDb(workspaceId: string): SyncResult {
    const result: SyncResult = { added: 0, updated: 0, removed: 0, errors: [] };

    const files = this.listFiles();
    const fileIds = new Set<string>();

    for (const file of files) {
      try {
        const doc = this.readAbility(file);
        const hash = this.hashFile(file);
        const id = doc.frontmatter.id;
        fileIds.add(id);

        const existing = db
          .select()
          .from(abilitiesV2)
          .where(eq(abilitiesV2.id, id))
          .get();

        if (!existing) {
          // Insert new
          db.insert(abilitiesV2)
            .values({
              id,
              workspaceId,
              name: doc.frontmatter.name,
              description: doc.frontmatter.description,
              version: doc.frontmatter.version,
              author: doc.frontmatter.author,
              tags: doc.frontmatter.tags,
              executor: doc.config.runtime.executor,
              enabled: doc.frontmatter.enabled,
              document: doc as unknown as Record<string, unknown>,
              filePath: file,
              contentHash: hash,
            })
            .run();
          result.added++;
        } else if (existing.contentHash !== hash) {
          // Update changed
          db.update(abilitiesV2)
            .set({
              name: doc.frontmatter.name,
              description: doc.frontmatter.description,
              version: doc.frontmatter.version,
              author: doc.frontmatter.author,
              tags: doc.frontmatter.tags,
              executor: doc.config.runtime.executor,
              enabled: doc.frontmatter.enabled,
              document: doc as unknown as Record<string, unknown>,
              filePath: file,
              contentHash: hash,
              updatedAt: new Date(),
              syncedAt: new Date(),
            })
            .where(eq(abilitiesV2.id, id))
            .run();
          result.updated++;
        }
        // else: unchanged, skip
      } catch (e) {
        result.errors.push({
          file,
          error: (e as Error).message,
        });
      }
    }

    // Remove DB entries whose files no longer exist on disk
    const allDbEntries = db.select().from(abilitiesV2).all();
    for (const entry of allDbEntries) {
      if (entry.workspaceId === workspaceId && !fileIds.has(entry.id)) {
        db.delete(abilitiesV2).where(eq(abilitiesV2.id, entry.id)).run();
        result.removed++;
      }
    }

    return result;
  }
}
