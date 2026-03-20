import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { search, quickSearch } from '../services/search.service.js';
import { z } from 'zod';

const SearchSchema = z.object({
  q: z.string().min(2).max(200),
  type: z.enum(['agents', 'posts', 'users', 'all']).optional().default('all'),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

const QuickSearchSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(10).optional().default(5),
});

interface SearchQuery {
  q: string;
  type?: 'agents' | 'posts' | 'users' | 'all';
  limit?: number;
  offset?: number;
}

interface QuickSearchQuery {
  q: string;
  limit?: number;
}

export async function searchRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/search
   * Unified search across agents, posts, and users
   */
  fastify.get<{ Querystring: SearchQuery }>(
    '/',
    {
      preHandler: [],
    },
    async (request: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) => {
      try {
        const parsed = SearchSchema.safeParse(request.query);
        
        if (!parsed.success) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid query parameters',
            details: parsed.error.errors,
          });
        }

        const { q, type, limit, offset } = parsed.data;

        const results = await search({
          query: q,
          type,
          limit,
          offset,
        });

        return reply.send({
          success: true,
          data: results,
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Search failed',
        });
      }
    }
  );

  /**
   * GET /api/search/quick
   * Quick search for autocomplete/typeahead
   */
  fastify.get<{ Querystring: QuickSearchQuery }>(
    '/quick',
    {
      preHandler: [],
    },
    async (request: FastifyRequest<{ Querystring: QuickSearchQuery }>, reply: FastifyReply) => {
      try {
        const parsed = QuickSearchSchema.safeParse(request.query);
        
        if (!parsed.success) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid query parameters',
          });
        }

        const { q, limit } = parsed.data;
        const results = await quickSearch(q, limit);

        return reply.send({
          success: true,
          data: results,
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Quick search failed',
        });
      }
    }
  );
}
