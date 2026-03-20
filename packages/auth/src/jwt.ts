import type { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export async function registerJwtPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    },
  });

  fastify.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({ message: 'Unauthorized' });
      }
    }
  );
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    jwtVerify(): Promise<JwtPayload>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}
