import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { db, schema } from '@agenthub/db';

// Types
interface RegisterBody {
  name: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  ownerId?: string;
}

interface LoginBody {
  name: string;
  apiKey: string;
}

// Helper: hash API key with SHA-256
function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// Helper: generate a raw API key (64 hex chars)
function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Helper: sign Agent JWT
function signAgentToken(fastify: FastifyInstance, agentId: string, name: string): string {
  const secret = process.env.JWT_SECRET || 'agenthub-secret-2026';
  return fastify.jwt.sign(
    { agentId, name, type: 'agent' },
    { secret }
  );
}

export async function agentAuthRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/agents/auth/register
   * Register a new Agent with name + API key.
   * Returns the raw API key (only time it's shown).
   */
  fastify.post<{ Body: RegisterBody }>('/register', async (
    request: FastifyRequest<{ Body: RegisterBody }>,
    reply: FastifyReply
  ) => {
    try {
      const { name, displayName, description, avatar, ownerId } = request.body || {};

      // Validate name
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return reply.code(400).send({
          success: false,
          error: 'Agent name must be at least 2 characters',
        });
      }

      if (name.trim().length > 64) {
        return reply.code(400).send({
          success: false,
          error: 'Agent name must be at most 64 characters',
        });
      }

      // Check if name already taken
      const [existing] = await db.select()
        .from(schema.agentApiKeys)
        .where(eq(schema.agentApiKeys.name, name.trim()))
        .limit(1);

      if (existing) {
        return reply.code(409).send({
          success: false,
          error: 'Agent name already registered',
        });
      }

      // Generate API key and its hash
      const rawApiKey = generateApiKey();
      const apiKeyHash = hashApiKey(rawApiKey);
      const agentId = nanoid();

      // Insert into DB
      const [agent] = await db.insert(schema.agentApiKeys).values({
        id: agentId,
        name: name.trim(),
        displayName: displayName?.trim() || null,
        description: description?.trim() || null,
        avatar: avatar?.trim() || null,
        ownerId: ownerId?.trim() || null,
        apiKeyHash,
        isActive: true,
      }).returning();

      if (!agent) {
        return reply.code(500).send({
          success: false,
          error: 'Failed to create agent',
        });
      }

      // Sign JWT
      const token = signAgentToken(fastify, agent.id, agent.name);

      return reply.code(201).send({
        success: true,
        data: {
          id: agent.id,
          name: agent.name,
          displayName: agent.displayName,
          avatar: agent.avatar,
          description: agent.description,
          ownerId: agent.ownerId,
          createdAt: agent.createdAt,
          // Return raw API key ONLY here
          apiKey: rawApiKey,
          token,
        },
        message: 'Store the API key securely — it will not be shown again.',
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * POST /api/agents/auth/login
   * Login with Agent name + raw API key.
   * Returns JWT token.
   */
  fastify.post<{ Body: LoginBody }>('/login', async (
    request: FastifyRequest<{ Body: LoginBody }>,
    reply: FastifyReply
  ) => {
    try {
      const { name, apiKey } = request.body || {};

      if (!name || !apiKey) {
        return reply.code(400).send({
          success: false,
          error: 'Agent name and API key are required',
        });
      }

      // Find agent by name
      const [agent] = await db.select()
        .from(schema.agentApiKeys)
        .where(eq(schema.agentApiKeys.name, name.trim()))
        .limit(1);

      if (!agent) {
        return reply.code(401).send({
          success: false,
          error: 'Invalid credentials',
        });
      }

      if (!agent.isActive) {
        return reply.code(403).send({
          success: false,
          error: 'Agent account is deactivated',
        });
      }

      // Verify API key hash
      const inputHash = hashApiKey(apiKey);
      if (inputHash !== agent.apiKeyHash) {
        return reply.code(401).send({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Sign JWT
      const token = signAgentToken(fastify, agent.id, agent.name);

      return reply.send({
        success: true,
        data: {
          id: agent.id,
          name: agent.name,
          displayName: agent.displayName,
          avatar: agent.avatar,
          description: agent.description,
          ownerId: agent.ownerId,
          createdAt: agent.createdAt,
          token,
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * GET /api/agents/auth/me
   * Get current agent info (requires Agent JWT).
   */
  fastify.get('/', {
    onRequest: [async (request: FastifyRequest, reply: FastifyReply) => {
      // Agent JWT verification
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }
      try {
        const decoded = await request.jwtVerify<{ agentId: string; name: string; type: string }>();
        if (decoded.type !== 'agent') {
          return reply.code(403).send({ success: false, error: 'Agent access required' });
        }
        (request as any).agentId = decoded.agentId;
        (request as any).agentName = decoded.name;
      } catch {
        return reply.code(401).send({ success: false, error: 'Invalid or expired token' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const agentId = (request as any).agentId;

      const [agent] = await db.select()
        .from(schema.agentApiKeys)
        .where(eq(schema.agentApiKeys.id, agentId))
        .limit(1);

      if (!agent) {
        return reply.code(404).send({
          success: false,
          error: 'Agent not found',
        });
      }

      return reply.send({
        success: true,
        data: {
          id: agent.id,
          name: agent.name,
          displayName: agent.displayName,
          avatar: agent.avatar,
          description: agent.description,
          ownerId: agent.ownerId,
          isActive: agent.isActive,
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt,
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });
}

export default agentAuthRoutes;
