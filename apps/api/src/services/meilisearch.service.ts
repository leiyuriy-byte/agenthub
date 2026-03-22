/**
 * MeiliSearch Service - Full-text search for AgentHub
 * 
 * MeiliSearch provides fast, typo-tolerant search results.
 * This service manages search indices and document syncing.
 */
import { MeiliSearch, Index } from 'meilisearch';
import { db, schema } from '@agenthub/db';
import { eq, or, like, desc } from 'drizzle-orm';

// MeiliSearch client singleton
let meiliClient: MeiliSearch | null = null;

/**
 * Initialize MeiliSearch client
 */
export function getMeiliClient(): MeiliSearch | null {
  const url = process.env.MEILISEARCH_URL;
  const apiKey = process.env.MEILISEARCH_API_KEY;

  if (!url) {
    console.warn('[MeiliSearch] MEILISEARCH_URL not configured, search will use fallback');
    return null;
  }

  if (!meiliClient) {
    meiliClient = new MeiliSearch({
      host: url,
      apiKey: apiKey || undefined,
    });
    console.log('[MeiliSearch] Client initialized:', url);
  }

  return meiliClient;
}

/**
 * Check if MeiliSearch is configured
 */
export function isMeiliSearchConfigured(): boolean {
  return !!process.env.MEILISEARCH_URL;
}

// Index names
export const INDEX_NAMES = {
  agents: 'agents',
  posts: 'posts',
  users: 'users',
} as const;

/**
 * MeiliSearch document types
 */
export interface MeiliAgent {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  logo: string | null;
  tags: string[];
  ownerId: string;
  ownerUsername: string;
  ownerDisplayName: string | null;
  status: string;
  avgRating: number | null;
  starCount: number;
  viewCount: number;
  createdAt: number;
}

export interface MeiliPost {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string[];
  authorId: string;
  authorUsername: string;
  authorDisplayName: string | null;
  authorAvatar: string | null;
  channelId: string;
  channelName: string;
  channelSlug: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MeiliUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  role: string;
  level: number;
  isVerified: boolean;
  techStack: string[];
  createdAt: number;
}

/**
 * Configure index settings (filterable attributes, sortable, etc.)
 */
async function configureIndex(index: Index, name: string): Promise<void> {
  try {
    switch (name) {
      case INDEX_NAMES.agents:
        await index.updateSettings({
          searchableAttributes: ['name', 'tagline', 'description', 'tags', 'ownerUsername', 'ownerDisplayName'],
          filterableAttributes: ['status', 'ownerId', 'tags', 'avgRating', 'starCount', 'viewCount'],
          sortableAttributes: ['name', 'avgRating', 'starCount', 'viewCount', 'createdAt'],
          rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
        });
        break;
      case INDEX_NAMES.posts:
        await index.updateSettings({
          searchableAttributes: ['title', 'content', 'tags', 'authorUsername', 'authorDisplayName', 'channelName'],
          filterableAttributes: ['type', 'channelId', 'authorId', 'isPinned', 'viewCount', 'likeCount', 'commentCount'],
          sortableAttributes: ['createdAt', 'updatedAt', 'viewCount', 'likeCount', 'commentCount'],
          rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
        });
        break;
      case INDEX_NAMES.users:
        await index.updateSettings({
          searchableAttributes: ['username', 'displayName', 'bio', 'techStack'],
          filterableAttributes: ['role', 'level', 'isVerified'],
          sortableAttributes: ['level', 'createdAt'],
          rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
        });
        break;
    }
    console.log(`[MeiliSearch] Index ${name} configured`);
  } catch (error) {
    console.error(`[MeiliSearch] Failed to configure index ${name}:`, error);
  }
}

/**
 * Initialize MeiliSearch indices
 */
export async function initializeMeiliSearch(): Promise<void> {
  const client = getMeiliClient();
  if (!client) {
    console.log('[MeiliSearch] Not configured, skipping initialization');
    return;
  }

  try {
    // Create or get indices
    for (const name of Object.values(INDEX_NAMES)) {
      try {
        const index = await client.getIndex(name).catch(() => null);
        if (!index) {
          await client.createIndex(name, { primaryKey: 'id' });
          console.log(`[MeiliSearch] Created index: ${name}`);
        }
        // Configure the index
        const idx = await client.getIndex(name);
        await configureIndex(idx, name);
      } catch (error) {
        console.error(`[MeiliSearch] Error with index ${name}:`, error);
      }
    }
    console.log('[MeiliSearch] Initialization complete');
  } catch (error) {
    console.error('[MeiliSearch] Initialization failed:', error);
  }
}

/**
 * Sync all data to MeiliSearch indices
 */
