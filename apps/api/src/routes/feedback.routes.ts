import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { agentCommentService, feedbackService } from '../services/feedback.service.js';

// Validation schemas
const createCommentSchema = {
  agentId: { type: 'string' },
  parentId: { type: 'string', optional: true },
  content: { type: 'string', minLength: 1, maxLength: 5000 },
  screenshotUrl: { type: 'string', optional: true },
};

const updateCommentSchema = {
  content: { type: 'string', minLength: 1, maxLength: 5000 },
};

const createFeedbackSchema = {
  type: { type: 'string', enum: ['bug_report', 'feature_suggestion'] },
  title: { type: 'string', minLength: 1, maxLength: 200 },
  description: { type: 'string', minLength: 1, maxLength: 5000 },
  screenshots: { type: 'array', items: { type: 'string' }, optional: true },
};

const updateFeedbackStatusSchema = {
  status: { type: 'string', enum: ['pending', 'in_progress', 'resolved', 'rejected'] },
  adminResponse: { type: 'string', optional: true },
  resolution: { type: 'string', optional: true },
};

// Body types
interface CreateCommentBody {
  parentId?: string;
  content: string;
  screenshotUrl?: string;
}

interface UpdateCommentBody {
  content: string;
}

interface CreateFeedbackBody {
  type: 'bug_report' | 'feature_suggestion';
  title: string;
  description: string;
  screenshots?: string[];
}

interface UpdateFeedbackStatusBody {
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  adminResponse?: string;
  resolution?: string;
}

// Query params types
interface PaginationParams {
  limit?: number;
  offset?: number;
  sortBy?: 'newest' | 'popular';
}

interface FeedbackListParams {
  limit?: number;
  offset?: number;
  status?: string;
  type?: string;
  search?: string;
}

// ID params
interface IdParams {
  id: string;
}

// Agent ID params
interface AgentIdParams {
  agentId: string;
}

// ============ Comment Routes ============

export async function agentCommentRoutes(fastify: FastifyInstance) {
  // Get comments for an agent
  fastify.get<{ Params: AgentIdParams; Querystring: PaginationParams }>(
    '/agents/:agentId/comments',
    async (request: FastifyRequest<{ Params: AgentIdParams; Querystring: PaginationParams }>, reply: FastifyReply) => {
      const { agentId } = request.params;
      const { limit, offset, sortBy } = request.query;

      const result = await agentCommentService.getByAgent(agentId, { limit, offset, sortBy });

      // Check if user has liked each comment
      const userId = request.userId;
      if (userId) {
        const likedComments = await agentCommentService.getUserLikedComments(agentId, userId);
        const commentsWithLiked = result.comments.map((c: any) => ({
          ...c,
          isLiked: likedComments.includes(c.id),
        }));
        return { ...result, comments: commentsWithLiked };
      }

      return result;
    }
  );

  // Create a comment
  fastify.post<{ Params: AgentIdParams; Body: typeof createCommentSchema }>(
    '/agents/:agentId/comments',
    {
      preHandler: [fastify.authenticate],
      schema: { body: createCommentSchema },
    },
    async (request: FastifyRequest<{ Params: AgentIdParams; Body: any }>, reply: FastifyReply) => {
      const { agentId } = request.params;
      const { parentId, content, screenshotUrl } = request.body as CreateCommentBody;

      const comment = await agentCommentService.create({
        agentId,
        authorId: request.userId!,
        parentId,
        content,
        screenshotUrl,
      });

      return reply.code(201).send(comment);
    }
  );

  // Update a comment
  fastify.put<{ Params: IdParams; Body: typeof updateCommentSchema }>(
    '/comments/:id',
    {
      preHandler: [fastify.authenticate],
      schema: { body: updateCommentSchema },
    },
    async (request: FastifyRequest<{ Params: IdParams; Body: any }>, reply: FastifyReply) => {
      const { id } = request.params;
      const { content } = request.body as UpdateCommentBody;

      const comment = await agentCommentService.update(id, request.userId!, content);

      if (!comment) {
        return reply.code(404).send({ error: 'Comment not found or unauthorized' });
      }

      return comment;
    }
  );

  // Delete a comment
  fastify.delete<{ Params: IdParams }>(
    '/comments/:id',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) => {
      const { id } = request.params;

      // Get user role
      const userRole = (request as any).userRole || 'user';
      const success = await agentCommentService.delete(id, request.userId!, userRole);

      if (!success) {
        return reply.code(404).send({ error: 'Comment not found or unauthorized' });
      }

      return { success: true };
    }
  );

  // Like a comment
  fastify.post<{ Params: IdParams }>(
    '/comments/:id/like',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) => {
      const { id } = request.params;
      const success = await agentCommentService.like(id, request.userId!);

      if (!success) {
        return reply.code(400).send({ error: 'Already liked or comment not found' });
      }

      return { success: true };
    }
  );

  // Unlike a comment
  fastify.delete<{ Params: IdParams }>(
    '/comments/:id/like',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) => {
      const { id } = request.params;
      const success = await agentCommentService.unlike(id, request.userId!);

      if (!success) {
        return reply.code(400).send({ error: 'Not liked or comment not found' });
      }

      return { success: true };
    }
  );
}

