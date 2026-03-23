import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { getDeploymentConfig } from '../config/deployment.js';

type SessionData = {
  accessToken: string;
  username: string;
  avatarUrl: string;
  createdAt: number;
};

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const STATE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// In-memory session store (prototype only — not for production)
const sessions = new Map<string, SessionData>();

// OAuth CSRF state tokens: state -> expiry timestamp
const oauthStates = new Map<string, number>();

function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
  for (const [state, expiry] of oauthStates) {
    if (now > expiry) {
      oauthStates.delete(state);
    }
  }
}

// Periodic cleanup of expired sessions and OAuth states
setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL_MS).unref();

function getSessionId(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/(?:^|;\s*)insomniac_session=([^;]+)/);
  return match?.[1];
}

export async function authRoutes(server: FastifyInstance): Promise<void> {
  const config = getDeploymentConfig();

  // Only register auth routes in hosted or remote mode
  if (config.mode !== 'hosted' && config.mode !== 'remote') return;

  const clientId = process.env.GITHUB_CLIENT_ID ?? '';
  const clientSecret = process.env.GITHUB_CLIENT_SECRET ?? '';

  // GET /api/auth/github — redirect to GitHub OAuth authorize URL
  server.get('/api/auth/github', async (_request, reply) => {
    const state = randomUUID();
    oauthStates.set(state, Date.now() + STATE_TTL_MS);

    const redirectUri = `${process.env.INSOMNIAC_BASE_URL ?? 'http://localhost:4321'}/api/auth/github/callback`;
    const url = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,read:user&state=${encodeURIComponent(state)}`;
    reply.redirect(url);
  });

  // GET /api/auth/github/callback — exchange code for access token
  server.get<{ Querystring: { code?: string; state?: string } }>(
    '/api/auth/github/callback',
    async (request, reply) => {
      const { code, state } = request.query;
      if (!code) {
        reply.code(400).send({ error: 'Missing code parameter' });
        return;
      }

      // Validate OAuth CSRF state parameter
      if (!state) {
        reply.code(400).send({ error: 'Missing state parameter' });
        return;
      }

      const stateExpiry = oauthStates.get(state);
      oauthStates.delete(state);

      if (stateExpiry === undefined || Date.now() > stateExpiry) {
        reply.code(403).send({ error: 'Invalid or expired OAuth state' });
        return;
      }

      // Exchange code for access token
      const tokenResponse = await fetch(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
          }),
        },
      );

      const tokenData = (await tokenResponse.json()) as {
        access_token?: string;
        error?: string;
      };

      if (!tokenData.access_token) {
        reply.code(401).send({ error: 'Failed to obtain access token' });
        return;
      }

      // Fetch user info from GitHub
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github+json',
        },
      });

      if (!userResponse.ok) {
        reply.code(401).send({ error: 'Failed to fetch user info' });
        return;
      }

      const ghUser = (await userResponse.json()) as {
        login: string;
        avatar_url: string;
      };

      // Create session
      const sessionId = randomUUID();
      sessions.set(sessionId, {
        accessToken: tokenData.access_token,
        username: ghUser.login,
        avatarUrl: ghUser.avatar_url,
        createdAt: Date.now(),
      });

      const secureSuffix = config.mode !== 'local' ? '; Secure' : '';
      reply
        .header(
          'Set-Cookie',
          `insomniac_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax${secureSuffix}`,
        )
        .redirect('/');
    },
  );

  // GET /api/auth/me — return current user info
  server.get('/api/auth/me', async (request, reply) => {
    const sessionId = getSessionId(request.headers.cookie);
    const session = sessionId ? sessions.get(sessionId) : undefined;

    if (!session) {
      reply.code(401).send({ error: 'Not authenticated' });
      return;
    }

    // Check session expiry
    if (Date.now() - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(sessionId as string);
      reply.code(401).send({ error: 'Session expired' });
      return;
    }

    return { username: session.username, avatarUrl: session.avatarUrl };
  });

  // POST /api/auth/logout — clear session
  server.post('/api/auth/logout', async (request, reply) => {
    const sessionId = getSessionId(request.headers.cookie);
    if (sessionId) {
      sessions.delete(sessionId);
    }

    reply
      .header(
        'Set-Cookie',
        'insomniac_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      )
      .send({ ok: true });
  });
}