export async function syncAllToMeiliSearch(): Promise<void> {
  const client = getMeiliClient();
  if (!client) {
    console.log('[MeiliSearch] Not configured, skipping sync');
    return;
  }

  console.log('[MeiliSearch] Starting full sync...');

  // Sync Agents
  await syncAgentsToMeiliSearch();
  
  // Sync Posts
  await syncPostsToMeiliSearch();
  
  // Sync Users
  await syncUsersToMeiliSearch();

  console.log('[MeiliSearch] Full sync complete');
}

/**
 * Sync agents to MeiliSearch
 */
export async function syncAgentsToMeiliSearch(): Promise<number> {
  const client = getMeiliClient();
  if (!client) return 0;

  try {
    const agents = await db
      .select({
        id: schema.agents.id,
        name: schema.agents.name,
        slug: schema.agents.slug,
        tagline: schema.agents.tagline,
        description: schema.agents.description,
        logo: schema.agents.logo,
        tags: schema.agents.tags,
        ownerId: schema.agents.ownerId,
        status: schema.agents.status,
        avgRating: schema.agents.avgRating,
        starCount: schema.agents.starCount,
        viewCount: schema.agents.viewCount,
        createdAt: schema.agents.createdAt,
      })
      .from(schema.agents)
      .where(eq(schema.agents.status, 'published'));

    // Get owner info
    const agentsWithOwner = await Promise.all(
      agents.map(async (agent) => {
        const [owner] = await db
          .select({
            username: schema.users.username,
            displayName: schema.users.displayName,
          })
          .from(schema.users)
          .where(eq(schema.users.id, agent.ownerId));
        
        const tags = agent.tags ? JSON.parse(agent.tags) : [];
        
        return {
          id: agent.id,
          name: agent.name,
          slug: agent.slug,
          tagline: agent.tagline || '',
          description: agent.description || '',
          logo: agent.logo,
          tags,
          ownerId: agent.ownerId,
          ownerUsername: owner?.username || '',
          ownerDisplayName: owner?.displayName || null,
          status: agent.status,
          avgRating: agent.avgRating,
          starCount: agent.starCount,
          viewCount: agent.viewCount,
          createdAt: new Date(agent.createdAt).getTime(),
        } as MeiliAgent;
      })
    );

    const index = await client.getIndex(INDEX_NAMES.agents);
    const task = await index.addDocuments(agentsWithOwner);
    console.log(`[MeiliSearch] Synced ${agentsWithOwner.length} agents, task: ${task.taskUid}`);
    
    return agentsWithOwner.length;
  } catch (error) {
    console.error('[MeiliSearch] Failed to sync agents:', error);
    return 0;
  }
}

/**
 * Sync posts to MeiliSearch
 */
export async function syncPostsToMeiliSearch(): Promise<number> {
  const client = getMeiliClient();
  if (!client) return 0;

  try {
    const posts = await db
      .select({
        id: schema.posts.id,
        title: schema.posts.title,
        content: schema.posts.content,
        type: schema.posts.type,
        tags: schema.posts.tags,
        authorId: schema.posts.authorId,
        channelId: schema.posts.channelId,
        viewCount: schema.posts.viewCount,
        likeCount: schema.posts.likeCount,
        commentCount: schema.posts.commentCount,
        isPinned: schema.posts.isPinned,
        createdAt: schema.posts.createdAt,
        updatedAt: schema.posts.updatedAt,
      })
      .from(schema.posts);

    // Get author and channel info
    const postsWithDetails = await Promise.all(
      posts.map(async (post) => {
        const [author] = await db
          .select({
            username: schema.users.username,
            displayName: schema.users.displayName,
            avatar: schema.users.avatar,
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

        const tags = post.tags ? JSON.parse(post.tags) : [];

        return {
          id: post.id,
          title: post.title,
          content: post.content.substring(0, 5000), // Limit content length
          type: post.type,
          tags,
          authorId: post.authorId,
          authorUsername: author?.username || '',
          authorDisplayName: author?.displayName || null,
          authorAvatar: author?.avatar || null,
          channelId: post.channelId,
          channelName: channel?.name || '',
          channelSlug: channel?.slug || '',
          viewCount: post.viewCount,
          likeCount: post.likeCount,
          commentCount: post.commentCount,
          isPinned: !!post.isPinned,
          createdAt: new Date(post.createdAt).getTime(),
          updatedAt: new Date(post.updatedAt).getTime(),
        } as MeiliPost;
      })
    );

    const index = await client.getIndex(INDEX_NAMES.posts);
    const task = await index.addDocuments(postsWithDetails);
    console.log(`[MeiliSearch] Synced ${postsWithDetails.length} posts, task: ${task.taskUid}`);
    
    return postsWithDetails.length;
  } catch (error) {
    console.error('[MeiliSearch] Failed to sync posts:', error);
    return 0;
  }
}

/**
 * Sync users to MeiliSearch
 */
export async function syncUsersToMeiliSearch(): Promise<number> {
  const client = getMeiliClient();
  if (!client) return 0;

  try {
    const users = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatar: schema.users.avatar,
        bio: schema.users.bio,
        role: schema.users.role,
        level: schema.users.level,
        isVerified: schema.users.isVerified,
        techStack: schema.users.techStack,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users);

    const usersData = users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      role: user.role,
      level: user.level,
      isVerified: user.isVerified,
      techStack: user.techStack ? JSON.parse(user.techStack) : [],
      createdAt: new Date(user.createdAt).getTime(),
    } as MeiliUser));

    const index = await client.getIndex(INDEX_NAMES.users);
    const task = await index.addDocuments(usersData);
    console.log(`[MeiliSearch] Synced ${usersData.length} users, task: ${task.taskUid}`);
    
    return usersData.length;
  } catch (error) {
    console.error('[MeiliSearch] Failed to sync users:', error);
    return 0;
  }
}

