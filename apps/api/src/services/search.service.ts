import { db, schema } from '@agenthub/db';
import { eq, like, or, desc, count, and, sql } from 'drizzle-orm';
import { meilisearchService, INDEX_NAMES, type MeiliAgent, type MeiliPost, type MeiliUser } from './meilisearch.service';

export interface SearchResult {
  agents: SearchAgent[];
  posts: SearchPost[];
  users: SearchUser[];
  total: {
    agents: number;
    posts: number;
    users: number;
  };
}

export interface SearchAgent {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  tagline: string | null;
  status: string;
  avgRating: number | null;
  starCount: number;
  viewCount: number;
  createdAt: Date;
  owner: {
    username: string;
    displayName: string | null;
  } | null;
}

export interface SearchPost {
  id: string;
  title: string;
  content: string;
  type: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  author: {
    username: string;
    displayName: string | null;
  } | null;
  channel: {
    name: string;
    slug: string;
  } | null;
}

export interface SearchUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  role: string;
  level: number;
  isVerified: boolean;
  createdAt: Date;
}

export interface SearchOptions {
  query: string;
  type?: 'agents' | 'posts' | 'users' | 'all';
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 20;

/**
 * Unified search across agents, posts, and users (using MeiliSearch if available, fallback to SQL LIKE)
 */
export async function searchWithMeili(
  options: SearchOptions
): Promise<SearchResult> {
  const { query, type = 'all', limit = DEFAULT_LIMIT, offset = 0 } = options;

  if (!query || query.trim().length < 2) {
    return {
      agents: [],
      posts: [],
      users: [],
      total: { agents: 0, posts: 0, users: 0 },
    };
  }

  // Try MeiliSearch first
  if (meilisearchService.isConfigured()) {
    try {
      const results: SearchResult = {
        agents: [],
        posts: [],
        users: [],
        total: { agents: 0, posts: 0, users: 0 },
      };

      if (type === 'all' || type === 'agents') {
        const agentsResult = await meilisearchService.searchAgents(query, { limit, offset });
        results.agents = agentsResult.results.map(a => ({
          id: a.id,
          name: a.name,
          slug: a.slug,
          logo: a.logo,
          tagline: a.tagline,
          status: a.status,
          avgRating: a.avgRating,
          starCount: a.starCount,
          viewCount: a.viewCount,
          createdAt: new Date(a.createdAt),
          owner: {
            username: a.ownerUsername,
            displayName: a.ownerDisplayName,
          },
        }));
        results.total.agents = agentsResult.total;
      }

      if (type === 'all' || type === 'posts') {
        const postsResult = await meilisearchService.searchPosts(query, { limit, offset });
        results.posts = postsResult.results.map(p => ({
          id: p.id,
          title: p.title,
          content: p.content,
          type: p.type,
          viewCount: p.viewCount,
          likeCount: p.likeCount,
          commentCount: p.commentCount,
          createdAt: new Date(p.createdAt),
          author: {
            username: p.authorUsername,
            displayName: p.authorDisplayName,
          },
          channel: {
            name: p.channelName,
            slug: p.channelSlug,
          },
        }));
        results.total.posts = postsResult.total;
      }

      if (type === 'all' || type === 'users') {
        const usersResult = await meilisearchService.searchUsers(query, { limit, offset });
        results.users = usersResult.results.map(u => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          avatar: u.avatar,
          bio: u.bio,
          role: u.role,
          level: u.level,
          isVerified: u.isVerified,
          createdAt: new Date(u.createdAt),
        }));
        results.total.users = usersResult.total;
      }

      return results;
    } catch (error) {
      console.error('[Search] MeiliSearch failed, falling back to SQL:', error);
      // Fall through to SQL search
    }
  }

  // Fallback to SQL LIKE search (original implementation)
  return search(options);
}

/**
 * Unified search across agents, posts, and users
 */
