import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { db, schema } from '@agenthub/db';
import { agentService } from '../services/agent.service.js';
import { agentSchemas } from '@agenthub/validators';
import { ZodError } from 'zod';
import { isInteger, parseInteger } from '../../utils/validators.js';

// Types for route params
interface AgentParams {
  id: string;
}

interface ListQuery {
  limit?: number;
  offset?: number;
  categoryId?: string;
  status?: string;
  search?: string;
  sortBy?: 'createdAt' | 'viewCount' | 'starCount' | 'avgRating';
  sortOrder?: 'asc' | 'desc';
}

export async function agentRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/agents - List all agents
   */
  fastify.get('/', async (
    request: FastifyRequest<{ Querystring: ListQuery }>,
    reply: FastifyReply
  ) => {
    try {
      const { limit, offset, categoryId, status, search, sortBy, sortOrder } = request.query;

      const result = await agentService.list({
        limit: limit ? parseInteger(limit) : 20,
        offset: offset ? parseInteger(offset) : 0,
        categoryId,
        status: status || 'published',
        search,
        sortBy,
        sortOrder,
      });

      return reply.send({
        success: true,
        data: result,
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
   * GET /api/agents/featured - Get featured agents
   */
  fastify.get('/featured', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const limit = request.query['limit'] ? parseInteger(request.query['limit'] as string) : 10;
      const agents = await agentService.getFeatured(limit);

      return reply.send({
        success: true,
        data: agents,
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
   * GET /api/agents/categories - Get agent categories
   */
  fastify.get('/categories', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const categories = await agentService.getCategories();

      return reply.send({
        success: true,
        data: categories,
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
   * GET /api/agents/:id - Get agent details
   */
  fastify.get('/:id', async (
    request: FastifyRequest<{ Params: AgentParams }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;

      const agent = await agentService.findById(id);

      if (!agent) {
        return reply.code(404).send({
          success: false,
          error: 'Agent not found',
        });
      }

      // Increment view count
      await agentService.incrementViewCount(id);

      // Check if user has favorited
      let isFavorited = false;
      let userRating = null;
      
      if (request.userId) {
        isFavorited = await agentService.isFavorited(id, request.userId);
        userRating = await agentService.getUserRating(id, request.userId);
      }

      return reply.send({
        success: true,
        data: {
          ...agent,
          isFavorited,
          userRating,
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
   * POST /api/agents - Create new agent
   */
  fastify.post('/', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    // Require authentication
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    try {
      const data = agentSchemas.create.parse(request.body);

      const agent = await agentService.create({
        ...data,
        ownerId: request.userId,
      });

      return reply.code(201).send({
        success: true,
        data: agent,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      if (error instanceof Error) {
        return reply.code(400).send({
          success: false,
          error: error.message,
        });
      }

      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * PUT /api/agents/:id - Update agent
   */
  fastify.put('/:id', async (
    request: FastifyRequest<{ Params: AgentParams }>,
    reply: FastifyReply
  ) => {
    // Require authentication
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    try {
      const { id } = request.params;
      const data = agentSchemas.update.parse(request.body);

      const agent = await agentService.update(id, data, request.userId);

      return reply.send({
        success: true,
        data: agent,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      if (error instanceof Error) {
        const statusCode = error.message.includes('not found') ? 404 : 403;
        return reply.code(statusCode).send({
          success: false,
          error: error.message,
        });
      }

      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * DELETE /api/agents/:id - Delete agent
   */
  fastify.delete('/:id', async (
    request: FastifyRequest<{ Params: AgentParams }>,
    reply: FastifyReply
  ) => {
    // Require authentication
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    try {
      const { id } = request.params;

      await agentService.delete(id, request.userId);

      return reply.send({
        success: true,
        message: 'Agent deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        const statusCode = error.message.includes('not found') ? 404 : 403;
        return reply.code(statusCode).send({
          success: false,
          error: error.message,
        });
      }

      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * POST /api/agents/:id/publish - Publish agent
   */
  fastify.post('/:id/publish', async (
    request: FastifyRequest<{ Params: AgentParams }>,
    reply: FastifyReply
  ) => {
    // Require authentication
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    try {
      const { id } = request.params;

      const agent = await agentService.publish(id, request.userId);

      return reply.send({
        success: true,
        data: agent,
      });
    } catch (error) {
      if (error instanceof Error) {
        const statusCode = error.message.includes('not found') ? 404 : 403;
        return reply.code(statusCode).send({
          success: false,
          error: error.message,
        });
      }

      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * POST /api/agents/:id/rate - Rate an agent
   */
  fastify.post('/:id/rate', async (
    request: FastifyRequest<{ Params: AgentParams }>,
    reply: FastifyReply
  ) => {
    // Require authentication
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    try {
      const { id } = request.params;
      const data = agentSchemas.rate.parse(request.body);

      const rating = await agentService.rate(id, {
        ...data,
        userId: request.userId,
      });

      return reply.send({
        success: true,
        data: rating,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * POST /api/agents/:id/favorite - Favorite an agent
   */
  fastify.post('/:id/favorite', async (
    request: FastifyRequest<{ Params: AgentParams }>,
    reply: FastifyReply
  ) => {
    // Require authentication
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    try {
      const { id } = request.params;

      const result = await agentService.favorite(id, request.userId);

      return reply.send({
        success: true,
        data: result,
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
   * DELETE /api/agents/:id/favorite - Unfavorite an agent
   */
  fastify.delete('/:id/favorite', async (
    request: FastifyRequest<{ Params: AgentParams }>,
    reply: FastifyReply
  ) => {
    // Require authentication
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    try {
      const { id } = request.params;

      const result = await agentService.unfavorite(id, request.userId);

      return reply.send({
        success: true,
        data: result,
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
   * GET /api/agents/user/favorites - Get user's favorites
   */
  fastify.get('/user/favorites', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    // Require authentication
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    try {
      const limit = request.query['limit'] ? parseInteger(request.query['limit'] as string) : 20;
      const offset = request.query['offset'] ? parseInteger(request.query['offset'] as string) : 0;

      const agents = await agentService.getUserFavorites(request.userId, limit, offset);

      return reply.send({
        success: true,
        data: agents,
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
   * GET /api/agents/:id/ratings - Get rating statistics and recent ratings
   */
  fastify.get('/:id/ratings', async (
    request: FastifyRequest<{ Params: AgentParams }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const limit = request.query['limit'] ? parseInteger(request.query['limit'] as string) : 10;
      const offset = request.query['offset'] ? parseInteger(request.query['offset'] as string) : 0;

      // Check if agent exists
      const [agent] = await db.select()
        .from(schema.agents)
        .where(eq(schema.agents.id, id))
        .limit(1);

      if (!agent) {
        return reply.code(404).send({
          success: false,
          error: 'Agent not found',
        });
      }

      // Get rating stats and recent ratings in parallel
      const [stats, ratings] = await Promise.all([
        agentService.getRatingStats(id),
        agentService.getRatings(id, limit, offset),
      ]);

      return reply.send({
        success: true,
        data: {
          stats,
          ratings,
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

export default agentRoutes;
