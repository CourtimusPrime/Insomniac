import { detectDeploymentMode } from '../config/deployment.js';

const DEV_ORIGINS = [
  'http://localhost:1420',
  'http://localhost:4321',
  'http://localhost:5173',
];

export function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  const mode = detectDeploymentMode();
  if (mode === 'local') {
    origins.push(...DEV_ORIGINS);
  }

  const baseUrl = process.env.INSOMNIAC_BASE_URL;
  if (baseUrl) {
    // Strip trailing slash for consistent comparison
    const normalized = baseUrl.replace(/\/+$/, '');
    if (!origins.includes(normalized)) {
      origins.push(normalized);
    }
  }

  return origins;
}
