import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { commentService } from '../services/comment.service';
import { commentSchemas, idParam, paginationSchema } from '@agenthub/validators';
import { authenticate, requireUser } from '../plugins/auth';

export async function commentRoutes(fastify: FastifyInstance) {
  const { validate } = fastify;

  /**
   * GET /comments?postId=xxx - List comments for a post
   */
  fastify.get(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            postId: { type: 'string' },
            limit: { type: 'number', default: 50 },
            offset: { type: 'number', default: 0 },
            sortBy: { type: 'string', enum: ['createdAt', 'likeCount'], default: 'createdAt' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          },
          required: ['postId'],
        },
      },
    },
    async (request: FastifyRequest<{
      Querystring: {
        postId: string;
        limit?: number;
        offset?: number;
        sortBy?: 'createdAt' | 'likeCount';
        sortOrder?: 'asc' | 'desc';
      };
    }>, reply: FastifyReply) => {
      const { postId, limit, offset, sortBy, sortOrder } = request.query;

      try {
        const result = await commentService.list({
          postId,
          limit,
          offset,
          sortBy,
          sortOrder,
        });

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch comments',
        });
      }
    }
  );

  /**
   * GET /comments/:id - Get a single comment
   */
  fastify.get(
    '/:id',
    {
      schema: {
        params: idParam,
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      try {
        const comment = await commentService.findById(id);

        if (!comment) {
          return reply.status(404).send({
            success: false,
            error: 'Comment not found',
          });
        }

        return reply.send({
          success: true,
          data: comment,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch comment',
        });
      }
    }
  );

  /**
   * POST /comments - Create a new comment
   */
  fastify.post(
    '/',
    {
      preHandler: [authenticate, requireUser],
      schema: {
        body: commentSchemas.create,
      },
    },
    async (request: FastifyRequest<{
      Body: {
        postId: string;
        content: string;
        parentId?: string;
      };
    }>, reply: FastifyReply) => {
      const user = request.user;
      const { postId, content, parentId } = request.body;

      try {
        const comment = await commentService.create({
          postId,
          authorId: user!.id,
          content,
          parentId,
        });

        return reply.status(201).send({
          success: true,
          data: comment,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(400).send({
          success: false,
          error: error.message || 'Failed to create comment',
        });
      }
    }
  );

  /**
   * PUT /comments/:id - Update a comment
   */
  fastify.put(
    '/:id',
    {
      preHandler: [authenticate, requireUser],
      schema: {
        params: idParam,
        body: commentSchemas.update,
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: { content: string };
    }>, reply: FastifyReply) => {
      const user = request.user;
      const { id } = request.params;
      const { content } = request.body;

      try {
        const comment = await commentService.update(id, { content }, user!.id);

        return reply.send({
          success: true,
          data: comment,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(400).send({
          success: false,
          error: error.message || 'Failed to update comment',
        });
      }
    }
  );

  /**
   * DELETE /comments/:id - Delete a comment
   */
  fastify.delete(
    '/:id',
    {
      preHandler: [authenticate, requireUser],
      schema: {
        params: idParam,
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string };
    }>, reply: FastifyReply) => {
      const user = request.user;

      try {
        await commentService.delete(request.params.id, user!.id, user!.role);

        return reply.send({
          success: true,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(400).send({
          success: false,
          error: error.message || 'Failed to delete comment',
        });
      }
    }
  );

  /**
   * POST /comments/:id/like - Like a comment
   */
  fastify.post(
    '/:id/like',
    {
      preHandler: [authenticate, requireUser],
      schema: {
        params: idParam,
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;

      try {
        const result = await commentService.like(request.params.id, user!.id);

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to like comment',
        });
      }
    }
  );

  /**
   * POST /comments/:id/accept - Accept a comment as answer (for Q&A)
   */
  fastify.post(
    '/:id/accept',
    {
      preHandler: [authenticate, requireUser],
      schema: {
        params: idParam,
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;

      try {
        const comment = await commentService.accept(request.params.id, user!.id);

        return reply.send({
          success: true,
          data: comment,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(400).send({
          success: false,
          error: error.message || 'Failed to accept comment',
        });
      }
    }
  );
}

export default commentRoutes;
