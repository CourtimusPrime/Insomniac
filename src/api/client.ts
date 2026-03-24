function getApiBase(): string {
  if (import.meta.env.VITE_API_BASE_URL)
    return import.meta.env.VITE_API_BASE_URL;
  // In Tauri, window.location.origin is "tauri://localhost" — not usable for HTTP
  if (window.location.protocol === 'tauri:') return 'http://localhost:4321';
  return window.location.origin;
}

const API_BASE = getApiBase();

/** Build an absolute HTTP URL for the given API path. */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/** Build the WebSocket URL for the backend `/ws` endpoint. */
export function wsUrl(path = '/ws'): string {
  const protocol = API_BASE.startsWith('https') ? 'wss' : 'ws';
  const host = API_BASE.replace(/^https?:\/\//, '');
  return `${protocol}://${host}${path}`;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, controller.signal])
    : controller.signal;

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      ...init,
      signal,
    });

    if (!res.ok) {
      throw new Error(`API ${res.status}: ${res.statusText}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}
