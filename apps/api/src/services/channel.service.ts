import { eq, sql } from 'drizzle-orm';
import { db, schema } from '@agenthub/db';
import { nanoid } from 'nanoid';

export interface CreateChannelData {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  type?: 'public' | 'private';
  isDefault?: boolean;
  sortOrder?: number;
}

export interface UpdateChannelData {
  name?: string;
  description?: string;
  icon?: string;
  type?: 'public' | 'private';
  isDefault?: boolean;
  sortOrder?: number;
}

/**
 * Channel service - handles Channel CRUD operations
 */
export const channelService = {
  /**
   * Create a new channel
   */
  async create(data: CreateChannelData) {
    const id = nanoid();

    const [channel] = await db.insert(schema.channels).values({
      id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      icon: data.icon,
      type: data.type || 'public',
      isDefault: data.isDefault || false,
      sortOrder: data.sortOrder ?? 0,
    }).returning();

    return channel;
  },

  /**
   * Get channel by ID
   */
  async findById(id: string) {
    const [channel] = await db.select()
      .from(schema.channels)
      .where(eq(schema.channels.id, id))
      .limit(1);

    if (!channel) return null;

    // Get post count
    const [postCount] = await db.select({
      count: sql<number>`count(*)`,
    })
      .from(schema.posts)
      .where(eq(schema.posts.channelId, id));

    return {
      ...channel,
      postCount: postCount?.count || 0,
    };
  },

  /**
   * Get channel by slug
   */
  async findBySlug(slug: string) {
    const [channel] = await db.select()
      .from(schema.channels)
      .where(eq(schema.channels.slug, slug))
      .limit(1);

    if (!channel) return null;

    const result = await this.findById(channel.id);
    if (!result) return null;

    return result;
  },

  /**
   * List all channels
   */
  async list() {
    const channels = await db.select()
      .from(schema.channels)
      .orderBy(schema.channels.sortOrder);

    // Get post count for each channel
    const channelsWithCounts = await Promise.all(
      channels.map(async (channel) => {
        const [postCount] = await db.select({
          count: sql<number>`count(*)`,
        })
          .from(schema.posts)
          .where(eq(schema.posts.channelId, channel.id));

        return {
          ...channel,
          postCount: postCount?.count ?? 0,
        };
      })
    );

    return channelsWithCounts;
  },

  /**
   * Update a channel
   */
  async update(id: string, data: UpdateChannelData) {
    const [channel] = await db.update(schema.channels)
      .set(data)
      .where(eq(schema.channels.id, id))
      .returning();

    return channel;
  },

  /**
   * Delete a channel
   */
  async delete(id: string) {
    await db.delete(schema.channels).where(eq(schema.channels.id, id));
    return { success: true };
  },

  /**
   * Seed default channels
   */
  async seedDefaultChannels() {
    const defaultChannels = [
      { name: '综合讨论', slug: 'general', description: '通用话题讨论', icon: '💬', isDefault: true },
      { name: '技术分享', slug: 'tech', description: '技术文章和经验分享', icon: '💻', isDefault: true },
      { name: '问答求助', slug: 'qna', description: '问题解答和求助区', icon: '❓', isDefault: true },
      { name: '项目展示', slug: 'showcase', description: '展示你的 AI Agent 项目', icon: '🚀', isDefault: true },
      { name: '资源工具', slug: 'resources', description: '工具和资源推荐', icon: '🛠️', isDefault: true },
    ];

    for (const channelData of defaultChannels) {
      const existing = await this.findBySlug(channelData.slug);
      if (!existing) {
        await this.create({
          name: channelData.name,
          slug: channelData.slug,
          description: channelData.description,
          icon: channelData.icon,
          isDefault: channelData.isDefault,
          sortOrder: defaultChannels.indexOf(channelData),
        });
      }
    }
  },
};

export default channelService;
