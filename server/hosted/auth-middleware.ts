import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getDeploymentConfig } from '../config/deployment.js';

type AuthUser = {
  username: string;
  avatarUrl: string;
  token: string;
};

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

async function validateBasicAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Basic ')) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }

  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
  const [user, pass] = decoded.split(':');

  const expectedUser = process.env.INSOMNIAC_AUTH_USER;
  const expectedPass = process.env.INSOMNIAC_AUTH_PASS;

  if (!expectedUser || !expectedPass) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }

  // Use timing-safe comparison to prevent timing attacks.
  // Always run timingSafeEqual even when lengths differ to avoid
  // leaking length information through response timing.
  const userBuf = Buffer.from(user ?? '');
  const expectedUserBuf = Buffer.from(expectedUser);
  const passBuf = Buffer.from(pass ?? '');
  const expectedPassBuf = Buffer.from(expectedPass);

  const userLenMatch = userBuf.length === expectedUserBuf.length;
  const passLenMatch = passBuf.length === expectedPassBuf.length;

  // When lengths differ, compare expected against itself to keep constant time
  const userMatch = timingSafeEqual(
    userLenMatch ? userBuf : expectedUserBuf,
    expectedUserBuf,
  );
  const passMatch = timingSafeEqual(
    passLenMatch ? passBuf : expectedPassBuf,
    expectedPassBuf,
  );

  if (!userLenMatch || !passLenMatch || !userMatch || !passMatch) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }
}

async function validateOAuthToken(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.slice(7);

  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }

  const ghUser = (await response.json()) as {
    login: string;
    avatar_url: string;
  };
  request.authUser = {
    username: ghUser.login,
    avatarUrl: ghUser.avatar_url,
    token,
  };
}

export function registerAuthMiddleware(server: FastifyInstance): void {
  const config = getDeploymentConfig();

  if (config.auth === 'none') return;

  server.addHook('onRequest', async (request, reply) => {
    // Only protect /api/* routes
    if (!request.url.startsWith('/api/')) return;

    // Allow health check without auth
    if (request.url === '/api/health') return;

    // Allow auth routes without auth (login flow)
    if (request.url.startsWith('/api/auth/')) return;

    if (config.auth === 'basic') {
      await validateBasicAuth(request, reply);
    } else if (config.auth === 'oauth') {
      await validateOAuthToken(request, reply);
    }
  });
}
