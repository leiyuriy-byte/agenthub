import { db, schema } from '@agenthub/db';
import { eq, desc, and, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * Agent Comments Service
 * Handles CRUD operations for agent detail page comments
 */
export const agentCommentService = {
  /**
   * Get comments for an agent
   */
  async getByAgent(agentId: string, options?: { limit?: number; offset?: number; sortBy?: 'newest' | 'popular' }) {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    let orderByClause;
    if (options?.sortBy === 'popular') {
      orderByClause = desc(schema.agentComments.likeCount);
    } else {
      orderByClause = desc(schema.agentComments.createdAt);
    }

    // Get comments (excluding hidden ones for regular users)
    const comments = await db
      .select({
        id: schema.agentComments.id,
        agentId: schema.agentComments.agentId,
        authorId: schema.agentComments.authorId,
        parentId: schema.agentComments.parentId,
        content: schema.agentComments.content,
        screenshotUrl: schema.agentComments.screenshotUrl,
        likeCount: schema.agentComments.likeCount,
        isHidden: schema.agentComments.isHidden,
        createdAt: schema.agentComments.createdAt,
        updatedAt: schema.agentComments.updatedAt,
      })
      .from(schema.agentComments)
      .where(eq(schema.agentComments.agentId, agentId))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Get author info for each comment
    const commentsWithAuthors = await Promise.all(
      comments.map(async (comment) => {
        const [author] = await db
          .select({
            id: schema.users.id,
            username: schema.users.username,
            displayName: schema.users.displayName,
            avatar: schema.users.avatar,
            level: schema.users.level,
          })
          .from(schema.users)
          .where(eq(schema.users.id, comment.authorId));

        return { ...comment, author };
      })
    );

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(schema.agentComments)
      .where(eq(schema.agentComments.agentId, agentId));

    return {
      comments: commentsWithAuthors,
      total: totalResult?.count || 0,
    };
  },

  /**
   * Get a single comment by ID
   */
  async getById(id: string) {
    const [comment] = await db
      .select()
      .from(schema.agentComments)
      .where(eq(schema.agentComments.id, id));

    if (!comment) return null;

    // Get author info
    const [author] = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatar: schema.users.avatar,
        level: schema.users.level,
      })
      .from(schema.users)
      .where(eq(schema.users.id, comment.authorId));

    return { ...comment, author };
  },

  /**
   * Create a new comment
   */
  async create(data: {
    agentId: string;
    authorId: string;
    parentId?: string;
    content: string;
    screenshotUrl?: string;
  }) {
    const id = randomUUID();
    const now = new Date();

    await db.insert(schema.agentComments).values({
      id,
      agentId: data.agentId,
      authorId: data.authorId,
      parentId: data.parentId || null,
      content: data.content,
      screenshotUrl: data.screenshotUrl || null,
      likeCount: 0,
      isHidden: false,
      createdAt: now,
      updatedAt: now,
    });

    // Update agent comment count
    const [agent] = await db
      .select({ commentCount: schema.agents.commentCount })
      .from(schema.agents)
      .where(eq(schema.agents.id, data.agentId));
    
    if (agent) {
      await db
        .update(schema.agents)
        .set({ commentCount: (agent.commentCount || 0) + 1 })
        .where(eq(schema.agents.id, data.agentId));
    }

    return this.getById(id);
  },

  /**
   * Update a comment (only by author)
   */
  async update(id: string, authorId: string, content: string) {
    const [existing] = await db
      .select()
      .from(schema.agentComments)
      .where(eq(schema.agentComments.id, id));

    if (!existing || existing.authorId !== authorId) {
      return null;
    }

    const now = new Date();
    await db
      .update(schema.agentComments)
      .set({ content, updatedAt: now })
      .where(eq(schema.agentComments.id, id));

    return this.getById(id);
  },

  /**
   * Delete a comment (by author or admin)
   */
  async delete(id: string, userId: string, userRole: string) {
    const [existing] = await db
      .select()
      .from(schema.agentComments)
      .where(eq(schema.agentComments.id, id));

    if (!existing) return false;

    // Only author or admin can delete
    if (existing.authorId !== userId && userRole !== 'admin' && userRole !== 'moderator') {
      return false;
    }

    const agentId = existing.agentId;
    await db.delete(schema.agentComments).where(eq(schema.agentComments.id, id));

    // Update agent comment count
    const [agent] = await db
      .select({ commentCount: schema.agents.commentCount })
      .from(schema.agents)
      .where(eq(schema.agents.id, agentId));

    if (agent) {
      await db
        .update(schema.agents)
        .set({ commentCount: Math.max(0, (agent.commentCount || 0) - 1) })
        .where(eq(schema.agents.id, agentId));
    }

    return true;
  },

  /**
   * Like a comment
   */
  async like(commentId: string, userId: string) {
    // Check if already liked
    const [existing] = await db
      .select()
      .from(schema.agentCommentLikes)
      .where(
        and(
          eq(schema.agentCommentLikes.commentId, commentId),
          eq(schema.agentCommentLikes.userId, userId)
        )
      );

    if (existing) return false; // Already liked

    const id = randomUUID();
    await db.insert(schema.agentCommentLikes).values({
      id,
      commentId,
      userId,
      createdAt: new Date(),
    });

    // Increment like count
    const [comment] = await db
      .select({ likeCount: schema.agentComments.likeCount })
      .from(schema.agentComments)
      .where(eq(schema.agentComments.id, commentId));

    if (comment) {
      await db
        .update(schema.agentComments)
        .set({ likeCount: (comment.likeCount || 0) + 1 })
        .where(eq(schema.agentComments.id, commentId));
    }

    return true;
  },

  /**
   * Unlike a comment
   */
  async unlike(commentId: string, userId: string) {
    const result = await db
      .delete(schema.agentCommentLikes)
      .where(
        and(
          eq(schema.agentCommentLikes.commentId, commentId),
          eq(schema.agentCommentLikes.userId, userId)
        )
      );

    if (result.changes === 0) return false;

    // Decrement like count
    const [comment] = await db
      .select({ likeCount: schema.agentComments.likeCount })
      .from(schema.agentComments)
      .where(eq(schema.agentComments.id, commentId));

    if (comment) {
      await db
        .update(schema.agentComments)
        .set({ likeCount: Math.max(0, (comment.likeCount || 0) - 1) })
        .where(eq(schema.agentComments.id, commentId));
    }

    return true;
  },

  /**
   * Check if user has liked a comment
   */
  async isLiked(commentId: string, userId: string) {
    const [like] = await db
      .select()
      .from(schema.agentCommentLikes)
      .where(
        and(
          eq(schema.agentCommentLikes.commentId, commentId),
          eq(schema.agentCommentLikes.userId, userId)
        )
      );
    return !!like;
  },

  /**
   * Get user's liked comments for an agent
   */
  async getUserLikedComments(agentId: string, userId: string) {
    const likes = await db
      .select({ commentId: schema.agentCommentLikes.commentId })
      .from(schema.agentCommentLikes)
      .innerJoin(
        schema.agentComments,
        eq(schema.agentCommentLikes.commentId, schema.agentComments.id)
      )
      .where(eq(schema.agentComments.agentId, agentId));

    return likes.map((l) => l.commentId);
  },
};

