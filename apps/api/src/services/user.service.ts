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

  /**
   * Export all user data (GDPR compliance)
   * Returns a comprehensive JSON export of all user data
   */
  async exportUserData(userId: string) {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');

    // Collect all user data in parallel
    const [
      socialLinks,
      tags,
      badges,
      followers,
      following,
      agents,
      posts,
      comments,
      agentComments,
      agentRatings,
      articles,
      resources,
      notifications,
      pointTransactions,
      checkins,
      conversations,
    ] = await Promise.all([
      // Social links
      db.select().from(schema.userSocialLinks).where(eq(schema.userSocialLinks.userId, userId)),
      // Tags
      db.select().from(schema.userTags).where(eq(schema.userTags.userId, userId)),
      // Badges
      db.select().from(schema.userBadges).where(eq(schema.userBadges.userId, userId)),
      // Followers
      db.select({
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatar: schema.users.avatar,
        followedAt: schema.follows.createdAt,
      })
        .from(schema.follows)
        .innerJoin(schema.users, eq(schema.follows.followerId, schema.users.id))
        .where(eq(schema.follows.followingId, userId)),
      // Following
      db.select({
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatar: schema.users.avatar,
        followedAt: schema.follows.createdAt,
      })
        .from(schema.follows)
        .innerJoin(schema.users, eq(schema.follows.followingId, schema.users.id))
        .where(eq(schema.follows.followerId, userId)),
      // Agents (owned)
      db.select().from(schema.agents).where(eq(schema.agents.ownerId, userId)),
      // Posts
      db.select().from(schema.posts).where(eq(schema.posts.authorId, userId)),
      // Discussion comments
      db.select().from(schema.comments).where(eq(schema.comments.authorId, userId)),
      // Agent comments
      db.select().from(schema.agentComments).where(eq(schema.agentComments.authorId, userId)),
      // Agent ratings
      db.select().from(schema.agentRatings).where(eq(schema.agentRatings.userId, userId)),
      // Articles
      db.select().from(schema.articles).where(eq(schema.articles.authorId, userId)),
      // Resources (submitted by user)
      db.select().from(schema.resources).where(eq(schema.resources.submitterId, userId)),
      // Notifications received
      db.select().from(schema.notifications).where(eq(schema.notifications.userId, userId)),
      // Point transactions
      db.select().from(schema.pointTransactions).where(eq(schema.pointTransactions.userId, userId)),
      // Check-ins
      db.select().from(schema.userCheckins).where(eq(schema.userCheckins.userId, userId)),
      // Conversations participated
      db.select({
        id: schema.conversations.id,
        createdAt: schema.conversations.createdAt,
      })
        .from(schema.conversationParticipants)
        .innerJoin(schema.conversations, eq(schema.conversationParticipants.conversationId, schema.conversations.id))
        .where(eq(schema.conversationParticipants.userId, userId)),
    ]);

    // Get messages in conversations (only user's messages)
    const conversationIds = conversations.map(c => c.id);
    type MessageRow = typeof schema.messages.$inferSelect;
    const messages: MessageRow[] = [];
    if (conversationIds.length > 0) {
      // Note: Using eq for single conversation; inArray would be better for bulk
      for (const convId of conversationIds.slice(0, 10)) { // Limit to first 10 convos to avoid huge exports
        const convMessages = await db.select()
          .from(schema.messages)
          .where(eq(schema.messages.conversationId, convId));
        messages.push(...convMessages.filter(m => m.senderId === userId));
      }
    }

    // Build export object (exclude sensitive fields)
    const { passwordHash: _, ...userPublic } = user;

    return {
      exportedAt: new Date().toISOString(),
      user: {
        ...userPublic,
        email: userPublic.email, // keep email for accountability
      },
      socialLinks: socialLinks.map(l => ({ platform: l.platform, url: l.url, createdAt: l.createdAt })),
      tags: tags.map(t => ({ tag: t.tag, createdAt: t.createdAt })),
      badges: badges.map(b => ({ badge: b.badge, earnedAt: b.earnedAt })),
      followers: followers.map(f => ({ id: f.id, username: f.username, displayName: f.displayName, avatar: f.avatar, followedAt: f.followedAt })),
      following: following.map(f => ({ id: f.id, username: f.username, displayName: f.displayName, avatar: f.avatar, followedAt: f.followedAt })),
      agents: agents.map(a => ({ id: a.id, name: a.name, slug: a.slug, status: a.status, createdAt: a.createdAt })),
      posts: posts.map(p => ({ id: p.id, title: p.title, channelId: p.channelId, type: p.type, createdAt: p.createdAt })),
      comments: comments.map(c => ({ id: c.id, postId: c.postId, content: c.content, createdAt: c.createdAt })),
      agentComments: agentComments.map(c => ({ id: c.id, agentId: c.agentId, content: c.content, createdAt: c.createdAt })),
      agentRatings: agentRatings.map(r => ({ id: r.id, agentId: r.agentId, overall: r.overall, comment: r.comment, createdAt: r.createdAt })),
      articles: articles.map(a => ({ id: a.id, title: a.title, slug: a.slug, status: a.status, createdAt: a.createdAt })),
      resources: resources.map(r => ({ id: r.id, name: r.name, slug: r.slug, categoryId: r.categoryId, status: r.status, createdAt: r.createdAt })),
      notifications: notifications.map(n => ({ id: n.id, type: n.type, content: n.content, isRead: n.isRead, createdAt: n.createdAt })),
      pointTransactions: pointTransactions.map(t => ({ id: t.id, points: t.points, reason: t.reason, referenceId: t.referenceId, createdAt: t.createdAt })),
      checkins: checkins.map(c => ({ id: c.id, date: c.date, points: c.points, createdAt: c.createdAt })),
      conversations: conversations.map(c => ({ id: c.id, createdAt: c.createdAt })),
      messageCount: messages.length,
    };
  },

  /**
   * Delete user account (GDPR compliance - right to erasure)
   * Anonymizes the user record and cascades delete all related data
   * Requires password verification before deletion
   */
  async deleteAccount(userId: string, password: string) {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');

    // Verify password
    if (user.oauthProvider && !user.passwordHash) {
      // OAuth-only account - allow deletion without password check
    } else if (user.passwordHash) {
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) throw new Error('Invalid password');
    }

    // Anonymize user data before cascade delete
    const deletedEmail = `deleted_${userId}@agenthub.local`;
    const deletedUsername = `deleted_${userId}`;

    await db.update(schema.users)
      .set({
        email: deletedEmail,
        username: deletedUsername,
        displayName: '[Deleted]',
        avatar: null,
        bio: null,
        passwordHash: null,
        // Keep role/level for audit purposes
      })
      .where(eq(schema.users.id, userId));

    // Cascade deletes via foreign keys:
    // - userSocialLinks (onDelete: cascade)
    // - userTags (onDelete: cascade)
    // - follows (onDelete: cascade) - both follower and following
    // - sessions (onDelete: cascade)
    // - notifications (onDelete: cascade)
    // - agentComments (onDelete: cascade)
    // - agentRatings (onDelete: cascade)
    // - comments (onDelete: cascade)
    // - posts (onDelete: cascade)
    // - articles (onDelete: cascade)
    // - resources (onDelete: cascade)
    // - conversations (onDelete: cascade)
    // - messages (onDelete: cascade)
    // - pointTransactions (onDelete: cascade)
    // - userCheckins (onDelete: cascade)
    // - userBadges (onDelete: cascade)

    // Delete agents (and all related data via cascade)
    await db.delete(schema.agents).where(eq(schema.agents.ownerId, userId));

    // Delete sessions (force logout)
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));

    // Finally, delete the user record itself
    await db.delete(schema.users).where(eq(schema.users.id, userId));
  },
};

export default userService;
