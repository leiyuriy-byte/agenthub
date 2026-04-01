import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getActivities, getActivityById, getActivityBySlug, createActivity, updateActivity, deleteActivity, incrementActivityViewCount, registerForActivity, cancelRegistration, getUserRegistrations, getActivityStats } from '../services/activity.service.js';
import { createActivitySchema, updateActivitySchema, activitySchemas } from '@agenthub/validators';

interface ActivityParams {
  idOrSlug: string;
  id: string;
}

interface ListQuery {
  type?: string;
  status?: string;
  featured?: string;
  upcoming?: string;
  limit?: string;
  offset?: string;
  orderBy?: string;
}

export async function activityRoutes(fastify: FastifyInstance) {
  // Get all activities
  fastify.get(
    '/',
    async (
      request: FastifyRequest<{ Querystring: ListQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const { type, status, featured, upcoming, limit, offset, orderBy } = request.query;
        
        const activities = await getActivities({
          type,
          status,
          featured: featured === 'true',
          upcoming: upcoming === 'true',
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
          orderBy: orderBy as 'startTime' | 'createdAt' | 'viewCount' | undefined,
        });
        
        return reply.send(activities);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch activities' });
      }
    }
  );

  // Get activity stats
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await getActivityStats();
      return reply.send(stats);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch stats' });
    }
  });

  // Get single activity by ID or slug
  fastify.get(
    '/:idOrSlug',
    async (
      request: FastifyRequest<{ Params: ActivityParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { idOrSlug } = request.params;
        const userId = request.userId;
        
        // Try to get by ID first, then by slug
        let activity = await getActivityById(idOrSlug, userId);
        if (!activity) {
          activity = await getActivityBySlug(idOrSlug, userId);
        }
        
        if (!activity) {
          return reply.status(404).send({ error: 'Activity not found' });
        }
        
        // Increment view count
        await incrementActivityViewCount(activity.id);
        
        return reply.send(activity);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch activity' });
      }
    }
  );

  // Create activity (authenticated)
  fastify.post(
    '/',
    async (
      request: FastifyRequest<{ Body: typeof createActivitySchema }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = request.userId;
        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }
        
        const data = activitySchemas.create.parse(request.body);
        
        const activity = await createActivity({
          ...data,
          organizerId: userId,
        });
        
        return reply.status(201).send(activity);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to create activity' });
      }
    }
  );

  // Update activity
  fastify.put(
    '/:id',
    async (
      request: FastifyRequest<{ Params: ActivityParams; Body: typeof updateActivitySchema }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = request.userId;
        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }
        
        const userData = request.userData;
        const { id } = request.params;
        const data = activitySchemas.update.parse(request.body);
        
        const activity = await getActivityById(id);
        if (!activity) {
          return reply.status(404).send({ error: 'Activity not found' });
        }
        
        // Only organizer or admin can update
        if (activity.organizerId !== userId && userData?.role !== 'admin') {
          return reply.status(403).send({ error: 'Not authorized' });
        }
        
        await updateActivity(id, data);
        
        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to update activity' });
      }
    }
  );

  // Delete activity
  fastify.delete(
    '/:id',
    async (
      request: FastifyRequest<{ Params: ActivityParams }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = request.userId;
        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }
        
        const userData = request.userData;
        const { id } = request.params;
        
        const activity = await getActivityById(id);
        if (!activity) {
          return reply.status(404).send({ error: 'Activity not found' });
        }
        
        if (activity.organizerId !== userId && userData?.role !== 'admin') {
          return reply.status(403).send({ error: 'Not authorized' });
        }
        
        await deleteActivity(id);
        
        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to delete activity' });
      }
    }
  );

  // Register for activity
  fastify.post(
    '/:id/register',
    async (
      request: FastifyRequest<{ Params: ActivityParams }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = request.userId;
        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }
        
        const { id } = request.params;
        
        const result = await registerForActivity(id, userId);
        
        if (!result.success) {
          return reply.status(400).send({ error: result.error });
        }
        
        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to register' });
      }
    }
  );

  // Cancel registration
  fastify.delete(
    '/:id/register',
    async (
      request: FastifyRequest<{ Params: ActivityParams }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = request.userId;
        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }
        
        const { id } = request.params;
        
        await cancelRegistration(id, userId);
        
        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to cancel registration' });
      }
    }
  );

  // Get user's registrations
  fastify.get(
    '/my-registrations',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.userId;
        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }
        
        const registrations = await getUserRegistrations(userId);
        return reply.send(registrations);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch registrations' });
      }
    }
  );
}