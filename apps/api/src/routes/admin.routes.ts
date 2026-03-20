import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, schema } from '@agenthub/db';
import { eq, desc, count, and, gte, lte, sql } from 'drizzle-orm';

interface AdminStats {
  totalUsers: number;
  totalAgents: number;
  totalPosts: number;
  totalComments: number;
  todayUsers: number;
  todayAgents: number;
  todayPosts: number;
}

interface PaginationQuery {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
}

interface IdParams {
  id: string;
}

// Admin middleware - check if user is admin
async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!request.userId) {
    return reply.code(401).send({
      success: false,
      error: 'Not authenticated',
    });
  }

  if (request.user?.role !== 'admin' && request.user?.role !== 'moderator') {
    return reply.code(403).send({
      success: false,
      error: 'Admin access required',
    });
  }
}

export async function adminRoutes(fastify: FastifyInstance) {
  // Apply admin middleware to all routes
  fastify.addHook('onRequest', async (request, reply) => {
    await requireAdmin(request, reply);
  });

  /**
   * GET /api/admin/stats - Dashboard statistics
   */
  fastify.get<{ Querystring: PaginationQuery }>('/stats', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      // Get total counts
      const [userCount] = await db.select({ count: count() }).from(schema.users);
      const [agentCount] = await db.select({ count: count() }).from(schema.agents);
      const [postCount] = await db.select({ count: count() }).from(schema.posts);
      const [commentCount] = await db.select({ count: count() }).from(schema.comments);

      // Get today's counts
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [todayUserCount] = await db.select({ count: count() })
        .from(schema.users)
        .where(gte(schema.users.createdAt, today));

      const [todayAgentCount] = await db.select({ count: count() })
        .from(schema.agents)
        .where(gte(schema.agents.createdAt, today));

      const [todayPostCount] = await db.select({ count: count() })
        .from(schema.posts)
        .where(gte(schema.posts.createdAt, today));

      const stats: AdminStats = {
        totalUsers: userCount?.count || 0,
        totalAgents: agentCount?.count || 0,
        totalPosts: postCount?.count || 0,
        totalComments: commentCount?.count || 0,
        todayUsers: todayUserCount?.count || 0,
        todayAgents: todayAgentCount?.count || 0,
        todayPosts: todayPostCount?.count || 0,
      };

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch stats',
      });
    }
  });

  /**
   * GET /api/admin/users - User list with search
   */
  fastify.get<{ Querystring: PaginationQuery }>('/users', async (
    request: FastifyRequest<{ Querystring: PaginationQuery }>,
    reply: FastifyReply
  ) => {
    try {
      const { limit = 20, offset = 0, search } = request.query;

      let query = db.select({
        id: schema.users.id,
        email: schema.users.email,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatar: schema.users.avatar,
        role: schema.users.role,
        level: schema.users.level,
        points: schema.users.points,
        isVerified: schema.users.isVerified,
        createdAt: schema.users.createdAt,
        lastLoginAt: schema.users.lastLoginAt,
      }).from(schema.users);

      if (search) {
        // Note: SQLite doesn't have full-text search, so we do a simple LIKE
        query = query.where(
          sql`${schema.users.username} LIKE ${`%${search}%`} OR ${schema.users.email} LIKE ${`%${search}%`} OR ${schema.users.displayName} LIKE ${`%${search}%`}`
        ) as typeof query;
      }

      const users = await query
        .orderBy(desc(schema.users.createdAt))
        .limit(limit)
        .offset(offset);

      const [total] = await db.select({ count: count() }).from(schema.users);

      return reply.send({
        success: true,
        data: {
          users,
          total: total?.count || 0,
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch users',
      });
    }
  });

  /**
   * PUT /api/admin/users/:id/role - Update user role
   */
  fastify.put<{ Params: IdParams; Body: { role: string } }>('/users/:id/role', async (
    request: FastifyRequest<{ Params: IdParams; Body: { role: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const { role } = request.body;

      if (!['user', 'moderator', 'admin'].includes(role)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid role',
        });
      }

      const [user] = await db.update(schema.users)
        .set({ role, updatedAt: new Date() })
        .where(eq(schema.users.id, id))
        .returning();

      if (!user) {
        return reply.code(404).send({
          success: false,
          error: 'User not found',
        });
      }

      return reply.send({
        success: true,
        data: user,
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update user role',
      });
    }
  });

  /**
   * DELETE /api/admin/users/:id - Delete user
   */
  fastify.delete<{ Params: IdParams }>('/users/:id', async (
    request: FastifyRequest<{ Params: IdParams }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;

      // Prevent self-deletion
      if (id === request.userId) {
        return reply.code(400).send({
          success: false,
          error: 'Cannot delete yourself',
        });
      }

      await db.delete(schema.users).where(eq(schema.users.id, id));

      return reply.send({
        success: true,
        message: 'User deleted',
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to delete user',
      });
    }
  });

  /**
   * GET /api/admin/agents - Agent list
   */
  fastify.get<{ Querystring: PaginationQuery }>('/agents', async (
    request: FastifyRequest<{ Querystring: PaginationQuery }>,
    reply: FastifyReply
  ) => {
    try {
      const { limit = 20, offset = 0, search, status } = request.query;

      let query = db.select({
        id: schema.agents.id,
        name: schema.agents.name,
        slug: schema.agents.slug,
        logo: schema.agents.logo,
        tagline: schema.agents.tagline,
        status: schema.agents.status,
        isFeatured: schema.agents.isFeatured,
        viewCount: schema.agents.viewCount,
        starCount: schema.agents.starCount,
        avgRating: schema.agents.avgRating,
        createdAt: schema.agents.createdAt,
        ownerId: schema.agents.ownerId,
      }).from(schema.agents);

      const conditions = [];
      if (search) {
        conditions.push(
          sql`${schema.agents.name} LIKE ${`%${search}%`} OR ${schema.agents.tagline} LIKE ${`%${search}%`}`
        );
      }
      if (status) {
        conditions.push(eq(schema.agents.status, status));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const agents = await query
        .orderBy(desc(schema.agents.createdAt))
        .limit(limit)
        .offset(offset);

      // Get owner info for each agent
      const agentsWithOwner = await Promise.all(
        agents.map(async (agent) => {
          const [owner] = await db.select({
            username: schema.users.username,
            displayName: schema.users.displayName,
          }).from(schema.users).where(eq(schema.users.id, agent.ownerId));
          return { ...agent, owner };
        })
      );

      const [total] = await db.select({ count: count() }).from(schema.agents);

      return reply.send({
        success: true,
        data: {
          agents: agentsWithOwner,
          total: total?.count || 0,
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch agents',
      });
    }
  });

  /**
   * PUT /api/admin/agents/:id/status - Update agent status
   */
  fastify.put<{ Params: IdParams; Body: { status: string } }>('/agents/:id/status', async (
    request: FastifyRequest<{ Params: IdParams; Body: { status: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const { status } = request.body;

      if (!['draft', 'published', 'archived'].includes(status)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid status',
        });
      }

      const [agent] = await db.update(schema.agents)
        .set({ status, updatedAt: new Date() })
        .where(eq(schema.agents.id, id))
        .returning();

      if (!agent) {
        return reply.code(404).send({
          success: false,
          error: 'Agent not found',
        });
      }

      return reply.send({
        success: true,
        data: agent,
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update agent status',
      });
    }
  });

  /**
   * PUT /api/admin/agents/:id/featured - Toggle featured
   */
  fastify.put<{ Params: IdParams; Body: { isFeatured: boolean } }>('/agents/:id/featured', async (
    request: FastifyRequest<{ Params: IdParams; Body: { isFeatured: boolean } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const { isFeatured } = request.body;

      const [agent] = await db.update(schema.agents)
        .set({ isFeatured, updatedAt: new Date() })
        .where(eq(schema.agents.id, id))
        .returning();

      if (!agent) {
        return reply.code(404).send({
          success: false,
          error: 'Agent not found',
        });
      }

      return reply.send({
        success: true,
        data: agent,
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update agent',
      });
    }
  });

  /**
   * DELETE /api/admin/agents/:id - Delete agent
   */
  fastify.delete<{ Params: IdParams }>('/agents/:id', async (
    request: FastifyRequest<{ Params: IdParams }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;

      await db.delete(schema.agents).where(eq(schema.agents.id, id));

      return reply.send({
        success: true,
        message: 'Agent deleted',
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to delete agent',
      });
    }
  });

  /**
   * GET /api/admin/posts - Post list
   */
  fastify.get<{ Querystring: PaginationQuery }>('/posts', async (
    request: FastifyRequest<{ Querystring: PaginationQuery }>,
    reply: FastifyReply
  ) => {
    try {
      const { limit = 20, offset = 0, search } = request.query;

      let query = db.select({
        id: schema.posts.id,
        title: schema.posts.title,
        type: schema.posts.type,
        isPinned: schema.posts.isPinned,
        isFeatured: schema.posts.isFeatured,
        viewCount: schema.posts.viewCount,
        likeCount: schema.posts.likeCount,
        commentCount: schema.posts.commentCount,
        createdAt: schema.posts.createdAt,
        authorId: schema.posts.authorId,
        channelId: schema.posts.channelId,
      }).from(schema.posts);

      if (search) {
        query = query.where(
          sql`${schema.posts.title} LIKE ${`%${search}%`}`
        ) as typeof query;
      }

      const posts = await query
        .orderBy(desc(schema.posts.createdAt))
        .limit(limit)
        .offset(offset);

      // Get author and channel info
      const postsWithDetails = await Promise.all(
        posts.map(async (post) => {
          const [author] = await db.select({
            username: schema.users.username,
            displayName: schema.users.displayName,
          }).from(schema.users).where(eq(schema.users.id, post.authorId));
          
          const [channel] = await db.select({
            name: schema.channels.name,
            slug: schema.channels.slug,
          }).from(schema.channels).where(eq(schema.channels.id, post.channelId));
          
          return { ...post, author, channel };
        })
      );

      const [total] = await db.select({ count: count() }).from(schema.posts);

      return reply.send({
        success: true,
        data: {
          posts: postsWithDetails,
          total: total?.count || 0,
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch posts',
      });
    }
  });

  /**
   * PUT /api/admin/posts/:id/pin - Toggle pin
   */
  fastify.put<{ Params: IdParams; Body: { isPinned: boolean } }>('/posts/:id/pin', async (
    request: FastifyRequest<{ Params: IdParams; Body: { isPinned: boolean } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const { isPinned } = request.body;

      const [post] = await db.update(schema.posts)
        .set({ isPinned, updatedAt: new Date() })
        .where(eq(schema.posts.id, id))
        .returning();

      if (!post) {
        return reply.code(404).send({
          success: false,
          error: 'Post not found',
        });
      }

      return reply.send({
        success: true,
        data: post,
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update post',
      });
    }
  });

  /**
   * DELETE /api/admin/posts/:id - Delete post
   */
  fastify.delete<{ Params: IdParams }>('/posts/:id', async (
    request: FastifyRequest<{ Params: IdParams }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;

      await db.delete(schema.posts).where(eq(schema.posts.id, id));

      return reply.send({
        success: true,
        message: 'Post deleted',
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to delete post',
      });
    }
  });

  /**
   * GET /api/admin/comments - Comment list
   */
  fastify.get<{ Querystring: PaginationQuery }>('/comments', async (
    request: FastifyRequest<{ Querystring: PaginationQuery }>,
    reply: FastifyReply
  ) => {
    try {
      const { limit = 20, offset = 0, search } = request.query;

      let query = db.select({
        id: schema.comments.id,
        content: schema.comments.content,
        isAccepted: schema.comments.isAccepted,
        likeCount: schema.comments.likeCount,
        createdAt: schema.comments.createdAt,
        postId: schema.comments.postId,
        authorId: schema.comments.authorId,
      }).from(schema.comments);

      if (search) {
        query = query.where(
          sql`${schema.comments.content} LIKE ${`%${search}%`}`
        ) as typeof query;
      }

      const comments = await query
        .orderBy(desc(schema.comments.createdAt))
        .limit(limit)
        .offset(offset);

      // Get author and post info
      const commentsWithDetails = await Promise.all(
        comments.map(async (comment) => {
          const [author] = await db.select({
            username: schema.users.username,
            displayName: schema.users.displayName,
          }).from(schema.users).where(eq(schema.users.id, comment.authorId));
          
          const [post] = await db.select({
            title: schema.posts.title,
          }).from(schema.posts).where(eq(schema.posts.id, comment.postId));
          
          return { ...comment, author, post };
        })
      );

      const [total] = await db.select({ count: count() }).from(schema.comments);

      return reply.send({
        success: true,
        data: {
          comments: commentsWithDetails,
          total: total?.count || 0,
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch comments',
      });
    }
  });

  /**
   * DELETE /api/admin/comments/:id - Delete comment
   */
  fastify.delete<{ Params: IdParams }>('/comments/:id', async (
    request: FastifyRequest<{ Params: IdParams }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;

      await db.delete(schema.comments).where(eq(schema.comments.id, id));

      return reply.send({
        success: true,
        message: 'Comment deleted',
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to delete comment',
      });
    }
  });

  /**
   * GET /api/admin/channels - Channel list
   */
  fastify.get('/channels', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const channels = await db.select().from(schema.channels)
        .orderBy(schema.channels.sortOrder);

      return reply.send({
        success: true,
        data: channels,
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch channels',
      });
    }
  });
}