export async function search(
  options: SearchOptions
): Promise<SearchResult> {
  const { query, type = 'all', limit = DEFAULT_LIMIT, offset = 0 } = options;

  if (!query || query.trim().length < 2) {
    return {
      agents: [],
      posts: [],
      users: [],
      total: { agents: 0, posts: 0, users: 0 },
    };
  }

  const searchTerm = `%${query.trim()}%`;
  const results: SearchResult = {
    agents: [],
    posts: [],
    users: [],
    total: { agents: 0, posts: 0, users: 0 },
  };

  // Search Agents
  if (type === 'all' || type === 'agents') {
    const agentsResult = await db
      .select({
        id: schema.agents.id,
        name: schema.agents.name,
        slug: schema.agents.slug,
        logo: schema.agents.logo,
        tagline: schema.agents.tagline,
        status: schema.agents.status,
        avgRating: schema.agents.avgRating,
        starCount: schema.agents.starCount,
        viewCount: schema.agents.viewCount,
        createdAt: schema.agents.createdAt,
        ownerId: schema.agents.ownerId,
      })
      .from(schema.agents)
      .where(
        or(
          like(schema.agents.name, searchTerm),
          like(schema.agents.tagline, searchTerm),
          like(schema.agents.description, searchTerm)
        )
      )
      .orderBy(desc(schema.agents.starCount))
      .limit(limit)
      .offset(offset);

    // Get owner info
    const agentsWithOwner = await Promise.all(
      agentsResult.map(async (agent) => {
        const [ownerUser] = await db
          .select({
            username: schema.users.username,
            displayName: schema.users.displayName,
          })
          .from(schema.users)
          .where(eq(schema.users.id, agent.ownerId));
        return { ...agent, owner: ownerUser ? {
          username: ownerUser.username,
          displayName: ownerUser.displayName,
        } : null };
      })
    );

    // Get total count
    const [totalAgents] = await db
      .select({ count: count() })
      .from(schema.agents)
      .where(
        or(
          like(schema.agents.name, searchTerm),
          like(schema.agents.tagline, searchTerm),
          like(schema.agents.description, searchTerm)
        )
      );

    results.agents = agentsWithOwner;
    results.total.agents = totalAgents?.count || 0;
  }

  // Search Posts
  if (type === 'all' || type === 'posts') {
    const postsResult = await db
      .select({
        id: schema.posts.id,
        title: schema.posts.title,
        content: schema.posts.content,
        type: schema.posts.type,
        viewCount: schema.posts.viewCount,
        likeCount: schema.posts.likeCount,
        commentCount: schema.posts.commentCount,
        createdAt: schema.posts.createdAt,
        authorId: schema.posts.authorId,
        channelId: schema.posts.channelId,
      })
      .from(schema.posts)
      .where(
        or(
          like(schema.posts.title, searchTerm),
          like(schema.posts.content, searchTerm)
        )
      )
      .orderBy(desc(schema.posts.createdAt))
      .limit(limit)
      .offset(offset);

    // Get author and channel info
    const postsWithDetails = await Promise.all(
      postsResult.map(async (post) => {
        const [author] = await db
          .select({
            username: schema.users.username,
            displayName: schema.users.displayName,
          })
          .from(schema.users)
          .where(eq(schema.users.id, post.authorId));

        const [channel] = await db
          .select({
            name: schema.channels.name,
            slug: schema.channels.slug,
          })
          .from(schema.channels)
          .where(eq(schema.channels.id, post.channelId));

        return { ...post, author: author ?? null, channel: channel ?? null };
      })
    );

    // Get total count
    const [totalPosts] = await db
      .select({ count: count() })
      .from(schema.posts)
      .where(
        or(
          like(schema.posts.title, searchTerm),
          like(schema.posts.content, searchTerm)
        )
      );

    results.posts = postsWithDetails;
    results.total.posts = totalPosts?.count || 0;
  }

  // Search Users
  if (type === 'all' || type === 'users') {
    const usersResult = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatar: schema.users.avatar,
        bio: schema.users.bio,
        role: schema.users.role,
        level: schema.users.level,
        isVerified: schema.users.isVerified,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(
        or(
          like(schema.users.username, searchTerm),
          like(schema.users.displayName, searchTerm),
          like(schema.users.bio, searchTerm)
        )
      )
      .orderBy(desc(schema.users.level))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [totalUsers] = await db
      .select({ count: count() })
      .from(schema.users)
      .where(
        or(
          like(schema.users.username, searchTerm),
          like(schema.users.displayName, searchTerm),
          like(schema.users.bio, searchTerm)
        )
      );

    results.users = usersResult;
    results.total.users = totalUsers?.count || 0;
  }

  return results;
}

/**
 * Quick search for autocomplete/typeahead
 */
export async function quickSearch(
  query: string,
  limit: number = 5
): Promise<{
  agents: { id: string; name: string; slug: string; logo: string | null }[];
  posts: { id: string; title: string }[];
  users: { id: string; username: string; displayName: string | null; avatar: string | null }[];
}> {
  if (!query || query.trim().length < 1) {
    return { agents: [], posts: [], users: [] };
  }

  const searchTerm = `%${query.trim()}%`;

  // Quick agents search
  const agents = await db
    .select({
      id: schema.agents.id,
      name: schema.agents.name,
      slug: schema.agents.slug,
      logo: schema.agents.logo,
    })
    .from(schema.agents)
    .where(
      or(
        like(schema.agents.name, searchTerm),
        like(schema.agents.tagline, searchTerm)
      )
    )
    .limit(limit);

  // Quick posts search
  const posts = await db
    .select({
      id: schema.posts.id,
      title: schema.posts.title,
    })
    .from(schema.posts)
    .where(like(schema.posts.title, searchTerm))
    .limit(limit);

  // Quick users search
  const users = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      displayName: schema.users.displayName,
      avatar: schema.users.avatar,
    })
    .from(schema.users)
    .where(
      or(
        like(schema.users.username, searchTerm),
        like(schema.users.displayName, searchTerm)
      )
    )
    .limit(limit);

  return { agents, posts, users };
}
