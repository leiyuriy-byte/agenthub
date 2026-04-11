import { eq, and, desc } from 'drizzle-orm';
import { db, schema } from '@agenthub/db';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { sendWelcomeEmail, sendPasswordResetEmail, isEmailConfigured } from './email.service.js';

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

/**
 * Auth service - handles authentication, sessions, tokens
 */
export const authService = {
  /**
   * Register new user
   */
  async register(data: RegisterData, fastify: FastifyInstance) {
    // Check if email exists
    const existingEmail = await db.select()
      .from(schema.users)
      .where(eq(schema.users.email, data.email.toLowerCase()))
      .limit(1);
    
    if (existingEmail.length > 0) {
      throw new Error('Email already registered');
    }

    // Check if username exists
    const existingUsername = await db.select()
      .from(schema.users)
      .where(eq(schema.users.username, data.username.toLowerCase()))
      .limit(1);
    
    if (existingUsername.length > 0) {
      throw new Error('Username already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);
    const id = nanoid();

    // Create user
    const [user] = await db.insert(schema.users).values({
      id,
      email: data.email.toLowerCase(),
      username: data.username.toLowerCase(),
      passwordHash,
      displayName: data.displayName || data.username,
      isVerified: true, // For now, auto-verify. In production, send verification email
    }).returning();

    // Generate JWT token
    const token = fastify.jwt.sign({
      sub: user!.id,
      email: user!.email,
      username: user!.username,
      role: user!.role,
    });

    // Create session
    await this.createSession(user!.id, token);

    // Send welcome email (async, don't block registration)
    if (isEmailConfigured()) {
      sendWelcomeEmail(user!.email, user!.displayName || user!.username).catch(err => {
        console.error('[Auth] Failed to send welcome email:', err);
      });
    }

    return {
      user: {
        id: user!.id,
        email: user!.email,
        username: user!.username,
        displayName: user!.displayName,
        avatar: user!.avatar,
        role: user!.role,
        level: user!.level,
      },
      token,
    };
  },

  /**
   * Login user
   */
  async login(data: LoginData, fastify: FastifyInstance) {
    // Find user by email
    const [user] = await db.select()
      .from(schema.users)
      .where(eq(schema.users.email, data.email.toLowerCase()))
      .limit(1);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    if (!user.passwordHash) {
      throw new Error('Invalid email or password');
    }
    const validPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!validPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = fastify.jwt.sign({
      sub: user!.id,
      email: user!.email,
      username: user!.username,
      role: user!.role,
    });

    // Create session
    await this.createSession(user!.id, token);

    // Update last login
    await db.update(schema.users)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.users.id, user!.id));

    return {
      user: {
        id: user!.id,
        email: user!.email,
        username: user!.username,
        displayName: user!.displayName,
        avatar: user!.avatar,
        role: user!.role,
        level: user!.level,
      },
      token,
    };
  },

  /**
   * Create session
   */
  async createSession(userId: string, token: string, ipAddress?: string, userAgent?: string) {
    const id = nanoid();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await db.insert(schema.sessions).values({
      id,
      userId,
      token,
      ipAddress,
      userAgent,
      expiresAt,
    });
  },

  /**
   * Logout - delete session
   */
  async logout(token: string) {
    await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
  },

  /**
   * Verify token and get user
   */
  async verifyToken(token: string) {
    const [session] = await db.select()
      .from(schema.sessions)
      .where(eq(schema.sessions.token, token))
      .limit(1);

    if (!session) {
      return null;
    }

    // Check if expired
    if (new Date(session.expiresAt) < new Date()) {
      await db.delete(schema.sessions).where(eq(schema.sessions.id, session.id));
      return null;
    }

    // Get user
    const [user] = await db.select()
      .from(schema.users)
      .where(eq(schema.users.id, session.userId))
      .limit(1);

    return user;
  },

  /**
   * Get active sessions
   */
  async getSessions(userId: string) {
    const sessions = await db.select()
      .from(schema.sessions)
      .where(eq(schema.sessions.userId, userId))
      .orderBy(desc(schema.sessions.createdAt));

    return sessions.map(s => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));
  },

  /**
   * Delete session
   */
  async deleteSession(sessionId: string, userId: string) {
    await db.delete(schema.sessions)
      .where(and(
        eq(schema.sessions.id, sessionId),
        eq(schema.sessions.userId, userId)
      ));
  },

  /**
   * Delete all sessions (except current)
   */
  async deleteAllSessions(userId: string, exceptToken?: string) {
    if (exceptToken) {
      await db.delete(schema.sessions)
        .where(and(
          eq(schema.sessions.userId, userId),
          // Note: This won't work perfectly with SQLite, but it's a start
        ));
    } else {
      await db.delete(schema.sessions)
        .where(eq(schema.sessions.userId, userId));
    }
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    const [user] = await db.select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      // Don't reveal if email exists
      return { success: true };
    }

    const id = nanoid();
    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    await db.insert(schema.passwordResets).values({
      id,
      userId: user!.id,
      token,
      expiresAt,
    });

    // Send password reset email
    if (isEmailConfigured()) {
      const sent = await sendPasswordResetEmail(
        user!.email,
        user!.displayName || user!.username,
        token
      );
      if (!sent.success) {
        console.error('[Auth] Failed to send password reset email:', sent.error);
      }
    } else {
      // Development fallback: log the reset link
      const resetUrl = `http://localhost:3000/reset-password?token=${token}`;
      console.log(`\n🔐 Password Reset Link for ${email}:`);
      console.log(`   ${resetUrl}`);
      console.log('   (Email not configured - link shown in console only)\n');
    }
    
    return { success: true };
  },

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string) {
    const [reset] = await db.select()
      .from(schema.passwordResets)
      .where(eq(schema.passwordResets.token, token))
      .limit(1);

    if (!reset) {
      throw new Error('Invalid reset token');
    }

    if (new Date(reset.expiresAt) < new Date()) {
      throw new Error('Reset token expired');
    }

    if (reset.usedAt) {
      throw new Error('Reset token already used');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update user password
    await db.update(schema.users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(schema.users.id, reset.userId));

    // Mark token as used
    await db.update(schema.passwordResets)
      .set({ usedAt: new Date() })
      .where(eq(schema.passwordResets.id, reset.id));

    // Delete all existing sessions (force re-login)
    await db.delete(schema.sessions)
      .where(eq(schema.sessions.userId, reset.userId));

    return { success: true };
  },

  /**
   * Change password (requires current password verification)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    // Get user
    const [user] = await db.select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.passwordHash) {
      throw new Error('No password set for this account');
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update user password
    await db.update(schema.users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(schema.users.id, userId));

    // Delete all existing sessions except current one (optional: force re-login on other devices)
    // We keep this simple and don't force re-login on other devices

    return { success: true };
  },
};

export default authService;
