import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../data');
const SECRET_PATH = resolve(DATA_DIR, '.secret');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const SALT_PATH = resolve(DATA_DIR, '.salt');

function getSalt(): Buffer {
  if (existsSync(SALT_PATH)) return readFileSync(SALT_PATH);
  const salt = randomBytes(32);
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(SALT_PATH, salt, { mode: 0o600 });
  return salt;
}

function getSecret(): Buffer {
  const salt = getSalt();

  // Env var takes precedence
  if (process.env.INSOMNIAC_SECRET) {
    return scryptSync(process.env.INSOMNIAC_SECRET, salt, 32);
  }

  // Read or generate file-based secret
  if (existsSync(SECRET_PATH)) {
    const raw = readFileSync(SECRET_PATH, 'utf8').trim();
    return scryptSync(raw, salt, 32);
  }

  // Auto-generate on first run
  const generated = randomBytes(32).toString('hex');
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(SECRET_PATH, generated, { mode: 0o600 });
  return scryptSync(generated, salt, 32);
}

let _cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (!_cachedKey) {
    _cachedKey = getSecret();
  }
  return _cachedKey;
}

/**
 * Encrypt a plaintext API key using AES-256-GCM.
 * Returns a hex string in the format: iv:authTag:ciphertext
 */
export function encryptApiKey(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a ciphertext string previously encrypted with encryptApiKey.
 * Expects format: iv:authTag:ciphertext (all hex-encoded)
 */
export function decryptApiKey(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
