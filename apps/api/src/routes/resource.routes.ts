import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getResourceCategories, createResourceCategory, getResources, getResourceStats, getResourceById, getResourceBySlug, createResource, updateResource, deleteResource, incrementResourceViewCount, likeResource } from '../services/resource.service.js';
import { createResourceSchema, updateResourceSchema, createCategorySchema, resourceSchemas } from '@agenthub/validators';

interface ResourceParams {
  idOrSlug: string;
  id: string;
}

interface ListQuery {
  categoryId?: string;
  type?: string;
  status?: string;
  featured?: string;
  limit?: string;
  offset?: string;
  orderBy?: string;
}

export async function resourceRoutes(fastify: FastifyInstance) {
  // Get all categories
  fastify.get('/categories', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const categories = await getResourceCategories();
      return reply.send(categories);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch categories' });
    }
  });

  // Create category (admin only)
  fastify.post(
    '/categories',
    async (request: FastifyRequest<{ Body: typeof createCategorySchema }>, reply: FastifyReply) => {
      try {
        const userId = request.userId;
        const userData = request.userData;
        
        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }
        
        if (userData?.role !== 'admin') {
          return reply.status(403).send({ error: 'Admin access required' });
        }
        
        const data = resourceSchemas.createCategory.parse(request.body);
        const category = await createResourceCategory(data);
        return reply.status(201).send(category);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to create category' });
      }
    }
  );

  // Get all resources
  fastify.get(
    '/',
    async (
      request: FastifyRequest<{ Querystring: ListQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const { categoryId, type, status, featured, limit, offset, orderBy } = request.query;
        
        const resources = await getResources({
          categoryId,
          type,
          status: status || 'approved',
          featured: featured === 'true',
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
          orderBy: orderBy as 'createdAt' | 'viewCount' | 'likeCount' | undefined,
        });
        
        return reply.send(resources);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch resources' });
      }
    }
  );

  // Get resource stats
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await getResourceStats();
      return reply.send(stats);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch stats' });
    }
  });

  // Get single resource by ID or slug
  fastify.get(
    '/:idOrSlug',
    async (
      request: FastifyRequest<{ Params: ResourceParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { idOrSlug } = request.params;
        
        // Try to get by ID first, then by slug
        let resource = await getResourceById(idOrSlug);
        if (!resource) {
          resource = await getResourceBySlug(idOrSlug);
        }
        
        if (!resource) {
          return reply.status(404).send({ error: 'Resource not found' });
        }
        
        // Increment view count
        await incrementResourceViewCount(resource.id);
        
        return reply.send(resource);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch resource' });
      }
    }
  );

  // Submit resource (authenticated)
  fastify.post(
    '/',
    async (
      request: FastifyRequest<{ Body: typeof createResourceSchema }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = request.userId;
        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }
        
        const data = resourceSchemas.create.parse(request.body);
        
        const resource = await createResource({
          ...data,
          submitterId: userId,
        });
        
        return reply.status(201).send(resource);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to create resource' });
      }
    }
  );

  // Update resource
  fastify.put(
    '/:id',
    async (
      request: FastifyRequest<{ Params: ResourceParams; Body: typeof updateResourceSchema }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = request.userId;
        const userData = request.userData;
        
        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }
        
        const { id } = request.params;
        const data = resourceSchemas.update.parse(request.body);
        
        // Check ownership or admin
        const resource = await getResourceById(id);
        if (!resource) {
          return reply.status(404).send({ error: 'Resource not found' });
        }
        
        // Any authenticated user can update resources, but admins can change status
        if (userData?.role !== 'admin' && resource.submitterId !== userId) {
          return reply.status(403).send({ error: 'Not authorized' });
        }
        
        await updateResource(id, data);
        
        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to update resource' });
      }
    }
  );

  // Delete resource
  fastify.delete(
    '/:id',
    async (
      request: FastifyRequest<{ Params: ResourceParams }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = request.userId;
        const userData = request.userData;
        
        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }
        
        const { id } = request.params;
        
        const resource = await getResourceById(id);
        if (!resource) {
          return reply.status(404).send({ error: 'Resource not found' });
        }
        
        if (resource.submitterId !== userId && userData?.role !== 'admin') {
          return reply.status(403).send({ error: 'Not authorized' });
        }
        
        await deleteResource(id);
        
        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to delete resource' });
      }
    }
  );

  // Like resource
  fastify.post(
    '/:id/like',
    async (
      request: FastifyRequest<{ Params: ResourceParams }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = request.userId;
        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }
        
        await likeResource(request.params.id);
        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to like resource' });
      }
    }
  );
}