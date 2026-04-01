import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getArticleCategories, createArticleCategory, getArticles, getArticleStats, getArticleById, getArticleBySlug, createArticle, updateArticle, deleteArticle, incrementArticleViewCount, likeArticle, getArticleSeries, getArticleSeriesWithArticles } from '../services/article.service.js';
import { createArticleSchema, updateArticleSchema, createCategorySchema, articleSchemas } from '@agenthub/validators';

interface ArticleParams {
  idOrSlug: string;
  id: string;
}

interface ListQuery {
  categoryId?: string;
  status?: string;
  authorId?: string;
  featured?: string;
  limit?: string;
  offset?: string;
  orderBy?: string;
}

export async function articleRoutes(fastify: FastifyInstance) {
  // Get all categories
  fastify.get('/categories', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const categories = await getArticleCategories();
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
        
        const data = articleSchemas.createCategory.parse(request.body);
        const category = await createArticleCategory(data);
        return reply.status(201).send(category);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to create category' });
      }
    }
  );

  // Get all articles
  fastify.get(
    '/',
    async (
      request: FastifyRequest<{ Querystring: ListQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const { categoryId, status, authorId, featured, limit, offset, orderBy } = request.query;
        
        const articles = await getArticles({
          categoryId,
          status: status || 'published',
          authorId,
          featured: featured === 'true',
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
          orderBy: orderBy as 'createdAt' | 'publishedAt' | 'viewCount' | 'likeCount' | undefined,
        });
        
        return reply.send(articles);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch articles' });
      }
    }
  );

  // Get article stats
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await getArticleStats();
      return reply.send(stats);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch stats' });
    }
  });

  // Get single article by ID or slug
  fastify.get(
    '/:idOrSlug',
    async (
      request: FastifyRequest<{ Params: ArticleParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { idOrSlug } = request.params;
        
        // Try to get by ID first, then by slug
        let article = await getArticleById(idOrSlug);
        if (!article) {
          article = await getArticleBySlug(idOrSlug);
        }
        
        if (!article) {
          return reply.status(404).send({ error: 'Article not found' });
        }
        
        // Increment view count
        await incrementArticleViewCount(article.id);
        
        return reply.send(article);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch article' });
      }
    }
  );

  // Create article (authenticated)
  fastify.post(
    '/',
    async (
      request: FastifyRequest<{ Body: typeof createArticleSchema }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = request.userId;
        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }
        
        const data = articleSchemas.create.parse(request.body);
        
        const article = await createArticle({
          ...data,
          authorId: userId,
        });
        
        return reply.status(201).send(article);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to create article' });
      }
    }
  );

  // Update article
  fastify.put(
    '/:id',
    async (
      request: FastifyRequest<{ Params: ArticleParams; Body: typeof updateArticleSchema }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = request.userId;
        const userData = request.userData;
        
        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }
        
        const { id } = request.params;
        const data = articleSchemas.update.parse(request.body);
        
        // Check ownership or admin
        const article = await getArticleById(id);
        if (!article) {
          return reply.status(404).send({ error: 'Article not found' });
        }
        
        if (article.authorId !== userId && userData?.role !== 'admin') {
          return reply.status(403).send({ error: 'Not authorized' });
        }
        
        await updateArticle(id, data);
        
        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to update article' });
      }
    }
  );

  // Delete article
  fastify.delete(
    '/:id',
    async (
      request: FastifyRequest<{ Params: ArticleParams }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = request.userId;
        const userData = request.userData;
        
        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }
        
        const { id } = request.params;
        
        // Check ownership or admin
        const article = await getArticleById(id);
        if (!article) {
          return reply.status(404).send({ error: 'Article not found' });
        }
        
        if (article.authorId !== userId && userData?.role !== 'admin') {
          return reply.status(403).send({ error: 'Not authorized' });
        }
        
        await deleteArticle(id);
        
        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to delete article' });
      }
    }
  );

  // Like article
  fastify.post(
    '/:id/like',
    async (
      request: FastifyRequest<{ Params: ArticleParams }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = request.userId;
        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }
        
        await likeArticle(request.params.id);
        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to like article' });
      }
    }
  );

  // Get series
  fastify.get('/series', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { authorId } = request.query as { authorId?: string };
      const series = await getArticleSeries(authorId);
      return reply.send(series);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch series' });
    }
  });

  // Get series with articles
  fastify.get(
    '/series/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const series = await getArticleSeriesWithArticles(request.params.id);
        if (!series) {
          return reply.status(404).send({ error: 'Series not found' });
        }
        return reply.send(series);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch series' });
      }
    }
  );
}