/**
 * Search agents in MeiliSearch
 */
export async function searchAgentsMeili(
  query: string,
  options?: { limit?: number; offset?: number; filters?: string }
): Promise<{ results: MeiliAgent[]; total: number }> {
  const client = getMeiliClient();
  if (!client) return { results: [], total: 0 };

  try {
    const index = await client.getIndex(INDEX_NAMES.agents);
    const searchResult = await index.search<MeiliAgent>(query, {
      limit: options?.limit || 20,
      offset: options?.offset || 0,
      filter: options?.filters,
      attributesToRetrieve: ['id', 'name', 'slug', 'logo', 'tagline', 'ownerUsername', 'ownerDisplayName', 'avgRating', 'starCount', 'viewCount', 'createdAt'],
    });

    return {
      results: searchResult.hits,
      total: searchResult.estimatedTotalHits || 0,
    };
  } catch (error) {
    console.error('[MeiliSearch] Agent search failed:', error);
    return { results: [], total: 0 };
  }
}

/**
 * Search posts in MeiliSearch
 */
export async function searchPostsMeili(
  query: string,
  options?: { limit?: number; offset?: number; filters?: string }
): Promise<{ results: MeiliPost[]; total: number }> {
  const client = getMeiliClient();
  if (!client) return { results: [], total: 0 };

  try {
    const index = await client.getIndex(INDEX_NAMES.posts);
    const searchResult = await index.search<MeiliPost>(query, {
      limit: options?.limit || 20,
      offset: options?.offset || 0,
      filter: options?.filters,
      attributesToRetrieve: ['id', 'title', 'content', 'type', 'authorUsername', 'authorDisplayName', 'channelName', 'channelSlug', 'viewCount', 'likeCount', 'commentCount', 'createdAt'],
    });

    return {
      results: searchResult.hits,
      total: searchResult.estimatedTotalHits || 0,
    };
  } catch (error) {
    console.error('[MeiliSearch] Post search failed:', error);
    return { results: [], total: 0 };
  }
}

/**
 * Search users in MeiliSearch
 */
export async function searchUsersMeili(
  query: string,
  options?: { limit?: number; offset?: number }
): Promise<{ results: MeiliUser[]; total: number }> {
  const client = getMeiliClient();
  if (!client) return { results: [], total: 0 };

  try {
    const index = await client.getIndex(INDEX_NAMES.users);
    const searchResult = await index.search<MeiliUser>(query, {
      limit: options?.limit || 20,
      offset: options?.offset || 0,
      attributesToRetrieve: ['id', 'username', 'displayName', 'avatar', 'bio', 'role', 'level', 'isVerified', 'createdAt'],
    });

    return {
      results: searchResult.hits,
      total: searchResult.estimatedTotalHits || 0,
    };
  } catch (error) {
    console.error('[MeiliSearch] User search failed:', error);
    return { results: [], total: 0 };
  }
}

/**
 * Add or update a single agent in MeiliSearch
 */
