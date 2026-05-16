import { eq, and, desc, sql } from 'drizzle-orm';
import { db, schema } from '@agenthub/db';
import { nanoid } from 'nanoid';
import { sendNotificationToUser } from './websocket.service.js';
import { 
  sendCommentNotificationEmail, 
  sendFollowNotificationEmail, 
  sendLikeNotificationEmail 
} from './email.service.js';

export type NotificationType = 'comment' | 'reply' | 'like' | 'follow' | 'system' | 'mention';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  content?: string;
  link?: string;
}

export interface NotificationListParams {
  userId: string;
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

/**
 * Notification service - handles notification CRUD and management
 */
export const notificationService = {
  /**
   * Create a new notification
   */
  async create(data: CreateNotificationData) {
    const id = nanoid();

    const [notification] = await db.insert(schema.notifications).values({
      id,
      userId: data.userId,
      type: data.type,
      title: data.title,
      content: data.content || null,
      link: data.link || null,
      isRead: false,
    }).returning();

    // Send real-time notification via WebSocket
    try {
      sendNotificationToUser(data.userId, {
        id: notification!.id,
        type: notification!.type,
        title: notification!.title,
        content: notification!.content || undefined,
        link: notification!.link || undefined,
        createdAt: notification!.createdAt.toISOString(),
      });
    } catch (error) {
      // Don't fail the notification creation if WebSocket fails
      console.error('Failed to send WebSocket notification:', error);
    }

    return notification!;
  },

  /**
   * Get notification by ID
   */
  async findById(id: string) {
    const [notification] = await db.select()
      .from(schema.notifications)
      .where(eq(schema.notifications.id, id))
      .limit(1);

    return notification || null;
  },

  /**
   * List notifications for a user
   */
  async list(params: NotificationListParams) {
    const {
      userId,
      limit = 20,
      offset = 0,
      unreadOnly = false,
    } = params;

    // Build conditions
    const conditions = [eq(schema.notifications.userId, userId)];
    
    if (unreadOnly) {
      conditions.push(eq(schema.notifications.isRead, false));
    }

    // Get total count
    const [countResult] = await db.select({
      count: sql<number>`count(*)`,
    })
      .from(schema.notifications)
      .where(and(...conditions));

    // Get unread count
    const [unreadResult] = await db.select({
      count: sql<number>`count(*)`,
    })
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.isRead, false)
        )
      );

    // Get notifications
    const notifications = await db.select()
      .from(schema.notifications)
      .where(and(...conditions))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      notifications,
      total: countResult!.count,
      unreadCount: unreadResult!.count,
      limit,
      offset,
    };
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string, userId: string) {
    // Verify ownership
    const [notification] = await db.select()
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.id, id),
          eq(schema.notifications.userId, userId)
        )
      )
      .limit(1);

    if (!notification) {
      throw new Error('Notification not found');
    }

    const [updated] = await db.update(schema.notifications)
      .set({ isRead: true })
      .where(eq(schema.notifications.id, id))
      .returning();

    return updated;
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    await db.update(schema.notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.isRead, false)
        )
      );

    return { success: true };
  },

  /**
   * Delete a notification
   */
  async delete(id: string, userId: string) {
    // Verify ownership
    const [notification] = await db.select()
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.id, id),
          eq(schema.notifications.userId, userId)
        )
      )
      .limit(1);

    if (!notification) {
      throw new Error('Notification not found');
    }

    await db.delete(schema.notifications)
      .where(eq(schema.notifications.id, id));

    return { success: true };
  },

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string) {
    const [result] = await db.select({
      count: sql<number>`count(*)`,
    })
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.isRead, false)
        )
      );

    return result!.count;
  },

  /**
   * Helper to get user email preferences
   */
  async getUserEmailPreferences(userId: string): Promise<{
    email: string;
    emailNotifyOnComment: boolean;
    emailNotifyOnFollow: boolean;
    emailNotifyOnLike: boolean;
    emailNotifyOnMention: boolean;
  } | null> {
    const [user] = await db.select({
      email: schema.users.email,
      emailNotifyOnComment: schema.users.emailNotifyOnComment,
      emailNotifyOnFollow: schema.users.emailNotifyOnFollow,
      emailNotifyOnLike: schema.users.emailNotifyOnLike,
      emailNotifyOnMention: schema.users.emailNotifyOnMention,
    })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    return user || null;
  },

  /**
   * Create notification for comment on user's post
   */
  async notifyPostComment(postAuthorId: string, commentatorId: string, postTitle: string, commentContent: string, link: string) {
    // Don't notify if user is commenting on their own post
    if (postAuthorId === commentatorId) return null;

    // Create in-app notification
    const notification = await this.create({
      userId: postAuthorId,
      type: 'comment',
      title: '您的话题有新评论',
      content: `${postTitle}: ${commentContent.slice(0, 50)}...`,
      link,
    });

    // Send email notification if enabled
    try {
      const prefs = await this.getUserEmailPreferences(postAuthorId);
      if (prefs?.emailNotifyOnComment && prefs.email) {
        const userEmail = prefs.email;
        const [commenter] = await db.select({
          displayName: schema.users.displayName,
        })
          .from(schema.users)
          .where(eq(schema.users.id, commentatorId))
          .limit(1);

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const emailLocal = userEmail.split('@')[0];
        await sendCommentNotificationEmail(
          userEmail as string,
          emailLocal as string,
          commenter?.displayName || '某用户',
          postTitle,
          commentContent,
          `${frontendUrl}${link}`
        );
      }
    } catch (error) {
      // Don't fail the notification if email fails
      console.error('Failed to send comment email notification:', error);
    }

    return notification;
  },

  /**
   * Create notification for reply to comment
   */
  async notifyCommentReply(parentCommentAuthorId: string, replierId: string, postTitle: string, replyContent: string, link: string) {
    // Don't notify if replying to own comment
    if (parentCommentAuthorId === replierId) return null;

    // Create in-app notification
    const notification = await this.create({
      userId: parentCommentAuthorId,
      type: 'reply',
      title: '您有新的回复',
      content: `${postTitle}: ${replyContent.slice(0, 50)}...`,
      link,
    });

    // Send email notification if enabled (reuses comment notification setting)
    try {
      const prefs = await this.getUserEmailPreferences(parentCommentAuthorId);
      if (prefs?.emailNotifyOnMention && prefs.email) {
        const userEmail = prefs.email;
        const [replier] = await db.select({
          displayName: schema.users.displayName,
        })
          .from(schema.users)
          .where(eq(schema.users.id, replierId))
          .limit(1);

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const emailLocal = userEmail.split('@')[0];
        await sendCommentNotificationEmail(
          userEmail as string,
          emailLocal as string,
          replier?.displayName || '某用户',
          postTitle,
          replyContent,
          `${frontendUrl}${link}`
        );
      }
    } catch (error) {
      console.error('Failed to send reply email notification:', error);
    }

    return notification;
  },

  /**
   * Create notification for new follower
   */
  async notifyNewFollower(followedUserId: string, followerId: string, followerName: string) {
    // Create in-app notification
    const notification = await this.create({
      userId: followedUserId,
      type: 'follow',
      title: '新增关注',
      content: `${followerName} 关注了您`,
      link: `/users/${followerId}`,
    });

    // Send email notification if enabled
    try {
      const prefs = await this.getUserEmailPreferences(followedUserId);
      if (prefs?.emailNotifyOnFollow && prefs.email) {
        const userEmail = prefs.email;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const emailLocal = userEmail.split('@')[0];
        await sendFollowNotificationEmail(
          userEmail as string,
          emailLocal as string,
          followerName,
          `${frontendUrl}/users/${followerId}`
        );
      }
    } catch (error) {
      console.error('Failed to send follow email notification:', error);
    }

    return notification;
  },

  /**
   * Create notification for like
   */
  async notifyLike(userId: string, likerId: string, likerName: string, targetType: 'post' | 'comment', targetTitle: string, link: string) {
    // Don't notify if liking own content
    if (userId === likerId) return null;

    // Create in-app notification
    const notification = await this.create({
      userId,
      type: 'like',
      title: '收到点赞',
      content: `${likerName} 点赞了您的${targetType === 'post' ? '帖子' : '评论'}: ${targetTitle.slice(0, 30)}...`,
      link,
    });

    // Send email notification if enabled
    try {
      const prefs = await this.getUserEmailPreferences(userId);
      if (prefs?.emailNotifyOnLike && prefs.email) {
        const userEmail = prefs.email;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const emailLocal = userEmail.split('@')[0];
        await sendLikeNotificationEmail(
          userEmail as string,
          emailLocal as string,
          likerName,
          targetTitle,
          `${frontendUrl}${link}`,
          targetType
        );
      }
    } catch (error) {
      console.error('Failed to send like email notification:', error);
    }

    return notification;
  },
};

export default notificationService;
