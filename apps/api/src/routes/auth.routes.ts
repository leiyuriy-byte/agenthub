import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services/auth.service.js';
import { authSchemas } from '@agenthub/validators';
import { ZodError } from 'zod';

export async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/auth/register - Register new user
   */
  fastify.post('/register', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const data = authSchemas.register.parse(request.body);
      
      const result = await authService.register(data, fastify);
      
      return reply.code(201).send({
        success: true,
        data: result,
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
   * POST /api/auth/login - Login user
   */
  fastify.post('/login', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const data = authSchemas.login.parse(request.body);
      
      const result = await authService.login(data, fastify);
      
      return reply.send({
        success: true,
        data: result,
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
        return reply.code(401).send({
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
   * POST /api/auth/logout - Logout user
   */
  fastify.post('/logout', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const authHeader = request.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await authService.logout(token);
    }
    
    return reply.send({
      success: true,
      message: 'Logged out successfully',
    });
  });

  /**
   * GET /api/auth/me - Get current user
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

    const { userService } = await import('../services/user.service.js');
    const user = await userService.findById(request.userId);
    
    if (!user) {
      return reply.code(404).send({
        success: false,
        error: 'User not found',
      });
    }

    return reply.send({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        level: user.level,
        points: user.points,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  });

  /**
   * POST /api/auth/forgot-password - Request password reset
   */
  fastify.post('/forgot-password', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const data = authSchemas.forgotPassword.parse(request.body);
      
      const result = await authService.requestPasswordReset(data.email);
      
      return reply.send(result);
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
   * POST /api/auth/reset-password - Reset password
   */
  fastify.post('/reset-password', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const data = authSchemas.resetPassword.parse(request.body);
      
      const result = await authService.resetPassword(data.token, data.password);
      
      return reply.send(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }
      
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
   * POST /api/auth/change-password - Change password (requires auth)
   */
  fastify.post('/change-password', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    // Require authentication
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    try {
      const data = authSchemas.changePassword.parse(request.body);
      
      const result = await authService.changePassword(
        request.userId,
        data.currentPassword,
        data.newPassword
      );
      
      return reply.send(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }
      
      if (error instanceof Error) {
        const statusCode = error.message === 'Current password is incorrect' ? 400 : 400;
        return reply.code(statusCode).send({
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
   * GET /api/auth/sessions - Get active sessions
   */
  fastify.get('/sessions', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Not authenticated',
      });
    }

    const sessions = await authService.getSessions(request.userId);
    
    return reply.send({
      success: true,
      data: sessions,
    });
  });
}
