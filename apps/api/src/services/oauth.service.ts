/**
 * OAuth Service - Handles GitHub and Google OAuth authentication
 */
import { eq } from 'drizzle-orm';
import { db, schema } from '@agenthub/db';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';

export interface OAuthUserData {
  provider: 'github' | 'google';
  providerId: string;
  email: string;
  name?: string;
  avatar?: string;
}

/**
 * Generate a random password for OAuth users (they don't need one)
 */
async function generateRandomPassword(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return bcrypt.hash(password, 12);
}

/**
 * Generate a unique username from email or provider name
 */
async function generateUniqueUsername(baseName: string): Promise<string> {
  const username = baseName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  let counter = 0;
  let finalUsername = username;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await db.select()
      .from(schema.users)
      .where(eq(schema.users.username, finalUsername))
      .limit(1);

    if (existing.length === 0) {
      return finalUsername;
    }

    counter++;
    finalUsername = `${username}${counter}`;
  }
}

export const oauthService = {
  /**
   * Find or create user from OAuth provider
   */
  async findOrCreateUser(data: OAuthUserData, fastify: FastifyInstance) {
    const { provider, providerId, email, name, avatar } = data;

    // Check if user already exists with this OAuth provider
    const providerColumn = provider === 'github' ? schema.users.githubId : schema.users.googleId;
    
    const existingByProvider = await db.select()
      .from(schema.users)
      .where(eq(providerColumn, providerId))
      .limit(1);

    if (existingByProvider.length > 0) {
      // User exists, update last login and return
      const user = existingByProvider[0];
      
      // Generate JWT token
      const token = fastify.jwt.sign({
        sub: user!.id,
        email: user!.email,
        username: user!.username,
        role: user!.role,
      });

      // Update last login
      await db.update(schema.users)
        .set({ lastLoginAt: new Date() })
        .where(eq(schema.users.id, user!.id));

      // Create session
      await authService.createSession(user!.id, token);

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
        isNewUser: false,
      };
    }

    // Check if user exists with same email (linking account)
    const existingByEmail = await db.select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1);

    if (existingByEmail.length > 0) {
      // Link existing account with OAuth
      const user = existingByEmail[0];
      
      const updateData: Record<string, string> = {
        lastLoginAt: new Date().toISOString() as unknown as string,
      };
      
      if (provider === 'github') {
        updateData.githubId = providerId;
      } else {
        updateData.googleId = providerId;
      }
      updateData.oauthProvider = provider;
      updateData.lastLoginAt = new Date().toISOString();

      // Use direct update since we're using SQLite
      await db.update(schema.users)
        .set({ 
          [provider === 'github' ? 'githubId' : 'googleId']: providerId,
          oauthProvider: provider,
          lastLoginAt: new Date(),
        })
        .where(eq(schema.users.id, user!.id));

      // Generate JWT token
      const token = fastify.jwt.sign({
        sub: user!.id,
        email: user!.email,
        username: user!.username,
        role: user!.role,
      });

      // Create session
      await authService.createSession(user!.id, token);

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
        isNewUser: false,
      };
    }

    // Create new user
    const username = await generateUniqueUsername((name || email.split('@')[0]) as string);
    const passwordHash = await generateRandomPassword();
    const id = nanoid();

    const [user] = await db.insert(schema.users).values({
      id,
      email: email.toLowerCase(),
      username,
      passwordHash,
      displayName: name || username,
      avatar: avatar || null,
      isVerified: true,
      [provider === 'github' ? 'githubId' : 'googleId']: providerId,
      oauthProvider: provider,
    }).returning();

    // Generate JWT token
    const token = fastify.jwt.sign({
      sub: user!.id,
      email: user!.email,
      username: user!.username,
      role: user!.role,
    });

    // Create session
    await authService.createSession(user!.id, token);

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
      isNewUser: true,
    };
  },

  /**
   * Get GitHub OAuth URL
   */
  getGitHubAuthUrl(state: string): string {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.OAUTH_GITHUB_REDIRECT_URI || process.env.OAUTH_REDIRECT_URI || 'https://nexarb.top/api/auth/github/callback';
    
    if (!clientId) {
      throw new Error('GITHUB_CLIENT_ID not configured');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  },

  /**
   * Get Google OAuth URL
   */
  getGoogleAuthUrl(state: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.OAUTH_GOOGLE_REDIRECT_URI || process.env.OAUTH_REDIRECT_URI || 'https://nexarb.top/api/auth/google/callback';
    
    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID not configured');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  /**
   * Exchange GitHub code for access token and user info
   */
  async exchangeGitHubCode(code: string): Promise<{ providerId: string; accessToken: string; email: string; name?: string; avatar?: string }> {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const redirectUri = process.env.OAUTH_GITHUB_REDIRECT_URI || process.env.OAUTH_REDIRECT_URI || 'https://nexarb.top/api/auth/github/callback';

    if (!clientId || !clientSecret) {
      throw new Error('GitHub OAuth not configured');
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json() as { access_token?: string; error?: string };
    
    if (!tokenData.access_token) {
      throw new Error(tokenData.error || 'Failed to exchange code for access token');
    }

    // Get user info including the GitHub ID
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json() as { id: number; login: string; name?: string; avatar_url?: string; email?: string };

    // Get user email (may need separate request)
    let email = userData.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      const emails = await emailsResponse.json() as Array<{ email: string; primary: boolean }>;
      const primaryEmail = emails.find((e: { email: string; primary: boolean }) => e.primary);
      email = primaryEmail?.email || emails[0]?.email;
    }

    if (!email) {
      throw new Error('Could not get user email from GitHub');
    }

    return {
      providerId: String(userData.id), // GitHub numeric ID
      accessToken: tokenData.access_token,
      email,
      name: userData.name || userData.login,
      avatar: userData.avatar_url,
    };
  },

  /**
   * Exchange Google code for access token and user info
   */
  async exchangeGoogleCode(code: string): Promise<{ providerId: string; email: string; name?: string; avatar?: string }> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.OAUTH_GOOGLE_REDIRECT_URI || process.env.OAUTH_REDIRECT_URI || 'https://nexarb.top/api/auth/google/callback';

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth not configured');
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json() as { access_token?: string; id_token?: string; error?: string };
    
    if (!tokenData.access_token) {
      throw new Error(tokenData.error || 'Failed to exchange code for access token');
    }

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json() as { id: string; email: string; name?: string; picture?: string };

    return {
      providerId: userData.id, // Google user ID
      email: userData.email,
      name: userData.name,
      avatar: userData.picture,
    };
  },
};

// Import authService for session creation
import { authService } from './auth.service.js';

export default oauthService;
