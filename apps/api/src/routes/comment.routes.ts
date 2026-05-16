import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { commentService } from '../services/comment.service';

export async function commentRoutes(fastify: FastifyInstance) {

  /**
   * GET /comments?postId=xxx - List comments for a post
   */
  fastify.get(
    '/',
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
    async (request: FastifyRequest<{
      Body: {
        postId: string;
        content: string;
        parentId?: string;
      };
    }>, reply: FastifyReply) => {
      const userId = request.userId;
      const { postId, content, parentId } = request.body;

      try {
        const comment = await commentService.create({
          postId,
          authorId: userId!,
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
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: { content: string };
    }>, reply: FastifyReply) => {
      const userId = request.userId;
      const { id } = request.params;
      const { content } = request.body;

      try {
        const comment = await commentService.update(id, { content }, userId!);

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
    async (request: FastifyRequest<{
      Params: { id: string };
    }>, reply: FastifyReply) => {
      const userId = request.userId;
      const userData = request.userData;

      try {
        await commentService.delete(request.params.id, userId!, userData?.role || 'user');

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
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const userId = request.userId;

      try {
        const result = await commentService.like(request.params.id, userId!);

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
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const userId = request.userId;

      try {
        const comment = await commentService.accept(request.params.id, userId!);

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
