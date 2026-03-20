import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { db, schema } from '@agenthub/db';
import { nanoid } from 'nanoid';

export interface CreateCommentData {
  postId: string;
  authorId: string;
  content: string;
  parentId?: string;
}

export interface UpdateCommentData {
  content: string;
}

export interface CommentListParams {
  postId: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'likeCount';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Comment service - handles Comment CRUD and interactions
 */
export const commentService = {
  /**
   * Create a new comment
   */
  async create(data: CreateCommentData) {
    const id = nanoid();

    // Check if parent comment exists (for nested replies)
    if (data.parentId) {
      const [parentComment] = await db.select()
        .from(schema.comments)
        .where(eq(schema.comments.id, data.parentId))
        .limit(1);

      if (!parentComment) {
        throw new Error('Parent comment not found');
      }

      // Check nesting depth (max 3 levels)
      let depth = 1;
      let currentParentId = parentComment.parentId;
      while (currentParentId) {
        const [parent] = await db.select()
          .from(schema.comments)
          .where(eq(schema.comments.id, currentParentId))
          .limit(1);
        if (parent) {
          depth++;
          currentParentId = parent.parentId;
        } else {
          break;
        }
      }

      if (depth >= 3) {
        throw new Error('Maximum reply depth reached (3 levels)');
      }
    }

    const [comment] = await db.insert(schema.comments).values({
      id,
      postId: data.postId,
      authorId: data.authorId,
      content: data.content,
      parentId: data.parentId || null,
    }).returning();

    // Increment post comment count
    await db.update(schema.posts)
      .set({ commentCount: sql`${schema.posts.commentCount} + 1` })
      .where(eq(schema.posts.id, data.postId));

    return this.findById(id);
  },

  /**
   * Get comment by ID
   */
  async findById(id: string) {
    const [comment] = await db.select()
      .from(schema.comments)
      .where(eq(schema.comments.id, id))
      .limit(1);

    if (!comment) return null;

    // Get author info
    const [author] = await db.select({
      id: schema.users.id,
      username: schema.users.username,
      displayName: schema.users.displayName,
      avatar: schema.users.avatar,
    })
      .from(schema.users)
      .where(eq(schema.users.id, comment.authorId))
      .limit(1);

    // Get parent comment if exists
    let parent: { id: string; authorId: string } | null = null;
    if (comment.parentId) {
      const [parentComment] = await db.select({
        id: schema.comments.id,
        authorId: schema.comments.authorId,
      })
        .from(schema.comments)
        .where(eq(schema.comments.id, comment.parentId))
        .limit(1);
      parent = parentComment;
    }

    // Get user's vote
    // Note: This needs to be passed from the caller if needed

    return {
      ...comment,
      author,
      parent,
    };
  },

  /**
   * List comments for a post
   */
  async list(params: CommentListParams = {}) {
    const {
      postId,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    // Build order by
    const orderFn = sortOrder === 'desc' ? desc : asc;
    let orderBy;
    switch (sortBy) {
      case 'likeCount':
        orderBy = orderFn(schema.comments.likeCount);
        break;
      default:
        orderBy = orderFn(schema.comments.createdAt);
    }

    // Get total count
    const [countResult] = await db.select({
      count: sql<number>`count(*)`,
    })
      .from(schema.comments)
      .where(eq(schema.comments.postId, postId));

    // Get comments
    const comments = await db.select()
      .from(schema.comments)
      .where(eq(schema.comments.postId, postId))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Get author info for each comment and build tree structure
    const commentsWithAuthors = await Promise.all(
      comments.map(async (comment) => {
        const [author] = await db.select({
          id: schema.users.id,
          username: schema.users.username,
          displayName: schema.users.displayName,
          avatar: schema.users.avatar,
        })
          .from(schema.users)
          .where(eq(schema.users.id, comment.authorId))
          .limit(1);

        return {
          ...comment,
          author,
        };
      })
    );

    // Build nested structure
    const commentMap = new Map<string, typeof commentsWithAuthors[0] & { children: typeof commentsWithAuthors }>();
    const topLevelComments: (typeof commentsWithAuthors[0] & { children: typeof commentsWithAuthors })[] = [];

    // First pass: create map with children arrays
    for (const comment of commentsWithAuthors) {
      commentMap.set(comment.id, { ...comment, children: [] });
    }

    // Second pass: build tree
    for (const comment of commentsWithAuthors) {
      const commentWithChildren = commentMap.get(comment.id)!;
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.children.push(commentWithChildren);
        } else {
          // Parent not found, treat as top-level
          topLevelComments.push(commentWithChildren);
        }
      } else {
        topLevelComments.push(commentWithChildren);
      }
    }

    // Sort children by createdAt (oldest first for replies)
    for (const comment of topLevelComments) {
      comment.children.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }

    // If sorting by likeCount, re-sort top level
    if (sortBy === 'likeCount') {
      topLevelComments.sort((a, b) => 
        (b.likeCount || 0) - (a.likeCount || 0)
      );
    }

    return {
      comments: topLevelComments,
      total: countResult.count,
      limit,
      offset,
    };
  },

