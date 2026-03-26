import { eq, and, desc } from 'drizzle-orm';
import { db, schema } from '@agenthub/db';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { notificationService } from './notification.service.js';

export interface CreateUserData {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

export interface UpdateUserData {
  displayName?: string;
  bio?: string;
  avatar?: string;
}

/**
 * User service - handles user-related database operations
 */
export const userService = {
  /**
   * Create a new user
   */
  async create(data: CreateUserData) {
    const { password, ...rest } = data;
    const passwordHash = await bcrypt.hash(password, 12);
    const id = nanoid();
    
    const [user] = await db.insert(schema.users).values({
      id,
      email: rest.email.toLowerCase(),
      username: rest.username.toLowerCase(),
      passwordHash,
      displayName: rest.displayName || rest.username,
    }).returning();
    
    return user;
  },

  /**
   * Find user by ID
   */
  async findById(id: string) {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user || null;
  },

  /**
   * Find user by email
   */
  async findByEmail(email: string) {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase()));
    return user || null;
  },

  /**
   * Find user by username
   */
  async findByUsername(username: string) {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username.toLowerCase()));
    return user || null;
  },

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserData) {
    const [user] = await db.update(schema.users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning();
    return user;
  },

  /**
   * Verify password
   */
  async verifyPassword(user: typeof schema.users.$inferSelect, password: string) {
    if (!user.passwordHash) return false;
    return bcrypt.compare(password, user.passwordHash);
  },

  /**
   * Update last login time
   */
  async updateLastLogin(id: string) {
    await db.update(schema.users)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.users.id, id));
  },

  /**
   * Get user profile with stats
   */
  async getProfile(userId: string) {
    const user = await this.findById(userId);
    if (!user) return null;

    // Get counts
    const [agentCount] = await db.select({ count: schema.agentCategories.id })
      .from(schema.agents)
      .where(eq(schema.agents.ownerId, userId));
    
    const [postCount] = await db.select({ count: schema.channels.id })
      .from(schema.posts)
      .where(eq(schema.posts.authorId, userId));
    
    const [followerCount] = await db.select({ count: schema.follows.id })
      .from(schema.follows)
      .where(eq(schema.follows.followingId, userId));
    
    const [followingCount] = await db.select({ count: schema.follows.id })
      .from(schema.follows)
      .where(eq(schema.follows.followerId, userId));

    // Get social links
    const socialLinks = await db.select()
      .from(schema.userSocialLinks)
      .where(eq(schema.userSocialLinks.userId, userId));

    // Get tags
    const tags = await db.select()
      .from(schema.userTags)
      .where(eq(schema.userTags.userId, userId));

    // Get badges
    const badges = await db.select()
      .from(schema.userBadges)
      .where(eq(schema.userBadges.userId, userId));

    return {
      ...user,
      stats: {
        agentCount: agentCount?.count || 0,
        postCount: postCount?.count || 0,
        followerCount: followerCount?.count || 0,
        followingCount: followingCount?.count || 0,
      },
      socialLinks: socialLinks.map(link => ({
        platform: link.platform,
        url: link.url,
      })),
      tags: tags.map(t => t.tag),
      badges: badges.map(b => b.badge),
    };
  },

  /**
   * Add social link
   */
  async addSocialLink(userId: string, platform: string, url: string) {
    const id = nanoid();
    const [link] = await db.insert(schema.userSocialLinks).values({
      id,
      userId,
      platform,
      url,
    }).returning();
    return link;
  },

  /**
   * Remove social link
   */
  async removeSocialLink(userId: string, platform: string) {
    await db.delete(schema.userSocialLinks)
      .where(and(
        eq(schema.userSocialLinks.userId, userId),
        eq(schema.userSocialLinks.platform, platform)
      ));
  },

  /**
   * Add user tag
   */
  async addTag(userId: string, tag: string) {
    const id = nanoid();
    const [userTag] = await db.insert(schema.userTags).values({
      id,
      userId,
      tag,
    }).returning();
    return userTag;
  },

  /**
   * Follow user
   */
  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }
    
    const id = nanoid();
    const [follow] = await db.insert(schema.follows).values({
      id,
      followerId,
      followingId,
    }).onConflictDoNothing().returning();

    // Send notification to the followed user
    if (follow) {
      // Get follower info for notification
      const [follower] = await db.select({ displayName: schema.users.displayName })
        .from(schema.users)
        .where(eq(schema.users.id, followerId))
        .limit(1);

      notificationService.notifyNewFollower(
        followingId,
        followerId,
        follower?.displayName || '有人'
      ).catch(err => {
        console.error('Failed to send follow notification:', err);
      });
    }

    return follow || null;
  },

  /**
   * Unfollow user
   */
  async unfollow(followerId: string, followingId: string) {
    await db.delete(schema.follows)
      .where(and(
        eq(schema.follows.followerId, followerId),
        eq(schema.follows.followingId, followingId)
      ));
  },

  /**
   * Get followers
   */
  async getFollowers(userId: string, limit = 20, offset = 0) {
    const results = await db.select({
      user: schema.users,
      follow: schema.follows,
    })
      .from(schema.follows)
      .innerJoin(schema.users, eq(schema.follows.followerId, schema.users.id))
      .where(eq(schema.follows.followingId, userId))
      .orderBy(desc(schema.follows.createdAt))
      .limit(limit)
      .offset(offset);
    
    return results.map(r => r.user);
  },

  /**
   * Get following
   */
  async getFollowing(userId: string, limit = 20, offset = 0) {
    const results = await db.select({
      user: schema.users,
      follow: schema.follows,
    })
      .from(schema.follows)
      .innerJoin(schema.users, eq(schema.follows.followingId, schema.users.id))
      .where(eq(schema.follows.followerId, userId))
      .orderBy(desc(schema.follows.createdAt))
      .limit(limit)
      .offset(offset);
    
    return results.map(r => r.user);
  },

  /**
   * Check if following
   */
  async isFollowing(followerId: string, followingId: string) {
    const [follow] = await db.select()
      .from(schema.follows)
      .where(and(
        eq(schema.follows.followerId, followerId),
        eq(schema.follows.followingId, followingId)
      ));
    return !!follow;
  },

  /**
   * Get user list (for admin)
   */
  async list(limit = 20, offset = 0) {
    return db.select()
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt))
      .limit(limit)
      .offset(offset);
  },

  /**
   * Update user role (for admin)
   */
  async updateRole(userId: string, role: 'user' | 'moderator' | 'admin') {
    const [user] = await db.update(schema.users)
      .set({ role, updatedAt: new Date() })
      .where(eq(schema.users.id, userId))
      .returning();
    return user;
  },

  /**
   * Delete user (for admin)
   */
  async delete(userId: string) {
    await db.delete(schema.users).where(eq(schema.users.id, userId));
  },
};

export default userService;