// ============ Feedback Routes ============

export async function feedbackRoutes(fastify: FastifyInstance) {
  // Submit feedback (authenticated users)
  fastify.post<{ Body: typeof createFeedbackSchema }>(
    '/feedback',
    {
      preHandler: [fastify.authenticate],
      schema: { body: createFeedbackSchema },
    },
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      const { type, title, description, screenshots } = request.body as CreateFeedbackBody;

      const feedback = await feedbackService.create({
        userId: request.userId!,
        type,
        title,
        description,
        screenshots,
      });

      return reply.code(201).send(feedback);
    }
  );

  // Get my feedback
  fastify.get<{ Querystring: PaginationParams }>(
    '/feedback/my',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Querystring: PaginationParams }>, reply: FastifyReply) => {
      const { limit, offset } = request.query;

      const result = await feedbackService.getByUser(request.userId!, { limit, offset });
      return result;
    }
  );

  // Get feedback by ID (own feedback)
  fastify.get<{ Params: IdParams }>(
    '/feedback/:id',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) => {
      const { id } = request.params;

      const feedback = await feedbackService.getById(id);

      if (!feedback) {
        return reply.code(404).send({ error: 'Feedback not found' });
      }

      // Only owner can view their feedback
      if (feedback.userId !== request.userId) {
        return reply.code(403).send({ error: 'Unauthorized' });
      }

      return feedback;
    }
  );

  // Delete feedback (own feedback)
  fastify.delete<{ Params: IdParams }>(
    '/feedback/:id',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) => {
      const { id } = request.params;
      const userRole = (request as any).userRole || 'user';

      const success = await feedbackService.delete(id, request.userId!, userRole);

      if (!success) {
        return reply.code(404).send({ error: 'Feedback not found or unauthorized' });
      }

      return { success: true };
    }
  );

  // Admin: Get all feedback
  fastify.get<{ Querystring: FeedbackListParams }>(
    '/admin/feedback',
    { preHandler: [fastify.authenticate, fastify.requireAdmin] },
    async (request: FastifyRequest<{ Querystring: FeedbackListParams }>, reply: FastifyReply) => {
      const { limit, offset, status, type, search } = request.query;

      const result = await feedbackService.getAll({ limit, offset, status, type, search });
      return result;
    }
  );

  // Admin: Update feedback status
  fastify.put<{ Params: IdParams; Body: typeof updateFeedbackStatusSchema }>(
    '/admin/feedback/:id',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
      schema: { body: updateFeedbackStatusSchema },
    },
    async (request: FastifyRequest<{ Params: IdParams; Body: any }>, reply: FastifyReply) => {
      const { id } = request.params;
      const { status, adminResponse, resolution } = request.body as UpdateFeedbackStatusBody;

      const feedback = await feedbackService.updateStatus(id, status, adminResponse, resolution);

      if (!feedback) {
        return reply.code(404).send({ error: 'Feedback not found' });
      }

      return feedback;
    }
  );

  // Admin: Get feedback stats
  fastify.get(
    '/admin/feedback/stats',
    { preHandler: [fastify.authenticate, fastify.requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const stats = await feedbackService.getStats();
      return stats;
    }
  );
}