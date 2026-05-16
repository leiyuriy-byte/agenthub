import { eq, desc, inArray } from 'drizzle-orm';
import { db, schema } from '@agenthub/db';

export interface FeedItem {
  id: string;
  type: 'agent' | 'post' | 'comment';
  createdAt: Date;
  user: {
    id: string;
    username: string | undefined;
    displayName: string | undefined;
    avatar: string | null | undefined;
  };
  data: {
    // Agent data
    agentId?: string;
    agentName?: string;
    agentTagline?: string;
    agentLogo?: string;
    // Post data
    postId?: string;
    postTitle?: string;
    postExcerpt?: string;
    channelName?: string;
    channelIcon?: string;
    // Comment data
    commentId?: string;
    commentContent?: string;
    targetType?: 'agent' | 'post';
    targetId?: string;
    targetTitle?: string;
  };
}

/**
 * Feed service - Get personalized feed for users
 */
export const feedService = {
  /**
   * Get feed for a user (activities from followed users)
   */
  async getFeed(userId: string, limit = 20, offset = 0): Promise<FeedItem[]> {
    // Get list of users that this user follows
    const following = await db.select({ followingId: schema.follows.followingId })
      .from(schema.follows)
      .where(eq(schema.follows.followerId, userId));

    const followedUserIds = following.map(f => f.followingId);

    // If not following anyone, return empty
    if (followedUserIds.length === 0) {
      return [];
    }

    // Get latest activities from followed users
    const feedItems: FeedItem[] = [];

    // 1. Get latest Agents from followed users
    const latestAgents = await db.select({
      id: schema.agents.id,
      name: schema.agents.name,
      tagline: schema.agents.tagline,
      logo: schema.agents.logo,
      createdAt: schema.agents.createdAt,
      ownerId: schema.agents.ownerId,
      username: schema.users.username,
      displayName: schema.users.displayName,
      avatar: schema.users.avatar,
    })
      .from(schema.agents)
      .innerJoin(schema.users, eq(schema.agents.ownerId, schema.users.id))
      .where(inArray(schema.agents.ownerId, followedUserIds))
      .orderBy(desc(schema.agents.createdAt))
      .limit(Math.floor(limit / 3) + 1);

    latestAgents.forEach(agent => {
      feedItems.push({
        id: `agent_${agent.id}`,
        type: 'agent',
        createdAt: agent.createdAt,
        user: {
          id: agent.ownerId,
          username: agent.username || undefined,
          displayName: agent.displayName || undefined,
          avatar: agent.avatar || undefined,
        },
        data: {
          agentId: agent.id,
          agentName: agent.name || undefined,
          agentTagline: agent.tagline || undefined,
          agentLogo: agent.logo || undefined,
        },
      });
    });

    // 2. Get latest Posts from followed users
    const latestPosts = await db.select({
      id: schema.posts.id,
      title: schema.posts.title,
      content: schema.posts.content,
      createdAt: schema.posts.createdAt,
      authorId: schema.posts.authorId,
      username: schema.users.username,
      displayName: schema.users.displayName,
      avatar: schema.users.avatar,
      channelName: schema.channels.name,
      channelIcon: schema.channels.icon,
    })
      .from(schema.posts)
      .innerJoin(schema.users, eq(schema.posts.authorId, schema.users.id))
      .leftJoin(schema.channels, eq(schema.posts.channelId, schema.channels.id))
      .where(inArray(schema.posts.authorId, followedUserIds))
      .orderBy(desc(schema.posts.createdAt))
      .limit(Math.floor(limit / 3) + 1);

    latestPosts.forEach(post => {
      // Extract excerpt from content
      const excerpt = post.content 
        ? post.content.replace(/[#*`[]]/g, '').slice(0, 150) + (post.content.length > 150 ? '...' : '')
        : '';
      
      feedItems.push({
        id: `post_${post.id}`,
        type: 'post',
        createdAt: post.createdAt,
        user: {
          id: post.authorId,
          username: post.username || undefined,
          displayName: post.displayName || undefined,
          avatar: post.avatar || undefined,
        },
        data: {
          postId: post.id,
          postTitle: post.title || undefined,
          postExcerpt: excerpt,
          channelName: post.channelName || undefined,
          channelIcon: post.channelIcon || undefined,
        },
      });
    });

    // 3. Get latest Comments from followed users (via posts)
    const latestCommentsWithPosts = await db.select({
      id: schema.comments.id,
      content: schema.comments.content,
      createdAt: schema.comments.createdAt,
      authorId: schema.comments.authorId,
      postId: schema.comments.postId,
      username: schema.users.username,
      displayName: schema.users.displayName,
      avatar: schema.users.avatar,
      postTitle: schema.posts.title,
    })
      .from(schema.comments)
      .innerJoin(schema.users, eq(schema.comments.authorId, schema.users.id))
      .innerJoin(schema.posts, eq(schema.comments.postId, schema.posts.id))
      .where(inArray(schema.comments.authorId, followedUserIds))
      .orderBy(desc(schema.comments.createdAt))
      .limit(Math.floor(limit / 3) + 1);

    for (const comment of latestCommentsWithPosts) {
      feedItems.push({
        id: `comment_${comment.id}`,
        type: 'comment',
        createdAt: comment.createdAt,
        user: {
          id: comment.authorId,
          username: comment.username || undefined,
          displayName: comment.displayName || undefined,
          avatar: comment.avatar || undefined,
        },
        data: {
          commentId: comment.id,
          commentContent: comment.content?.slice(0, 200) + (comment.content && comment.content.length > 200 ? '...' : ''),
          targetType: 'post' as const,
          targetId: comment.postId,
          targetTitle: comment.postTitle || '',
        },
      });
    }

    // Sort all items by date and paginate
    feedItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return feedItems.slice(offset, offset + limit);
  },

  /**
   * Get global feed (for discover)
   */
  async getGlobalFeed(limit = 20, offset = 0): Promise<FeedItem[]> {
    const feedItems: FeedItem[] = [];

    // Get latest published Agents
    const latestAgents = await db.select({
      id: schema.agents.id,
      name: schema.agents.name,
      tagline: schema.agents.tagline,
      logo: schema.agents.logo,
      createdAt: schema.agents.createdAt,
      ownerId: schema.agents.ownerId,
      username: schema.users.username,
      displayName: schema.users.displayName,
      avatar: schema.users.avatar,
    })
      .from(schema.agents)
      .innerJoin(schema.users, eq(schema.agents.ownerId, schema.users.id))
      .where(eq(schema.agents.status, 'published'))
      .orderBy(desc(schema.agents.createdAt))
      .limit(Math.floor(limit / 3) + 1);

    latestAgents.forEach(agent => {
      feedItems.push({
        id: `agent_${agent.id}`,
        type: 'agent',
        createdAt: agent.createdAt,
        user: {
          id: agent.ownerId,
          username: agent.username || undefined,
          displayName: agent.displayName || undefined,
          avatar: agent.avatar || undefined,
        },
        data: {
          agentId: agent.id,
          agentName: agent.name || undefined,
          agentTagline: agent.tagline || undefined,
          agentLogo: agent.logo || undefined,
        },
      });
    });

    // Get latest Posts
    const latestPosts = await db.select({
      id: schema.posts.id,
      title: schema.posts.title,
      content: schema.posts.content,
      createdAt: schema.posts.createdAt,
      authorId: schema.posts.authorId,
      username: schema.users.username,
      displayName: schema.users.displayName,
      avatar: schema.users.avatar,
      channelName: schema.channels.name,
      channelIcon: schema.channels.icon,
    })
      .from(schema.posts)
      .innerJoin(schema.users, eq(schema.posts.authorId, schema.users.id))
      .leftJoin(schema.channels, eq(schema.posts.channelId, schema.channels.id))
      .orderBy(desc(schema.posts.createdAt))
      .limit(Math.floor(limit / 3) + 1);

    latestPosts.forEach(post => {
      const excerpt = post.content 
        ? post.content.replace(/[#*`[]]/g, '').slice(0, 150) + (post.content.length > 150 ? '...' : '')
        : '';
      
      feedItems.push({
        id: `post_${post.id}`,
        type: 'post',
        createdAt: post.createdAt,
        user: {
          id: post.authorId,
          username: post.username || undefined,
          displayName: post.displayName || undefined,
          avatar: post.avatar || undefined,
        },
        data: {
          postId: post.id,
          postTitle: post.title || undefined,
          postExcerpt: excerpt,
          channelName: post.channelName || undefined,
          channelIcon: post.channelIcon || undefined,
        },
      });
    });

    // Get latest Comments
    const latestCommentsWithPosts = await db.select({
      id: schema.comments.id,
      content: schema.comments.content,
      createdAt: schema.comments.createdAt,
      authorId: schema.comments.authorId,
      postId: schema.comments.postId,
      username: schema.users.username,
      displayName: schema.users.displayName,
      avatar: schema.users.avatar,
      postTitle: schema.posts.title,
    })
      .from(schema.comments)
      .innerJoin(schema.users, eq(schema.comments.authorId, schema.users.id))
      .innerJoin(schema.posts, eq(schema.comments.postId, schema.posts.id))
      .orderBy(desc(schema.comments.createdAt))
      .limit(Math.floor(limit / 3) + 1);

    for (const comment of latestCommentsWithPosts) {
      feedItems.push({
        id: `comment_${comment.id}`,
        type: 'comment',
        createdAt: comment.createdAt,
        user: {
          id: comment.authorId,
          username: comment.username || undefined,
          displayName: comment.displayName || undefined,
          avatar: comment.avatar || undefined,
        },
        data: {
          commentId: comment.id,
          commentContent: comment.content?.slice(0, 200) + (comment.content && comment.content.length > 200 ? '...' : ''),
          targetType: 'post' as const,
          targetId: comment.postId,
          targetTitle: comment.postTitle || '',
        },
      });
    }

    feedItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return feedItems.slice(offset, offset + limit);
  },
};

export default feedService;
