import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { oauthService } from '../services/oauth.service.js';
import { nanoid } from 'nanoid';

// In-memory store for OAuth state (in production, use Redis or database)
// Key: state, Value: { redirectUrl, timestamp }
const oauthStates = new Map<string, { redirectUrl: string; timestamp: number }>();

// Clean up old states every 10 minutes
const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function cleanupStates() {
  const now = Date.now();
  for (const [state, data] of oauthStates) {
    if (now - data.timestamp > STATE_EXPIRY_MS) {
      oauthStates.delete(state);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupStates, 60 * 1000);

export async function oauthRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/auth/github - Initiate GitHub OAuth
   * 
   * Query params:
   * - redirectUrl: URL to redirect after auth (optional, defaults to homepage)
   */
  fastify.get('/github', async (
    request: FastifyRequest<{ Querystring: { redirectUrl?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { redirectUrl } = request.query;
      
      // Generate state for CSRF protection
      const state = nanoid(32);
      
      // Store state with redirect URL
      oauthStates.set(state, {
        redirectUrl: redirectUrl || '/',
        timestamp: Date.now(),
      });

      // Get GitHub auth URL
      const authUrl = oauthService.getGitHubAuthUrl(state);
      
      // Redirect to GitHub
      return reply.redirect(authUrl);
    } catch (error) {
      fastify.log.error(error);
      
      if (error instanceof Error && error.message.includes('not configured')) {
        return reply.code(503).send({
          success: false,
          error: 'GitHub OAuth is not configured. Please contact the administrator.',
        });
      }
      
      return reply.code(500).send({
        success: false,
        error: 'Failed to initiate GitHub authentication',
      });
    }
  });

  /**
   * GET /api/auth/github/callback - GitHub OAuth callback
   * 
   * Query params:
   * - code: GitHub authorization code
   * - state: CSRF state token
   */
  fastify.get('/github/callback', async (
    request: FastifyRequest<{ Querystring: { code?: string; state?: string; error?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { code, state, error: oauthError } = request.query;

      // Check for OAuth error
      if (oauthError) {
        fastify.log.warn(`GitHub OAuth error: ${oauthError}`);
        return reply.redirect(`/login?error=oauth_denied&provider=github`);
      }

      // Validate code and state
      if (!code || !state) {
        return reply.redirect('/login?error=missing_params&provider=github');
      }

      // Verify state
      const stateData = oauthStates.get(state);
      if (!stateData) {
        return reply.redirect('/login?error=invalid_state&provider=github');
      }

      // Delete state to prevent replay
      oauthStates.delete(state);

      // Exchange code for user info
      const githubData = await oauthService.exchangeGitHubCode(code);

      // Find or create user
      const result = await oauthService.findOrCreateUser({
        provider: 'github',
        providerId: githubData.providerId,
        email: githubData.email,
        name: githubData.name,
        avatar: githubData.avatar,
      }, fastify);

      // In the exchangeGitHubCode, we don't get the GitHub user ID directly
      // Let's fix that by making another call to get the user ID
      // Actually, let's update the approach - we'll use the access token to get the ID
      
      // Redirect to frontend with token
      const redirectUrl = new URL(stateData.redirectUrl, process.env.FRONTEND_URL || 'http://localhost:3000');
      redirectUrl.searchParams.set('oauth_token', result.token);
      redirectUrl.searchParams.set('oauth_new_user', result.isNewUser ? 'true' : 'false');
      
      return reply.redirect(redirectUrl.toString());
    } catch (error) {
      fastify.log.error(error);
      return reply.redirect('/login?error=oauth_failed&provider=github');
    }
  });

  /**
   * GET /api/auth/google - Initiate Google OAuth
   * 
   * Query params:
   * - redirectUrl: URL to redirect after auth (optional, defaults to homepage)
   */
  fastify.get('/google', async (
    request: FastifyRequest<{ Querystring: { redirectUrl?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { redirectUrl } = request.query;
      
      // Generate state for CSRF protection
      const state = nanoid(32);
      
      // Store state with redirect URL
      oauthStates.set(state, {
        redirectUrl: redirectUrl || '/',
        timestamp: Date.now(),
      });

      // Get Google auth URL
      const authUrl = oauthService.getGoogleAuthUrl(state);
      
      // Redirect to Google
      return reply.redirect(authUrl);
    } catch (error) {
      fastify.log.error(error);
      
      if (error instanceof Error && error.message.includes('not configured')) {
        return reply.code(503).send({
          success: false,
          error: 'Google OAuth is not configured. Please contact the administrator.',
        });
      }
      
      return reply.code(500).send({
        success: false,
        error: 'Failed to initiate Google authentication',
      });
    }
  });

  /**
   * GET /api/auth/google/callback - Google OAuth callback
   * 
   * Query params:
   * - code: Google authorization code
   * - state: CSRF state token
   */
  fastify.get('/google/callback', async (
    request: FastifyRequest<{ Querystring: { code?: string; state?: string; error?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { code, state, error: oauthError } = request.query;

      // Check for OAuth error
      if (oauthError) {
        fastify.log.warn(`Google OAuth error: ${oauthError}`);
        return reply.redirect(`/login?error=oauth_denied&provider=google`);
      }

      // Validate code and state
      if (!code || !state) {
        return reply.redirect('/login?error=missing_params&provider=google');
      }

      // Verify state
      const stateData = oauthStates.get(state);
      if (!stateData) {
        return reply.redirect('/login?error=invalid_state&provider=google');
      }

      // Delete state to prevent replay
      oauthStates.delete(state);

      // Exchange code for user info
      const googleData = await oauthService.exchangeGoogleCode(code);

      // Find or create user
      const result = await oauthService.findOrCreateUser({
        provider: 'google',
        providerId: googleData.providerId,
        email: googleData.email,
        name: googleData.name,
        avatar: googleData.avatar,
      }, fastify);

      // Redirect to frontend with token
      const redirectUrl = new URL(stateData.redirectUrl, process.env.FRONTEND_URL || 'http://localhost:3000');
      redirectUrl.searchParams.set('oauth_token', result.token);
      redirectUrl.searchParams.set('oauth_new_user', result.isNewUser ? 'true' : 'false');
      
      return reply.redirect(redirectUrl.toString());
    } catch (error) {
      fastify.log.error(error);
      return reply.redirect('/login?error=oauth_failed&provider=google');
    }
  });

  /**
   * GET /api/auth/oauth-status - Check if OAuth is configured
   */
  fastify.get('/oauth-status', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const githubConfigured = !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET;
    const googleConfigured = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

    return reply.send({
      success: true,
      data: {
        github: githubConfigured,
        google: googleConfigured,
      },
    });
  });
}