  /**
   * Update a comment
   */
  async update(id: string, data: UpdateCommentData, authorId: string) {
    // Check ownership
    const [comment] = await db.select()
      .from(schema.comments)
      .where(eq(schema.comments.id, id))
      .limit(1);

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.authorId !== authorId) {
      throw new Error('Not authorized to update this comment');
    }

    const [updated] = await db.update(schema.comments)
      .set({
        content: data.content,
        updatedAt: new Date(),
      })
      .where(eq(schema.comments.id, id))
      .returning();

    return this.findById(id);
  },

  /**
   * Delete a comment
   */
  async delete(id: string, userId: string, userRole: string = 'user') {
    // Check ownership or admin/moderator
    const [comment] = await db.select()
      .from(schema.comments)
      .where(eq(schema.comments.id, id))
      .limit(1);

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.authorId !== userId && !['admin', 'moderator'].includes(userRole)) {
      throw new Error('Not authorized to delete this comment');
    }

    // Get postId before deletion for count update
    const postId = comment.postId;

    // Delete the comment and all its replies (cascade)
    await db.delete(schema.comments).where(eq(schema.comments.id, id));

    // Decrement post comment count (only for top-level comments)
    if (!comment.parentId) {
      await db.update(schema.posts)
        .set({ commentCount: sql`${schema.posts.commentCount} - 1` })
        .where(eq(schema.posts.id, postId));
    }

    return { success: true };
  },

  /**
   * Like a comment
   */
  async like(commentId: string, userId: string) {
    // Check if already liked
    const [existing] = await db.select()
      .from(schema.commentVotes)
      .where(
        and(
          eq(schema.commentVotes.commentId, commentId),
          eq(schema.commentVotes.userId, userId)
        )
      )
      .limit(1);

    if (existing) {
      if (existing.value === 1) {
        // Already liked, remove like
        await db.delete(schema.commentVotes)
          .where(eq(schema.commentVotes.id, existing.id));
        await db.update(schema.comments)
          .set({ likeCount: sql`${schema.comments.likeCount} - 1` })
          .where(eq(schema.comments.id, commentId));
        return { success: true, liked: false };
      } else {
        // Was disliked, change to like
        await db.update(schema.commentVotes)
          .set({ value: 1 })
          .where(eq(schema.commentVotes.id, existing.id));
        await db.update(schema.comments)
          .set({ likeCount: sql`${schema.comments.likeCount} + 1` })
          .where(eq(schema.comments.id, commentId));
        return { success: true, liked: true };
      }
    }

    const id = nanoid();
    await db.insert(schema.commentVotes).values({
      id,
      commentId,
      userId,
      value: 1,
    });

    await db.update(schema.comments)
      .set({ likeCount: sql`${schema.comments.likeCount} + 1` })
      .where(eq(schema.comments.id, commentId));

    return { success: true, liked: true };
  },

  /**
   * Accept answer (for Q&A)
   */
  async accept(commentId: string, userId: string) {
    // Get the comment
    const [comment] = await db.select()
      .from(schema.comments)
      .where(eq(schema.comments.id, commentId))
      .limit(1);

    if (!comment) {
      throw new Error('Comment not found');
    }

    // Get the post to check ownership
    const [post] = await db.select()
      .from(schema.posts)
      .where(eq(schema.posts.id, comment.postId))
      .limit(1);

    if (!post) {
      throw new Error('Post not found');
    }

    // Only post author can accept answers
    if (post.authorId !== userId) {
      throw new Error('Only post author can accept answers');
    }

    // Remove accepted status from other comments on this post
    await db.update(schema.comments)
      .set({ isAccepted: false })
      .where(
        and(
          eq(schema.comments.postId, post.id),
          eq(schema.comments.isAccepted, true)
        )
      );

    // Accept this comment
    const [updated] = await db.update(schema.comments)
      .set({ isAccepted: true })
      .where(eq(schema.comments.id, commentId))
      .returning();

    return updated;
  },

  /**
   * Get user's vote on a comment
   */
  async getUserVote(commentId: string, userId: string) {
    const [vote] = await db.select()
      .from(schema.commentVotes)
      .where(
        and(
          eq(schema.commentVotes.commentId, commentId),
          eq(schema.commentVotes.userId, userId)
        )
      )
      .limit(1);

    return vote?.value || 0;
  },
};

export default commentService;