/**
 * User Feedback Service
 * Handles bug reports and feature suggestions
 */
export const feedbackService = {
  /**
   * Submit new feedback
   */
  async create(data: {
    userId: string;
    type: 'bug_report' | 'feature_suggestion';
    title: string;
    description: string;
    screenshots?: string[];
  }) {
    const id = randomUUID();
    const now = new Date();

    await db.insert(schema.userFeedback).values({
      id,
      userId: data.userId,
      type: data.type,
      title: data.title,
      description: data.description,
      screenshots: data.screenshots ? JSON.stringify(data.screenshots) : null,
      status: 'pending',
      priority: null,
      resolution: null,
      adminResponse: null,
      reviewedBy: null,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    });

    return this.getById(id);
  },

  /**
   * Get feedback by ID
   */
  async getById(id: string) {
    const [feedback] = await db
      .select()
      .from(schema.userFeedback)
      .where(eq(schema.userFeedback.id, id));

    if (!feedback) return null;

    // Get user info
    const [user] = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatar: schema.users.avatar,
      })
      .from(schema.users)
      .where(eq(schema.users.id, feedback.userId));

    return {
      ...feedback,
      screenshots: feedback.screenshots ? JSON.parse(feedback.screenshots) : [],
      user,
    };
  },

  /**
   * Get feedback list (for user)
   */
  async getByUser(userId: string, options?: { limit?: number; offset?: number }) {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    const feedbacks = await db
      .select()
      .from(schema.userFeedback)
      .where(eq(schema.userFeedback.userId, userId))
      .orderBy(desc(schema.userFeedback.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: count() })
      .from(schema.userFeedback)
      .where(eq(schema.userFeedback.userId, userId));

    return {
      feedbacks,
      total: totalResult?.count || 0,
    };
  },

  /**
   * Get all feedback (for admin)
   */
  async getAll(options?: {
    limit?: number;
    offset?: number;
    status?: string;
    type?: string;
    search?: string;
  }) {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    // Note: For complex filtering, you'd build a proper where clause
    // Here we just get all and filter in memory for simplicity
    let query = db
      .select()
      .from(schema.userFeedback)
      .orderBy(desc(schema.userFeedback.createdAt))
      .limit(limit)
      .offset(offset);

    const feedbacks = await query;

    // Get user info for each
    const feedbacksWithUsers = await Promise.all(
      feedbacks.map(async (feedback) => {
        const [user] = await db
          .select({
            id: schema.users.id,
            username: schema.users.username,
            displayName: schema.users.displayName,
            avatar: schema.users.avatar,
          })
          .from(schema.users)
          .where(eq(schema.users.id, feedback.userId));

        return {
          ...feedback,
          screenshots: feedback.screenshots ? JSON.parse(feedback.screenshots) : [],
          user,
        };
      })
    );

    const [totalResult] = await db
      .select({ count: count() })
      .from(schema.userFeedback);

    return {
      feedbacks: feedbacksWithUsers,
      total: totalResult?.count || 0,
    };
  },

  /**
   * Update feedback status (admin only)
   */
  async updateStatus(
    id: string,
    status: 'pending' | 'in_progress' | 'resolved' | 'rejected',
    adminResponse?: string,
    resolution?: string
  ) {
    const [existing] = await db
      .select()
      .from(schema.userFeedback)
      .where(eq(schema.userFeedback.id, id));

    if (!existing) return null;

    const now = new Date();
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: now,
    };

    if (adminResponse !== undefined) {
      updateData.adminResponse = adminResponse;
    }
    if (resolution !== undefined) {
      updateData.resolution = resolution;
    }
    if (status === 'resolved' || status === 'rejected') {
      updateData.resolvedAt = now;
    }

    await db
      .update(schema.userFeedback)
      .set(updateData)
      .where(eq(schema.userFeedback.id, id));

    return this.getById(id);
  },

  /**
   * Delete feedback
   */
  async delete(id: string, userId: string, userRole: string) {
    const [existing] = await db
      .select()
      .from(schema.userFeedback)
      .where(eq(schema.userFeedback.id, id));

    if (!existing) return false;

    // Only author or admin can delete
    if (existing.userId !== userId && userRole !== 'admin') {
      return false;
    }

    await db.delete(schema.userFeedback).where(eq(schema.userFeedback.id, id));
    return true;
  },

  /**
   * Get feedback statistics (admin)
   */
  async getStats() {
    const [total] = await db
      .select({ count: count() })
      .from(schema.userFeedback);

    const [pendingCount] = await db
      .select({ count: count() })
      .from(schema.userFeedback)
      .where(eq(schema.userFeedback.status, 'pending'));

    const [inProgressCount] = await db
      .select({ count: count() })
      .from(schema.userFeedback)
      .where(eq(schema.userFeedback.status, 'in_progress'));

    const [resolvedCount] = await db
      .select({ count: count() })
      .from(schema.userFeedback)
      .where(eq(schema.userFeedback.status, 'resolved'));

    const [bugCount] = await db
      .select({ count: count() })
      .from(schema.userFeedback)
      .where(eq(schema.userFeedback.type, 'bug_report'));

    const [featureCount] = await db
      .select({ count: count() })
      .from(schema.userFeedback)
      .where(eq(schema.userFeedback.type, 'feature_suggestion'));

    return {
      total: total?.count || 0,
      pending: pendingCount?.count || 0,
      inProgress: inProgressCount?.count || 0,
      resolved: resolvedCount?.count || 0,
      bugReports: bugCount?.count || 0,
      featureSuggestions: featureCount?.count || 0,
    };
  },
};