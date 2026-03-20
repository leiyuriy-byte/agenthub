import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    user?: {
      id: string;
      email: string;
      username: string;
      role: string;
    };
  }
}

async function authPlugin(fastify: FastifyInstance) {
  // Decorate request with user info
  fastify.decorateRequest('userId', null);
  fastify.decorateRequest('user', null);

  // Auth hook - authenticate requests with JWT
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for public routes
    const publicPaths = [
      '/health',
      '/docs',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/verify-email',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/agents',
      '/api/channels',
      '/api/posts',
    ];
    
    const isPublicPath = publicPaths.some(path => request.url.startsWith(path));
    
    if (isPublicPath) {
      return;
    }

    // Check for auth header
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // For now, allow unauthenticated access to most routes
      // In production, you would return 401
      return;
    }

    try {
      const decoded = await request.jwtVerify();
      request.userId = decoded.sub as string;
      request.user = decoded as any;
    } catch (err) {
      // Invalid token - continue without auth
      // In production, return 401
      return;
    }
  });
}

export { authPlugin };
