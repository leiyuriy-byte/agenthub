import { eq, and, desc, asc, like, sql, or } from 'drizzle-orm';
import { db, schema } from '@agenthub/db';
import { nanoid } from 'nanoid';
import { awardPointsForAction } from './points.service.js';
import { notificationService } from './notification.service.js';

export interface CreatePostData {
  authorId: string;
  channelId: string;
  title: string;
  content: string;
  type?: 'normal' | 'question' | 'poll' | 'share';
  tags?: string[];
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  tags?: string[];
  isPinned?: boolean;
  isFeatured?: boolean;
}

export interface PostListParams {
  limit?: number;
  offset?: number;
  channelId?: string;
  authorId?: string;
  search?: string;
  sortBy?: 'createdAt' | 'likeCount' | 'viewCount' | 'commentCount';
  sortOrder?: 'asc' | 'desc';
  type?: 'normal' | 'question' | 'poll' | 'share';
}

/**
 * Post service - handles Post CRUD and interactions
 */
export const postService = {
  /**
   * Create a new post
   * Awards 10 points to the author upon creation
   */
  async create(data: CreatePostData) {
    const id = nanoid();

    const [post] = await db.insert(schema.posts).values({
      id,
      authorId: data.authorId,
      channelId: data.channelId,
      title: data.title,
      content: data.content,
      type: data.type || 'normal',
    }).returning();

    // Add tags if provided
    if (data.tags && data.tags.length > 0) {
      for (const tag of data.tags) {
        await db.insert(schema.postTags).values({
          id: nanoid(),
          postId: id,
          tag,
        });
      }
    }

    // Award points for post creation
    try {
      await awardPointsForAction(data.authorId, 'post_created', id);
    } catch (error) {
      // Log error but don't fail the post creation
      console.error('Failed to award points for post creation:', error);
    }

    return this.findById(id);
  },

  /**
   * Get post by ID
   */
  async findById(id: string) {
    const [post] = await db.select()
      .from(schema.posts)
      .where(eq(schema.posts.id, id))
      .limit(1);

    if (!post) return null;

    // Get author info
    const [author] = await db.select({
      id: schema.users.id,
      username: schema.users.username,
      displayName: schema.users.displayName,
      avatar: schema.users.avatar,
    })
      .from(schema.users)
      .where(eq(schema.users.id, post.authorId))
      .limit(1);

    // Get channel info
    const [channel] = await db.select()
      .from(schema.channels)
      .where(eq(schema.channels.id, post.channelId))
      .limit(1);

    // Get tags
    const tags = await db.select()
      .from(schema.postTags)
      .where(eq(schema.postTags.postId, id));

    return {
      ...post,
      author,
      channel,
      tags: tags.map(t => t.tag),
    };
  },

  /**
   * List posts with filtering, sorting, and pagination
   */
  async list(params: PostListParams = {}) {
    const {
      limit = 20,
      offset = 0,
      channelId,
      authorId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      type,
    } = params;

    // Build conditions
    const conditions = [];

    if (channelId) {
      conditions.push(eq(schema.posts.channelId, channelId));
    }

    if (authorId) {
      conditions.push(eq(schema.posts.authorId, authorId));
    }

    if (type) {
      conditions.push(eq(schema.posts.type, type));
    }

    if (search) {
      conditions.push(
        or(
          like(schema.posts.title, `%${search}%`),
          like(schema.posts.content, `%${search}%`)
        )
      );
    }

    // Build order by
    const orderFn = sortOrder === 'desc' ? desc : asc;
    let orderBy;
    switch (sortBy) {
      case 'likeCount':
        orderBy = orderFn(schema.posts.likeCount);
        break;
      case 'viewCount':
        orderBy = orderFn(schema.posts.viewCount);
        break;
      case 'commentCount':
        orderBy = orderFn(schema.posts.commentCount);
        break;
      default:
        orderBy = orderFn(schema.posts.createdAt);
    }

    // Get total count
    const [countResult] = await db.select({
      count: sql<number>`count(*)`,
    })
      .from(schema.posts)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get posts
    const posts = await db.select()
      .from(schema.posts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Get author and channel info for each post
    const postsWithDetails = await Promise.all(
      posts.map(async (post) => {
        const [author] = await db.select({
          id: schema.users.id,
          username: schema.users.username,
          displayName: schema.users.displayName,
          avatar: schema.users.avatar,
        })
          .from(schema.users)
          .where(eq(schema.users.id, post.authorId))
          .limit(1);

        const [channel] = await db.select()
          .from(schema.channels)
          .where(eq(schema.channels.id, post.channelId))
          .limit(1);

        const tags = await db.select()
          .from(schema.postTags)
          .where(eq(schema.postTags.postId, post.id));

        return {
          ...post,
          author,
          channel,
          tags: tags.map(t => t.tag),
        };
      })
    );

    return {
      posts: postsWithDetails,
      total: countResult.count,
      limit,
      offset,
    };
  },

  /**
   * Get similar posts (for Q&A recommendations)
   * Finds posts with matching tags or in the same channel, excluding current post
   */
  async getSimilar(postId: string, limit = 5) {
    // Get current post's tags and channel
    const [currentPost] = await db.select({
      channelId: schema.posts.channelId,
      type: schema.posts.type,
    })
      .from(schema.posts)
      .where(eq(schema.posts.id, postId))
      .limit(1);

    if (!currentPost) {
      return [];
    }

    // Get tags for current post
    const postTags = await db.select()
      .from(schema.postTags)
      .where(eq(schema.postTags.postId, postId));
    const tagList = postTags.map(t => t.tag);

    // Find posts with similar tags or same channel
    // Priority: same tags > same channel > recent
    let similarPosts: typeof postsWithDetails = [];

    if (tagList.length > 0) {
      // Get posts with matching tags
      const postsWithMatchingTags = await db.select({
        postId: schema.postTags.postId,
        tag: schema.postTags.tag,
      })
        .from(schema.postTags)
        .where(
          tagList.length > 0 
            ? or(...tagList.map(tag => like(schema.postTags.tag, `%${tag}%`)))
            : undefined
        );

      const relatedPostIds = [...new Set(postsWithMatchingTags
        .map(p => p.postId)
        .filter(id => id !== postId)
      )];

      if (relatedPostIds.length > 0) {
        similarPosts = await db.select()
          .from(schema.posts)
          .where(
            and(
              eq(schema.posts.channelId, currentPost.channelId),
              ...relatedPostIds.slice(0, 10).map(id => 
                sql`${schema.posts.id} != ${id}`
              )
            )
          )
          .orderBy(desc(schema.posts.viewCount))
          .limit(limit);
      }
    }

    // If not enough similar posts, add recent posts from same channel
    if (similarPosts.length < limit) {
      const existingIds = new Set(similarPosts.map(p => p.id));
      existingIds.add(postId);

      const recentFromChannel = await db.select()
        .from(schema.posts)
        .where(
          and(
            eq(schema.posts.channelId, currentPost.channelId),
            sql`${schema.posts.id} NOT IN (${sql.join(Array.from(existingIds), sql`, `)})`
          )
        )
        .orderBy(desc(schema.posts.createdAt))
        .limit(limit - similarPosts.length);

      similarPosts = [...similarPosts, ...recentFromChannel];
    }

    // Get author and channel info for each post
    const similarWithDetails = await Promise.all(
      similarPosts.slice(0, limit).map(async (post) => {
        const [author] = await db.select({
          id: schema.users.id,
          username: schema.users.username,
          displayName: schema.users.displayName,
          avatar: schema.users.avatar,
        })
          .from(schema.users)
          .where(eq(schema.users.id, post.authorId))
          .limit(1);

        const [channel] = await db.select()
          .from(schema.channels)
          .where(eq(schema.channels.id, post.channelId))
          .limit(1);

        const tags = await db.select()
          .from(schema.postTags)
          .where(eq(schema.postTags.postId, post.id));

        return {
          ...post,
          author,
          channel,
          tags: tags.map(t => t.tag),
        };
      })
    );

    return similarWithDetails;
  },

  /**
   * Update a post
   */
  async update(id: string, data: UpdatePostData, authorId: string) {
    // Check ownership
    const [post] = await db.select()
      .from(schema.posts)
      .where(eq(schema.posts.id, id))
      .limit(1);

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.authorId !== authorId) {
      throw new Error('Not authorized to update this post');
    }

    const [updated] = await db.update(schema.posts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.posts.id, id))
      .returning();

    // Update tags if provided
    if (data.tags !== undefined) {
      // Delete existing tags
      await db.delete(schema.postTags).where(eq(schema.postTags.postId, id));
      // Add new tags
      for (const tag of data.tags) {
        await db.insert(schema.postTags).values({
          id: nanoid(),
          postId: id,
          tag,
        });
      }
    }

    return this.findById(id);
  },

  /**
   * Delete a post
   */
  async delete(id: string, authorId: string) {
    // Check ownership
    const [post] = await db.select()
      .from(schema.posts)
      .where(eq(schema.posts.id, id))
      .limit(1);

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.authorId !== authorId) {
      throw new Error('Not authorized to delete this post');
    }

    await db.delete(schema.posts).where(eq(schema.posts.id, id));

    return { success: true };
  },

  /**
   * Increment view count
   */
  async incrementViewCount(id: string) {
    await db.update(schema.posts)
      .set({
        viewCount: sql`${schema.posts.viewCount} + 1`,
      })
      .where(eq(schema.posts.id, id));
  },

  /**
   * Like a post
   * Awards 2 points to the post author when receiving a like
   */
  async like(postId: string, userId: string) {
    // Get the post to find the author
    const [post] = await db.select()
      .from(schema.posts)
      .where(eq(schema.posts.id, postId))
      .limit(1);

    if (!post) {
      throw new Error('Post not found');
    }

    // Check if already liked
    const [existing] = await db.select()
      .from(schema.postVotes)
      .where(
        and(
          eq(schema.postVotes.postId, postId),
          eq(schema.postVotes.userId, userId)
        )
      )
      .limit(1);

    let isNewLike = false;

    if (existing) {
      if (existing.value === 1) {
        // Already liked, remove like
        await db.delete(schema.postVotes)
          .where(eq(schema.postVotes.id, existing.id));
        await db.update(schema.posts)
          .set({ likeCount: sql`${schema.posts.likeCount} - 1` })
          .where(eq(schema.posts.id, postId));
        return { success: true, liked: false };
      } else {
        // Was disliked, change to like
        await db.update(schema.postVotes)
          .set({ value: 1 })
          .where(eq(schema.postVotes.id, existing.id));
        await db.update(schema.posts)
          .set({
            likeCount: sql`${schema.posts.likeCount} + 1`,
            dislikeCount: sql`${schema.posts.dislikeCount} - 1`,
          })
          .where(eq(schema.posts.id, postId));
        isNewLike = true;
      }
    } else {
      const id = nanoid();
      await db.insert(schema.postVotes).values({
        id,
        postId,
        userId,
        value: 1,
      });

      await db.update(schema.posts)
        .set({ likeCount: sql`${schema.posts.likeCount} + 1` })
        .where(eq(schema.posts.id, postId));
      isNewLike = true;
    }

    // Award points to post author (but not if liking own post)
    if (isNewLike && post.authorId !== userId) {
      try {
        await awardPointsForAction(post.authorId, 'like_received', postId);
      } catch (error) {
        console.error('Failed to award points for like:', error);
      }

      // Send notification for post like
      // Look up liker name
      const [liker] = await db.select({ displayName: schema.users.displayName })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      notificationService.notifyLike(
        post.authorId,
        userId,
        liker?.displayName || '有人',
        'post',
        post.title.slice(0, 30),
        `/posts/${postId}`
      ).catch(err => {
        console.error('Failed to send post like notification:', err);
      });
    }

    return { success: true, liked: true };
  },

  /**
   * Dislike a post
   */
  async dislike(postId: string, userId: string) {
    // Check if already voted
    const [existing] = await db.select()
      .from(schema.postVotes)
      .where(
        and(
          eq(schema.postVotes.postId, postId),
          eq(schema.postVotes.userId, userId)
        )
      )
      .limit(1);

    if (existing) {
      if (existing.value === -1) {
        // Already disliked, remove dislike
        await db.delete(schema.postVotes)
          .where(eq(schema.postVotes.id, existing.id));
        await db.update(schema.posts)
          .set({ dislikeCount: sql`${schema.posts.dislikeCount} - 1` })
          .where(eq(schema.posts.id, postId));
        return { success: true, disliked: false };
      } else {
        // Was liked, change to dislike
        await db.update(schema.postVotes)
          .set({ value: -1 })
          .where(eq(schema.postVotes.id, existing.id));
        await db.update(schema.posts)
          .set({
            likeCount: sql`${schema.posts.likeCount} - 1`,
            dislikeCount: sql`${schema.posts.dislikeCount} + 1`,
          })
          .where(eq(schema.posts.id, postId));
        return { success: true, disliked: true };
      }
    }

    const id = nanoid();
    await db.insert(schema.postVotes).values({
      id,
      postId,
      userId,
      value: -1,
    });

    await db.update(schema.posts)
      .set({ dislikeCount: sql`${schema.posts.dislikeCount} + 1` })
      .where(eq(schema.posts.id, postId));

    return { success: true, disliked: true };
  },

  /**
   * Favorite a post
   */
  async favorite(postId: string, userId: string) {
    // Check if already favorited
    const [existing] = await db.select()
      .from(schema.postFavorites)
      .where(
        and(
          eq(schema.postFavorites.postId, postId),
          eq(schema.postFavorites.userId, userId)
        )
      )
      .limit(1);

    if (existing) {
      return { success: true, favorited: true };
    }

    const id = nanoid();
    await db.insert(schema.postFavorites).values({
      id,
      postId,
      userId,
    });

    return { success: true, favorited: true };
  },

  /**
   * Unfavorite a post
   */
  async unfavorite(postId: string, userId: string) {
    await db.delete(schema.postFavorites)
      .where(
        and(
          eq(schema.postFavorites.postId, postId),
          eq(schema.postFavorites.userId, userId)
        )
      );

    return { success: true, favorited: false };
  },

  /**
   * Check if user has favorited a post
   */
  async isFavorited(postId: string, userId: string) {
    const [favorite] = await db.select()
      .from(schema.postFavorites)
      .where(
        and(
          eq(schema.postFavorites.postId, postId),
          eq(schema.postFavorites.userId, userId)
        )
      )
      .limit(1);

    return !!favorite;
  },

  /**
   * Check if user has liked a post
   */
  async getUserVote(postId: string, userId: string) {
    const [vote] = await db.select()
      .from(schema.postVotes)
      .where(
        and(
          eq(schema.postVotes.postId, postId),
          eq(schema.postVotes.userId, userId)
        )
      )
      .limit(1);

    return vote?.value || 0;
  },

  /**
   * Get user's favorite posts
   */
  async getUserFavorites(userId: string, limit = 20, offset = 0) {
    const favorites = await db.select({
      postId: schema.postFavorites.postId,
      createdAt: schema.postFavorites.createdAt,
    })
      .from(schema.postFavorites)
      .where(eq(schema.postFavorites.userId, userId))
      .orderBy(desc(schema.postFavorites.createdAt))
      .limit(limit)
      .offset(offset);

    const posts = await Promise.all(
      favorites.map(async (fav) => {
        return this.findById(fav.postId);
      })
    );

    return posts.filter(Boolean);
  },

  /**
   * Get recent posts
   */
  async getRecent(limit = 10) {
    const posts = await db.select()
      .from(schema.posts)
      .orderBy(desc(schema.posts.createdAt))
      .limit(limit);

    return Promise.all(
      posts.map(async (post) => {
        const [author] = await db.select({
          id: schema.users.id,
          username: schema.users.username,
          displayName: schema.users.displayName,
          avatar: schema.users.avatar,
        })
          .from(schema.users)
          .where(eq(schema.users.id, post.authorId))
          .limit(1);

        const [channel] = await db.select()
          .from(schema.channels)
          .where(eq(schema.channels.id, post.channelId))
          .limit(1);

        const tags = await db.select()
          .from(schema.postTags)
          .where(eq(schema.postTags.postId, post.id));

        return {
          ...post,
          author,
          channel,
          tags: tags.map(t => t.tag),
        };
      })
    );
  },
};

export default postService;
