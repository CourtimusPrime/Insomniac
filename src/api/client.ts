const API_BASE = import.meta.env.VITE_API_BASE_URL || window.location.origin;

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
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
