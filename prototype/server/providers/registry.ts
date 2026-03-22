import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { providers } from "../db/schema/index.js";
import { encryptApiKey, decryptApiKey } from "../crypto/keys.js";

type ProviderName =
  | "anthropic"
  | "openai"
  | "google"
  | "openrouter"
  | "ollama"
  | "custom";

export interface AddProviderConfig {
  workspaceId: string;
  name: ProviderName;
  displayName: string;
  baseUrl?: string;
  apiKey?: string;
  isActive?: boolean;
}

export interface UpdateProviderConfig {
  displayName?: string;
  baseUrl?: string;
  apiKey?: string;
  isActive?: boolean;
}

/** Provider row as returned to callers (never includes decrypted key). */
export type ProviderPublic = Omit<
  typeof providers.$inferSelect,
  "apiKeyEncrypted"
> & {
  hasApiKey: boolean;
};

/** Provider row with the decrypted key — only for internal API-call use. */
export type ProviderWithKey = typeof providers.$inferSelect & {
  apiKeyDecrypted: string | null;
};

function toPublic(
  row: typeof providers.$inferSelect,
): ProviderPublic {
  const { apiKeyEncrypted, ...rest } = row;
  return { ...rest, hasApiKey: !!apiKeyEncrypted };
}

export class ProviderRegistry {
  /** List all providers without decrypted keys. */
  listProviders(): ProviderPublic[] {
    const rows = db.select().from(providers).all();
    return rows.map(toPublic);
  }

  /** Get a single provider by ID (without decrypted key). */
  getProvider(id: string): ProviderPublic | undefined {
    const row = db
      .select()
      .from(providers)
      .where(eq(providers.id, id))
      .get();
    return row ? toPublic(row) : undefined;
  }

  /**
   * Get a provider with the decrypted API key.
   * Only use this when making actual API calls — never return to frontend.
   */
  getProviderWithKey(id: string): ProviderWithKey | undefined {
    const row = db
      .select()
      .from(providers)
      .where(eq(providers.id, id))
      .get();

    if (!row) return undefined;

    return {
      ...row,
      apiKeyDecrypted: row.apiKeyEncrypted
        ? decryptApiKey(row.apiKeyEncrypted)
        : null,
    };
  }

  /** Add a new provider. Encrypts the API key before storing. */
  addProvider(config: AddProviderConfig): ProviderPublic {
    const id = crypto.randomUUID();
    const apiKeyEncrypted = config.apiKey
      ? encryptApiKey(config.apiKey)
      : undefined;

    db.insert(providers)
      .values({
        id,
        workspaceId: config.workspaceId,
        name: config.name,
        displayName: config.displayName,
        baseUrl: config.baseUrl,
        apiKeyEncrypted,
        isActive: config.isActive ?? !!config.apiKey,
      })
      .run();

    const created = db
      .select()
      .from(providers)
      .where(eq(providers.id, id))
      .get();

    return toPublic(created!);
  }

  /** Update an existing provider. Encrypts the API key if provided. */
  updateProvider(
    id: string,
    config: UpdateProviderConfig,
  ): ProviderPublic | undefined {
    const existing = db
      .select()
      .from(providers)
      .where(eq(providers.id, id))
      .get();

    if (!existing) return undefined;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (config.displayName !== undefined)
      updates.displayName = config.displayName;
    if (config.baseUrl !== undefined) updates.baseUrl = config.baseUrl;
    if (config.apiKey !== undefined)
      updates.apiKeyEncrypted = encryptApiKey(config.apiKey);
    if (config.isActive !== undefined) updates.isActive = config.isActive;

    db.update(providers).set(updates).where(eq(providers.id, id)).run();

    const updated = db
      .select()
      .from(providers)
      .where(eq(providers.id, id))
      .get();

    return toPublic(updated!);
  }

  /** Remove a provider by ID. Returns true if deleted, false if not found. */
  removeProvider(id: string): boolean {
    const existing = db
      .select()
      .from(providers)
      .where(eq(providers.id, id))
      .get();

    if (!existing) return false;

    db.delete(providers).where(eq(providers.id, id)).run();
    return true;
  }
}
