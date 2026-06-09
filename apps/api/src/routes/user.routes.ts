import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { userService } from '../services/user.service.js';
import { userSchemas } from '@agenthub/validators';
import { ZodError } from 'zod';

interface IdParams {
  id: string;
}

interface ListQuery {
  limit?: number;
  offset?: number;
}

export async function userRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/users/:id - Get user by ID
   */
  fastify.get<{ Params: IdParams }>('/:id', async (
    request: FastifyRequest<{ Params: IdParams }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    
    const profile = await userService.getProfile(id);
    
    if (!profile) {
      return reply.code(404).send({
        success: false,
        error: 'User not found',
      });
    }

    // Don't expose sensitive data
    const { ...userWithoutSensitive } = profile;
    
    return reply.send({
      success: true,
      data: userWithoutSensitive,
    });
  });

  /**
   * PUT /api/users/me - Update current user profile
   */
  fastify.put('/me', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Not authenticated',
      });
    }

    try {
      const data = userSchemas.updateProfile.parse(request.body);
      
      const user = await userService.update(request.userId, data);
      
      if (!user) {
        return reply.code(404).send({
          success: false,
          error: 'User not found',
        });
      }

      return reply.send({
        success: true,
        data: user,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }
      
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * GET /api/users/me - Get current user profile
   */
  fastify.get('/me', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Not authenticated',
      });
    }

    const profile = await userService.getProfile(request.userId);
    
    if (!profile) {
      return reply.code(404).send({
        success: false,
        error: 'User not found',
      });
    }

    return reply.send({
      success: true,
      data: profile,
    });
  });

  /**
   * POST /api/users/me/social-links - Add social link
   */
  fastify.post('/me/social-links', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Not authenticated',
      });
    }

    try {
      const data = userSchemas.addSocialLink.parse(request.body);
      
      const link = await userService.addSocialLink(request.userId, data.platform, data.url);
      
      return reply.code(201).send({
        success: true,
        data: link,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }
      
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * DELETE /api/users/me/social-links/:platform - Remove social link
   */
  fastify.delete<{ Params: { platform: string } }>('/me/social-links/:platform', async (
    request: FastifyRequest<{ Params: { platform: string } }>,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Not authenticated',
      });
    }

    await userService.removeSocialLink(request.userId, request.params.platform);
    
    return reply.send({
      success: true,
      message: 'Social link removed',
    });
  });

  /**
   * POST /api/users/me/tags - Add user tag
   */
  fastify.post('/me/tags', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Not authenticated',
      });
    }

    try {
      const data = userSchemas.addTag.parse(request.body);
      
      const tag = await userService.addTag(request.userId, data.tag);
      
      return reply.code(201).send({
        success: true,
        data: tag,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }
      
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * POST /api/users/:id/follow - Follow user
   */
  fastify.post<{ Params: IdParams }>('/:id/follow', async (
    request: FastifyRequest<{ Params: IdParams }>,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Not authenticated',
      });
    }

    try {
      const follow = await userService.follow(request.userId, request.params.id);
      
      if (!follow) {
        return reply.code(400).send({
          success: false,
          error: 'Cannot follow user',
        });
      }

      return reply.code(201).send({
        success: true,
        message: 'Now following user',
      });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          success: false,
          error: error.message,
        });
      }
      
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * DELETE /api/users/:id/follow - Unfollow user
   */
  fastify.delete<{ Params: IdParams }>('/:id/follow', async (
    request: FastifyRequest<{ Params: IdParams }>,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Not authenticated',
      });
    }

    await userService.unfollow(request.userId, request.params.id);
    
    return reply.send({
      success: true,
      message: 'Unfollowed user',
    });
  });

  /**
   * GET /api/users/:id/followers - Get user followers
   */
  fastify.get<{ Params: IdParams; Querystring: ListQuery }>('/:id/followers', async (
    request: FastifyRequest<{ Params: IdParams; Querystring: ListQuery }>,
    reply: FastifyReply
  ) => {
    const { limit = 20, offset = 0 } = request.query;
    
    const followers = await userService.getFollowers(request.params.id, limit, offset);
    
    return reply.send({
      success: true,
      data: followers.map(f => ({
        id: f.id,
        username: f.username,
        displayName: f.displayName,
        avatar: f.avatar,
      })),
    });
  });

  /**
   * GET /api/users/:id/following - Get user following
   */
  fastify.get<{ Params: IdParams; Querystring: ListQuery }>('/:id/following', async (
    request: FastifyRequest<{ Params: IdParams; Querystring: ListQuery }>,
    reply: FastifyReply
  ) => {
    const { limit = 20, offset = 0 } = request.query;
    
    const following = await userService.getFollowing(request.params.id, limit, offset);
    
    return reply.send({
      success: true,
      data: following.map(f => ({
        id: f.id,
        username: f.username,
        displayName: f.displayName,
        avatar: f.avatar,
      })),
    });
  });

  /**
   * GET /api/users/:id/follow-status - Check if current user is following
   */
  fastify.get<{ Params: IdParams }>('/:id/follow-status', async (
    request: FastifyRequest<{ Params: IdParams }>,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Not authenticated',
      });
    }

    const isFollowing = await userService.isFollowing(request.userId, request.params.id);
    
    return reply.send({
      success: true,
      data: { isFollowing },
    });
  });

  /**
   * GET /api/users/me/export - Export all user data (GDPR compliance)
   */
  fastify.get('/me/export', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Not authenticated',
      });
    }

    try {
      const data = await userService.exportUserData(request.userId);
      
      return reply.send({
        success: true,
        data,
      });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(404).send({
          success: false,
          error: error.message,
        });
      }
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * DELETE /api/users/me - Delete user account (GDPR compliance - right to erasure)
   * Requires password confirmation and typing "DELETE" to confirm
   */
  fastify.delete('/me', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Not authenticated',
      });
    }

    try {
      const data = userSchemas.deleteAccount.parse(request.body);
      
      await userService.deleteAccount(request.userId, data.password);
      
      return reply.send({
        success: true,
        message: 'Account deleted successfully. All your data has been removed.',
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }
      if (error instanceof Error) {
        if (error.message === 'Invalid password') {
          return reply.code(403).send({
            success: false,
            error: 'Invalid password. Account deletion rejected.',
          });
        }
        return reply.code(404).send({
          success: false,
          error: error.message,
        });
      }
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });
}
