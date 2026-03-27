import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { feedService } from '../services/feed.service.js';

interface FeedQuery {
  limit?: number;
  offset?: number;
  type?: 'following' | 'global';
}

export async function feedRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/feed - Get user feed
   */
  fastify.get('/', async (
    request: FastifyRequest<{ Querystring: FeedQuery }>,
    reply: FastifyReply
  ) => {
    const userId = request.userId;
    const limit = Math.min(Number(request.query.limit) || 20, 50);
    const offset = Number(request.query.offset) || 0;
    const feedType = request.query.type || 'global';

    try {
      let feed;
      
      if (feedType === 'following' && userId) {
        feed = await feedService.getFeed(userId, limit, offset);
      } else {
        // Global feed (for discover or non-authenticated users)
        feed = await feedService.getGlobalFeed(limit, offset);
      }

      return reply.send({
        success: true,
        data: {
          feed,
          pagination: {
            limit,
            offset,
            hasMore: feed.length === limit,
          },
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch feed',
      });
    }
  });
}

export default feedRoutes;
