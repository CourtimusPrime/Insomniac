type ProviderName =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'openrouter'
  | 'ollama'
  | 'custom';

export interface KeyTestResult {
  valid: boolean;
  error?: string;
}

const TIMEOUT_MS = 10_000;

/**
 * Test an API key by making a minimal, low-cost request to the provider.
 * Each provider uses the cheapest possible call to verify credentials.
 */
export async function testProviderKey(
  provider: ProviderName,
  apiKey: string,
  baseUrl?: string | null,
): Promise<KeyTestResult> {
  switch (provider) {
    case 'anthropic':
      return testAnthropic(apiKey);
    case 'openai':
      return testOpenAI(apiKey);
    case 'google':
      return testGoogle(apiKey);
    case 'openrouter':
      return testOpenRouter(apiKey);
    case 'ollama':
      return testOllama(baseUrl);
    case 'custom':
      return testCustom(apiKey, baseUrl);
    default:
      return { valid: false, error: `Unknown provider: ${provider}` };
  }
}

/** Anthropic: GET /v1/models — lightweight, no token cost */
async function testAnthropic(apiKey: string): Promise<KeyTestResult> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.ok) return { valid: true };
    if (res.status === 401) return { valid: false, error: 'Invalid API key' };
    if (res.status === 403) return { valid: false, error: 'API key lacks permissions' };

    const body = await res.text().catch(() => '');
    return { valid: false, error: `Anthropic responded ${res.status}: ${body.slice(0, 200)}` };
  } catch (e) {
    return { valid: false, error: `Connection failed: ${(e as Error).message}` };
  }
}

/** OpenAI: GET /v1/models — lightweight, no token cost */
async function testOpenAI(apiKey: string): Promise<KeyTestResult> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.ok) return { valid: true };
    if (res.status === 401) return { valid: false, error: 'Invalid API key' };

    const body = await res.text().catch(() => '');
    return { valid: false, error: `OpenAI responded ${res.status}: ${body.slice(0, 200)}` };
  } catch (e) {
    return { valid: false, error: `Connection failed: ${(e as Error).message}` };
  }
}

/** Google: GET models list — lightweight, no token cost */
async function testGoogle(apiKey: string): Promise<KeyTestResult> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );

    if (res.ok) return { valid: true };
    if (res.status === 400 || res.status === 403)
      return { valid: false, error: 'Invalid API key' };

    const body = await res.text().catch(() => '');
    return { valid: false, error: `Google responded ${res.status}: ${body.slice(0, 200)}` };
  } catch (e) {
    return { valid: false, error: `Connection failed: ${(e as Error).message}` };
  }
}

/** OpenRouter: GET /api/v1/models — lightweight, no token cost */
async function testOpenRouter(apiKey: string): Promise<KeyTestResult> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.ok) return { valid: true };
    if (res.status === 401) return { valid: false, error: 'Invalid API key' };

    const body = await res.text().catch(() => '');
    return { valid: false, error: `OpenRouter responded ${res.status}: ${body.slice(0, 200)}` };
  } catch (e) {
    return { valid: false, error: `Connection failed: ${(e as Error).message}` };
  }
}

/** Ollama: ping the instance (no API key needed) */
async function testOllama(baseUrl?: string | null): Promise<KeyTestResult> {
  const url = (baseUrl ?? 'http://localhost:11434').replace(/\/+$/, '');
  try {
    const res = await fetch(`${url}/api/tags`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return { valid: true };
    return { valid: false, error: `Ollama responded ${res.status}` };
  } catch (e) {
    return { valid: false, error: `Cannot reach Ollama at ${url}: ${(e as Error).message}` };
  }
}

/** Custom: try a GET to baseUrl to check reachability + auth */
async function testCustom(
  apiKey: string,
  baseUrl?: string | null,
): Promise<KeyTestResult> {
  if (!baseUrl) return { valid: false, error: 'Custom provider requires a base URL' };

  const url = baseUrl.replace(/\/+$/, '');
  try {
    // Try /v1/models (OpenAI-compatible convention)
    const res = await fetch(`${url}/v1/models`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return { valid: true };
    if (res.status === 401) return { valid: false, error: 'Invalid API key' };

    // If /v1/models doesn't exist, just check if the base is reachable
    const pingRes = await fetch(url, {
      method: 'HEAD',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (pingRes.ok || pingRes.status === 404) return { valid: true };

    return { valid: false, error: `Server responded ${pingRes.status}` };
  } catch (e) {
    return { valid: false, error: `Cannot reach ${url}: ${(e as Error).message}` };
  }
}
