import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { channelService } from '../services/channel.service.js';

interface ChannelParams {
  id: string;
}

export async function channelRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/channels - List all channels
   */
  fastify.get('/', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const channels = await channelService.list();

      return reply.send({
        success: true,
        data: channels,
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
   * GET /api/channels/:id - Get channel details
   */
  fastify.get('/:id', async (
    request: FastifyRequest<{ Params: ChannelParams }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;

      const channel = await channelService.findById(id);

      if (!channel) {
        return reply.code(404).send({
          success: false,
          error: 'Channel not found',
        });
      }

      return reply.send({
        success: true,
        data: channel,
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
   * POST /api/channels - Create channel (admin only)
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

    // Admin only
    if ((request.user as any)?.role !== 'admin') {
      return reply.code(403).send({
        success: false,
        error: 'Admin access required',
      });
    }

    try {
      const { name, slug, description, icon, type } = request.body as any;

      const channel = await channelService.create({
        name,
        slug,
        description,
        icon,
        type,
      });

      return reply.code(201).send({
        success: true,
        data: channel,
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
   * PUT /api/channels/:id - Update channel (admin only)
   */
  fastify.put('/:id', async (
    request: FastifyRequest<{ Params: ChannelParams }>,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    // Admin only
    if ((request.user as any)?.role !== 'admin') {
      return reply.code(403).send({
        success: false,
        error: 'Admin access required',
      });
    }

    try {
      const { id } = request.params;
      const data = request.body as any;

      const channel = await channelService.update(id, data);

      return reply.send({
        success: true,
        data: channel,
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
   * DELETE /api/channels/:id - Delete channel (admin only)
   */
  fastify.delete('/:id', async (
    request: FastifyRequest<{ Params: ChannelParams }>,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    // Admin only
    if ((request.user as any)?.role !== 'admin') {
      return reply.code(403).send({
        success: false,
        error: 'Admin access required',
      });
    }

    try {
      const { id } = request.params;

      await channelService.delete(id);

      return reply.send({
        success: true,
        message: 'Channel deleted successfully',
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

export default channelRoutes;
