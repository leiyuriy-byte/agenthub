import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { notificationService } from '../services/notification.service';
import { z } from 'zod';

const _notificationSchemas = {
  list: z.object({
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
    unreadOnly: z.boolean().default(false),
  }),

  idParam: z.object({
    id: z.string().min(1),
  }),
};

export async function notificationRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/notifications - List notifications for current user
   */
  fastify.get(
    '/',
    async (request: FastifyRequest<{
      Querystring: {
        limit?: number;
        offset?: number;
        unreadOnly?: boolean;
      };
    }>, reply: FastifyReply) => {
      const userId = request.userId!;

      try {
        const result = await notificationService.list({
          userId: userId,
          limit: request.query.limit,
          offset: request.query.offset,
          unreadOnly: request.query.unreadOnly,
        });

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch notifications',
        });
      }
    }
  );

  /**
   * GET /api/notifications/unread-count - Get unread notification count
   */
  fastify.get(
    '/unread-count',
    {
      preHandler: [fastify.authenticate, fastify.requireUser],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!;

      try {
        const count = await notificationService.getUnreadCount(userId);

        return reply.send({
          success: true,
          data: { count },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to get unread count',
        });
      }
    }
  );

  /**
   * GET /api/notifications/:id - Get a single notification
   */
  fastify.get(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const userId = request.userId!;
      const { id } = request.params;

      try {
        const notification = await notificationService.findById(id);

        if (!notification) {
          return reply.status(404).send({
            success: false,
            error: 'Notification not found',
          });
        }

        // Check ownership
        if (notification.userId !== userId) {
          return reply.status(403).send({
            success: false,
            error: 'Not authorized',
          });
        }

        return reply.send({
          success: true,
          data: notification,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch notification',
        });
      }
    }
  );

  /**
   * PUT /api/notifications/:id/read - Mark notification as read
   */
  fastify.put(
    '/:id/read',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const userId = request.userId!;
      const { id } = request.params;

      try {
        const notification = await notificationService.markAsRead(id, userId);

        return reply.send({
          success: true,
          data: notification,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(400).send({
          success: false,
          error: error.message || 'Failed to mark notification as read',
        });
      }
    }
  );

  /**
   * PUT /api/notifications/read-all - Mark all notifications as read
   */
  fastify.put(
    '/read-all',
    {
      preHandler: [fastify.authenticate, fastify.requireUser],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!;

      try {
        await notificationService.markAllAsRead(userId);

        return reply.send({
          success: true,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to mark all notifications as read',
        });
      }
    }
  );

  /**
   * DELETE /api/notifications/:id - Delete a notification
   */
  fastify.delete(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const userId = request.userId!;
      const { id } = request.params;

      try {
        await notificationService.delete(id, userId);

        return reply.send({
          success: true,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(400).send({
          success: false,
          error: error.message || 'Failed to delete notification',
        });
      }
    }
  );
}

export default notificationRoutes;