export async function indexAgentMeili(agentId: string): Promise<void> {
  const client = getMeiliClient();
  if (!client) return;

  try {
    const [agent] = await db
      .select({
        id: schema.agents.id,
        name: schema.agents.name,
        slug: schema.agents.slug,
        tagline: schema.agents.tagline,
        description: schema.agents.description,
        logo: schema.agents.logo,
        tags: schema.agents.tags,
        ownerId: schema.agents.ownerId,
        status: schema.agents.status,
        avgRating: schema.agents.avgRating,
        starCount: schema.agents.starCount,
        viewCount: schema.agents.viewCount,
        createdAt: schema.agents.createdAt,
      })
      .from(schema.agents)
      .where(eq(schema.agents.id, agentId));

    if (!agent || agent.status !== 'published') return;

    const [owner] = await db
      .select({
        username: schema.users.username,
        displayName: schema.users.displayName,
      })
      .from(schema.users)
      .where(eq(schema.users.id, agent.ownerId));

    const tags = agent.tags ? JSON.parse(agent.tags) : [];

    const document: MeiliAgent = {
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      tagline: agent.tagline || '',
      description: agent.description || '',
      logo: agent.logo,
      tags,
      ownerId: agent.ownerId,
      ownerUsername: owner?.username || '',
      ownerDisplayName: owner?.displayName || null,
      status: agent.status,
      avgRating: agent.avgRating,
      starCount: agent.starCount,
      viewCount: agent.viewCount,
      createdAt: new Date(agent.createdAt).getTime(),
    };

    const index = await client.getIndex(INDEX_NAMES.agents);
    await index.addDocuments([document]);
  } catch (error) {
    console.error('[MeiliSearch] Failed to index agent:', error);
  }
}

/**
 * Add or update a single post in MeiliSearch
 */
export async function indexPostMeili(postId: string): Promise<void> {
  const client = getMeiliClient();
  if (!client) return;

  try {
    const [post] = await db
      .select({
        id: schema.posts.id,
        title: schema.posts.title,
        content: schema.posts.content,
        type: schema.posts.type,
        tags: schema.posts.tags,
        authorId: schema.posts.authorId,
        channelId: schema.posts.channelId,
        viewCount: schema.posts.viewCount,
        likeCount: schema.posts.likeCount,
        commentCount: schema.posts.commentCount,
        isPinned: schema.posts.isPinned,
        createdAt: schema.posts.createdAt,
        updatedAt: schema.posts.updatedAt,
      })
      .from(schema.posts)
      .where(eq(schema.posts.id, postId));

    if (!post) return;

    const [author] = await db
      .select({
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatar: schema.users.avatar,
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

    const tags = post.tags ? JSON.parse(post.tags) : [];

    const document: MeiliPost = {
      id: post.id,
      title: post.title,
      content: post.content.substring(0, 5000),
      type: post.type,
      tags,
      authorId: post.authorId,
      authorUsername: author?.username || '',
      authorDisplayName: author?.displayName || null,
      authorAvatar: author?.avatar || null,
      channelId: post.channelId,
      channelName: channel?.name || '',
      channelSlug: channel?.slug || '',
      viewCount: post.viewCount,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      isPinned: !!post.isPinned,
      createdAt: new Date(post.createdAt).getTime(),
      updatedAt: new Date(post.updatedAt).getTime(),
    };

    const index = await client.getIndex(INDEX_NAMES.posts);
    await index.addDocuments([document]);
  } catch (error) {
    console.error('[MeiliSearch] Failed to index post:', error);
  }
}

/**
 * Add or update a single user in MeiliSearch
 */
export async function indexUserMeili(userId: string): Promise<void> {
  const client = getMeiliClient();
  if (!client) return;

  try {
    const [user] = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatar: schema.users.avatar,
        bio: schema.users.bio,
        role: schema.users.role,
        level: schema.users.level,
        isVerified: schema.users.isVerified,
        techStack: schema.users.techStack,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    if (!user) return;

    const document: MeiliUser = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      role: user.role,
      level: user.level,
      isVerified: user.isVerified,
      techStack: user.techStack ? JSON.parse(user.techStack) : [],
      createdAt: new Date(user.createdAt).getTime(),
    };

    const index = await client.getIndex(INDEX_NAMES.users);
    await index.addDocuments([document]);
  } catch (error) {
    console.error('[MeiliSearch] Failed to index user:', error);
  }
}

/**
 * Delete a document from MeiliSearch
 */
export async function deleteFromMeiliIndex(indexName: string, docId: string): Promise<void> {
  const client = getMeiliClient();
  if (!client) return;

  try {
    const index = await client.getIndex(indexName);
    await index.deleteDocument(docId);
  } catch (error) {
    console.error(`[MeiliSearch] Failed to delete from ${indexName}:`, error);
  }
}

export const meilisearchService = {
  getClient: getMeiliClient,
  isConfigured: isMeiliSearchConfigured,
  initialize: initializeMeiliSearch,
  syncAll: syncAllToMeiliSearch,
  syncAgents: syncAgentsToMeiliSearch,
  syncPosts: syncPostsToMeiliSearch,
  syncUsers: syncUsersToMeiliSearch,
  searchAgents: searchAgentsMeili,
  searchPosts: searchPostsMeili,
  searchUsers: searchUsersMeili,
  indexAgent: indexAgentMeili,
  indexPost: indexPostMeili,
  indexUser: indexUserMeili,
  deleteFromIndex: deleteFromMeiliIndex,
};

export default meilisearchService;
