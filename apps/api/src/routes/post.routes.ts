import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { postService } from '../services/post.service.js';
import { postSchemas } from '@agenthub/validators';
import { ZodError } from 'zod';
import { parseInteger } from '../utils/validators.js';

interface PostParams {
  id: string;
}

interface ListQuery {
  limit?: number;
  offset?: number;
  channelId?: string;
  authorId?: string;
  search?: string;
  sortBy?: 'createdAt' | 'likeCount' | 'viewCount' | 'commentCount';
  sortOrder?: 'asc' | 'desc';
  type?: 'normal' | 'question' | 'poll' | 'share';
}

export async function postRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/posts - List posts
   */
  fastify.get('/', async (
    request: FastifyRequest<{ Querystring: ListQuery }>,
    reply: FastifyReply
  ) => {
    try {
      const { limit, offset, channelId, authorId, search, sortBy, sortOrder, type } = request.query;

      const result = await postService.list({
        limit: limit ? parseInteger(limit) : 20,
        offset: offset ? parseInteger(offset) : 0,
        channelId,
        authorId,
        search,
        sortBy,
        sortOrder,
        type,
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
   * GET /api/posts/recent - Get recent posts
   */
  fastify.get('/recent', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const query = request.query as { limit?: string } || {};
      const limit = query.limit ? parseInteger(query.limit) : 10;
      const posts = await postService.getRecent(limit);

      return reply.send({
        success: true,
        data: posts,
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
   * GET /api/posts/:id - Get post details
   */
  fastify.get('/:id', async (
    request: FastifyRequest<{ Params: PostParams }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;

      const post = await postService.findById(id);

      if (!post) {
        return reply.code(404).send({
          success: false,
          error: 'Post not found',
        });
      }

      // Increment view count
      await postService.incrementViewCount(id);

      // Check user's vote and favorite status
      let userVote = 0;
      let isFavorited = false;

      if (request.userId) {
        userVote = await postService.getUserVote(id, request.userId);
        isFavorited = await postService.isFavorited(id, request.userId);
      }

      return reply.send({
        success: true,
        data: {
          ...post,
          userVote,
          isFavorited,
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
   * GET /api/posts/:id/similar - Get similar posts
   */
  fastify.get('/:id/similar', async (
    request: FastifyRequest<{ Params: PostParams; Querystring: { limit?: number } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const limit = request.query.limit ? parseInteger(request.query.limit) : 5;

      const posts = await postService.getSimilar(id, limit);

      return reply.send({
        success: true,
        data: posts,
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
   * POST /api/posts - Create new post
   */
  fastify.post('/', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    try {
      const data = postSchemas.create.parse(request.body);

      const post = await postService.create({
        ...data,
        authorId: request.userId,
      });

      return reply.code(201).send({
        success: true,
        data: post,
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
   * PUT /api/posts/:id - Update post
   */
  fastify.put('/:id', async (
    request: FastifyRequest<{ Params: PostParams }>,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    try {
      const { id } = request.params;
      const data = postSchemas.update.parse(request.body);

      const post = await postService.update(id, data, request.userId);

      return reply.send({
        success: true,
        data: post,
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
   * DELETE /api/posts/:id - Delete post
   */
  fastify.delete('/:id', async (
    request: FastifyRequest<{ Params: PostParams }>,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    try {
      const { id } = request.params;

      await postService.delete(id, request.userId);

      return reply.send({
        success: true,
        message: 'Post deleted successfully',
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
   * POST /api/posts/:id/like - Like a post
   */
  fastify.post('/:id/like', async (
    request: FastifyRequest<{ Params: PostParams }>,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    try {
      const { id } = request.params;

      const result = await postService.like(id, request.userId);

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
   * POST /api/posts/:id/dislike - Dislike a post
   */
  fastify.post('/:id/dislike', async (
    request: FastifyRequest<{ Params: PostParams }>,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    try {
      const { id } = request.params;

      const result = await postService.dislike(id, request.userId);

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
   * POST /api/posts/:id/favorite - Favorite a post
   */
  fastify.post('/:id/favorite', async (
    request: FastifyRequest<{ Params: PostParams }>,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    try {
      const { id } = request.params;

      const result = await postService.favorite(id, request.userId);

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
   * DELETE /api/posts/:id/favorite - Unfavorite a post
   */
  fastify.delete('/:id/favorite', async (
    request: FastifyRequest<{ Params: PostParams }>,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    try {
      const { id } = request.params;

      const result = await postService.unfavorite(id, request.userId);

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
   * GET /api/posts/user/favorites - Get user's favorite posts
   */
  fastify.get('/user/favorites', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    try {
      const query = request.query as { limit?: string; offset?: string } || {};
      const limit = query.limit ? parseInteger(query.limit) : 20;
      const offset = query.offset ? parseInteger(query.offset) : 0;

      const posts = await postService.getUserFavorites(request.userId, limit, offset);

      return reply.send({
        success: true,
        data: posts,
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

export default postRoutes;
