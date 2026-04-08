import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pollService } from '../services/poll.service.js';
import { db, schema } from '@agenthub/db';
import { eq } from 'drizzle-orm';

// Type definitions
interface CreatePollBody {
  postId: string;
  question: string;
  options: string[];
  isAnonymous?: boolean;
  isMultiSelect?: boolean;
  endsAt?: string;
}

interface VoteBody {
  pollId: string;
  optionIds: string[];
}

// Validation schemas
const CreatePollSchema = {
  type: 'object',
  required: ['postId', 'question', 'options'],
  properties: {
    postId: { type: 'string', minLength: 1 },
    question: { type: 'string', minLength: 1 },
    options: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      minItems: 2,
      maxItems: 10,
    },
    isAnonymous: { type: 'boolean', default: false },
    isMultiSelect: { type: 'boolean', default: false },
    endsAt: { type: 'string', format: 'date-time' },
  },
};

const VoteSchema = {
  type: 'object',
  required: ['pollId', 'optionIds'],
  properties: {
    pollId: { type: 'string', minLength: 1 },
    optionIds: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      minItems: 1,
    },
  },
};

export async function pollRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/polls/:postId - Get poll for a post
   */
  fastify.get<{ Params: { postId: string } }>(
    '/:postId',
    { preHandler: [(fastify as any).authOptional] },
    async (request: FastifyRequest<{ Params: { postId: string } }>, reply: FastifyReply) => {
      try {
        const { postId } = request.params;
        const userId = (request as any).user?.id;
        const ipAddress = request.ip;

        const poll = await pollService.getByPostId(postId, userId, ipAddress);
        if (!poll) {
          return reply.status(404).send({ error: 'Poll not found' });
        }

        return reply.send(poll);
      } catch (error) {
        console.error('Error getting poll:', error);
        return reply.status(500).send({ error: 'Failed to get poll' });
      }
    }
  );

  /**
   * POST /api/polls - Create a poll (attached to a post)
   * Requires authentication
   */
  fastify.post<{ Body: CreatePollBody }>(
    '/',
    {
      preHandler: [(fastify as any).authenticate],
      schema: { body: CreatePollSchema },
    },
    async (request: FastifyRequest<{ Body: CreatePollBody }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.id;
        const body = request.body;
        const { postId, question, options, isAnonymous, isMultiSelect, endsAt } = body;

        // Verify post exists and user is the author (you could add this check)
        const poll = await pollService.create({
          postId,
          question,
          options,
          isAnonymous,
          isMultiSelect,
          endsAt: endsAt ? new Date(endsAt) : undefined,
        });

        return reply.status(201).send(poll);
      } catch (error: any) {
        console.error('Error creating poll:', error);
        return reply.status(500).send({ error: error.message || 'Failed to create poll' });
      }
    }
  );

  /**
   * POST /api/polls/vote - Vote on a poll
   * Auth optional (anonymous voting supported)
   */
  fastify.post<{ Body: any }>(
    '/vote',
    {
      preHandler: [(fastify as any).authOptional],
      schema: { body: VoteSchema },
    },
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.id;
        const ipAddress = request.ip;
        const body = request.body as { pollId?: string; optionIds?: string[] };
        const pollId = body.pollId as string;
        const optionIds = body.optionIds ?? [];

        await pollService.vote({
          pollId,
          optionIds,
          userId,
          ipAddress,
        });

        // Return updated poll results
        const results = await pollService.getResults(pollId);
        return reply.send(results);
      } catch (error: any) {
        console.error('Error voting on poll:', error);
        return reply.status(400).send({ error: error.message || 'Failed to vote' });
      }
    }
  );

  /**
   * GET /api/polls/:id/results - Get poll results
   */
  fastify.get<{ Params: { id: string } }>(
    '/:id/results',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const results = await pollService.getResults(id);

        if (!results) {
          return reply.status(404).send({ error: 'Poll not found' });
        }

        return reply.send(results);
      } catch (error) {
        console.error('Error getting poll results:', error);
        return reply.status(500).send({ error: 'Failed to get poll results' });
      }
    }
  );

  /**
   * DELETE /api/polls/:id - Delete a poll (author only)
   * Requires authentication
   */
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [(fastify as any).authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.id;
        const { id } = request.params;

        // Get poll and check ownership
        const results = await pollService.getResults(id);
        if (!results) {
          return reply.status(404).send({ error: 'Poll not found' });
        }

        // Get the post that owns this poll to check ownership
        const [post] = await db.select()
          .from(schema.posts)
          .where(eq(schema.posts.id, results.poll.postId))
          .limit(1);

        if (!post) {
          return reply.status(404).send({ error: 'Post not found' });
        }

        // Ownership check: only post author or admin can delete
        const isAdmin = (request.user as any)?.role === 'admin';
        if (post.authorId !== userId && !isAdmin) {
          return reply.status(403).send({ error: 'Not authorized to delete this poll' });
        }

        await pollService.delete(id);

        return reply.send({ success: true });
      } catch (error) {
        console.error('Error deleting poll:', error);
        return reply.status(500).send({ error: 'Failed to delete poll' });
      }
    }
  );
}