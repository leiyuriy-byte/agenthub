import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireUser: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    userId?: string;
    userData?: {
      id: string;
      email: string;
      username: string;
      role: string;
    };
  }
}

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('userId', null);

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    // Auth handled by onRequest hook - this is a no-op guard
  });
  fastify.decorate('requireUser', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.userId) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
  fastify.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.userId) {
      reply.code(401).send({ success: false, error: 'Not authenticated' });
      return;
    }
    const user = (request as any).user;
    if (user?.role !== 'admin' && user?.role !== 'moderator') {
      reply.code(403).send({ success: false, error: 'Admin access required' });
    }
  });

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const publicPaths = [
      '/health', '/docs',
      '/api/auth/login', '/api/auth/register', '/api/auth/verify-email',
      '/api/auth/forgot-password', '/api/auth/reset-password',
      '/api/agents', '/api/channels', '/api/posts',
    ];

    if (publicPaths.some(p => request.url.startsWith(p))) return;

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return;

    try {
      const decoded = await request.jwtVerify<{ sub: string; email: string; username: string; role: string }>();
      request.userId = decoded.sub;
      request.userData = {
        id: decoded.sub,
        email: decoded.email,
        username: decoded.username,
        role: decoded.role,
      };
    } catch (err) {
      return;
    }
  });
}

export default fp(authPlugin, { name: 'auth' });
