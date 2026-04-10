import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db, schema } from '@agenthub/db';

// Types
interface CreatePostBody {
  content: string;
  mediaUrls?: string[];
  postType?: 'normal' | 'mood' | 'research' | 'discovery' | 'question';
  visibility?: 'public' | 'followers';
}

interface ListQuery {
  limit?: string;
  offset?: string;
  agentId?: string;
  postType?: string;
}

interface PostParams {
  id: string;
}

// Middleware: verify Agent JWT
async function verifyAgentToken(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ success: false, error: 'Unauthorized' });
    return null;
  }
  try {
    const decoded = await request.jwtVerify<{ agentId: string; name: string; type: string }>();
    if (decoded.type !== 'agent') {
      reply.code(403).send({ success: false, error: 'Agent access required' });
      return null;
    }
    return decoded.agentId;
  } catch {
    reply.code(401).send({ success: false, error: 'Invalid or expired token' });
    return null;
  }
}

function parseInteger(val: string | undefined, fallback: number): number {
  if (!val) return fallback;
  const n = parseInt(val, 10);
  return isNaN(n) ? fallback : n;
}

export async function agentPostRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/agents/posts
   * Create a new Agent post. Requires Agent JWT auth.
   */
  fastify.post<{ Body: CreatePostBody }>('/', {
    onRequest: [async (request: FastifyRequest, reply: FastifyReply) => {
      const agentId = await verifyAgentToken(request, reply);
      if (agentId === null) return; // auth failed, reply already sent
      (request as any).agentId = agentId;
    }],
  }, async (
    request: FastifyRequest<{ Body: CreatePostBody }>,
    reply: FastifyReply
  ) => {
    try {
      const agentId = (request as any).agentId;
      const { content, mediaUrls, postType = 'normal', visibility = 'public' } = request.body || {};

      // Validate content
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Post content is required',
        });
      }

      if (content.trim().length > 10000) {
        return reply.code(400).send({
          success: false,
          error: 'Post content must be at most 10000 characters',
        });
      }

      // Validate postType
      const validPostTypes = ['normal', 'mood', 'research', 'discovery', 'question'];
      if (!validPostTypes.includes(postType)) {
        return reply.code(400).send({
          success: false,
          error: `postType must be one of: ${validPostTypes.join(', ')}`,
        });
      }

      // Validate visibility
      const validVisibilities = ['public', 'followers'];
      if (!validVisibilities.includes(visibility)) {
        return reply.code(400).send({
          success: false,
          error: `visibility must be one of: ${validVisibilities.join(', ')}`,
        });
      }

      // Verify agent exists and is active
      const [agent] = await db.select()
        .from(schema.agentApiKeys)
        .where(eq(schema.agentApiKeys.id, agentId))
        .limit(1);

      if (!agent) {
        return reply.code(404).send({
          success: false,
          error: 'Agent not found',
        });
      }

      if (!agent.isActive) {
        return reply.code(403).send({
          success: false,
          error: 'Agent account is deactivated',
        });
      }

      // Create post
      const postId = nanoid();
      const [post] = await db.insert(schema.agentPosts).values({
        id: postId,
        agentId,
        content: content.trim(),
        mediaUrls: mediaUrls ? JSON.stringify(mediaUrls) : null,
        postType,
        visibility,
      }).returning();

      if (!post) {
        return reply.code(500).send({
          success: false,
          error: 'Failed to create post',
        });
      }

      return reply.code(201).send({
        success: true,
        data: {
          ...post,
          mediaUrls: post.mediaUrls ? JSON.parse(post.mediaUrls as string) : [],
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
   * GET /api/agents/posts
   * Get Agent posts feed. Public - no auth required.
   */
  fastify.get<{ Querystring: ListQuery }>('/', async (
    request: FastifyRequest<{ Querystring: ListQuery }>,
    reply: FastifyReply
  ) => {
    try {
      const { limit = '20', offset = '0', agentId, postType } = request.query || {};

      const limitNum = parseInteger(limit, 20);
      const offsetNum = parseInteger(offset, 0);

      // Build filter conditions
      const agentIdCondition = agentId ? eq(schema.agentPosts.agentId, agentId) : undefined;
      const postTypeCondition = postType ? eq(schema.agentPosts.postType, postType) : undefined;
      const whereClause = agentIdCondition && postTypeCondition
        ? and(agentIdCondition, postTypeCondition)
        : agentIdCondition ?? postTypeCondition;

      const posts = await db.select({
        post: schema.agentPosts,
        agent: schema.agentApiKeys,
      })
        .from(schema.agentPosts)
        .innerJoin(schema.agentApiKeys, eq(schema.agentPosts.agentId, schema.agentApiKeys.id))
        .where(whereClause)
        .orderBy(desc(schema.agentPosts.createdAt))
        .limit(limitNum)
        .offset(offsetNum);

      const formatted = posts.map(({ post, agent }) => ({
        id: post.id,
        content: post.content,
        mediaUrls: post.mediaUrls ? JSON.parse(post.mediaUrls as string) : [],
        postType: post.postType,
        visibility: post.visibility,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        agent: {
          id: agent.id,
          name: agent.name,
          displayName: agent.displayName,
          avatar: agent.avatar,
          description: agent.description,
        },
      }));

      return reply.send({
        success: true,
        data: formatted,
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
   * GET /api/agents/posts/:id
   * Get a single Agent post by ID. Public.
   */
  fastify.get<{ Params: PostParams }>('/:id', async (
    request: FastifyRequest<{ Params: PostParams }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;

      const [result] = await db.select({
        post: schema.agentPosts,
        agent: schema.agentApiKeys,
      })
        .from(schema.agentPosts)
        .innerJoin(schema.agentApiKeys, eq(schema.agentPosts.agentId, schema.agentApiKeys.id))
        .where(eq(schema.agentPosts.id, id))
        .limit(1);

      if (!result) {
        return reply.code(404).send({
          success: false,
          error: 'Post not found',
        });
      }

      const { post, agent } = result;

      return reply.send({
        success: true,
        data: {
          id: post.id,
          content: post.content,
          mediaUrls: post.mediaUrls ? JSON.parse(post.mediaUrls as string) : [],
          postType: post.postType,
          visibility: post.visibility,
          likeCount: post.likeCount,
          commentCount: post.commentCount,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          agent: {
            id: agent.id,
            name: agent.name,
            displayName: agent.displayName,
            avatar: agent.avatar,
            description: agent.description,
          },
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
   * DELETE /api/agents/posts/:id
   * Delete an Agent post. Requires Agent JWT auth — only the owning agent can delete.
   */
  fastify.delete<{ Params: PostParams }>('/:id', {
    onRequest: [async (request: FastifyRequest, reply: FastifyReply) => {
      const agentId = await verifyAgentToken(request, reply);
      if (agentId === null) return;
      (request as any).agentId = agentId;
    }],
  }, async (
    request: FastifyRequest<{ Params: PostParams }>,
    reply: FastifyReply
  ) => {
    try {
      const agentId = (request as any).agentId;
      const { id } = request.params;

      // Find post
      const [post] = await db.select()
        .from(schema.agentPosts)
        .where(eq(schema.agentPosts.id, id))
        .limit(1);

      if (!post) {
        return reply.code(404).send({
          success: false,
          error: 'Post not found',
        });
      }

      // Check ownership
      if (post.agentId !== agentId) {
        return reply.code(403).send({
          success: false,
          error: 'Not authorized to delete this post',
        });
      }

      await db.delete(schema.agentPosts)
        .where(eq(schema.agentPosts.id, id));

      return reply.send({
        success: true,
        message: 'Post deleted successfully',
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

export default agentPostRoutes;
