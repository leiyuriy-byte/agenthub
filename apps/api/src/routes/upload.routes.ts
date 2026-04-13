import path from 'path';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { uploadFile, deleteFile, isStorageConfigured } from '../services/storage.service.js';

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_AVATAR_SIZE = 1 * 1024 * 1024; // 1MB

export async function uploadRoutes(fastify: FastifyInstance) {
  // Register multipart plugin for file uploads
  await fastify.register(import('@fastify/multipart'), {
    limits: {
      fileSize: MAX_IMAGE_SIZE,
    },
  });

  // Register static file serving for uploads (only for local storage)
  const storageStatus = isStorageConfigured();
  if (storageStatus.provider === 'local') {
    const UPLOAD_DIR = process.env.UPLOAD_DIR
      ? path.resolve(process.env.UPLOAD_DIR)
      : path.resolve('uploads');
    await fastify.register(import('@fastify/static'), {
      root: UPLOAD_DIR,
      prefix: '/uploads/',
      decorateReply: false,
    });
  }

  /**
   * GET /api/upload/status - Check storage configuration
   */
  fastify.get('/status', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    return reply.send({
      success: true,
      data: isStorageConfigured(),
    });
  });

  /**
   * POST /api/upload/image - Upload an image
   */
  fastify.post('/image', async (
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
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({
          success: false,
          error: 'No file uploaded',
        });
      }

      // Check file type
      if (!ALLOWED_IMAGE_TYPES.includes(data.mimetype)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid file type. Allowed: jpg, png, webp, gif',
        });
      }

      // Check file size
      const buffer = await data.toBuffer();
      const fileSize = buffer.length;
      if (fileSize > MAX_IMAGE_SIZE) {
        return reply.code(400).send({
          success: false,
          error: `File too large. Maximum size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
        });
      }

      // Upload using storage service
      const result = await uploadFile(
        buffer,
        data.filename || 'image.jpg',
        data.mimetype,
        'images'
      );

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Upload failed',
      });
    }
  });

  /**
   * DELETE /api/upload/image - Delete an image
   */
  fastify.delete('/image', async (
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
      const { filename } = request.body as { filename?: string };

      if (!filename) {
        return reply.code(400).send({
          success: false,
          error: 'Filename required',
        });
      }

      // Security: prevent directory traversal (done in storage service)
      const result = await deleteFile(filename, 'images');

      return reply.send({
        success: result.success,
        message: result.message,
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Delete failed',
      });
    }
  });

  /**
   * POST /api/upload/avatar - Upload user avatar
   */
  fastify.post('/avatar', async (
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
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({
          success: false,
          error: 'No file uploaded',
        });
      }

      // Check file type
      if (!ALLOWED_IMAGE_TYPES.includes(data.mimetype)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid file type. Allowed: jpg, png, webp, gif',
        });
      }

      // Check file size (avatar max 1MB)
      const buffer = await data.toBuffer();
      const fileSize = buffer.length;
      if (fileSize > MAX_AVATAR_SIZE) {
        return reply.code(400).send({
          success: false,
          error: `File too large. Maximum size: ${MAX_AVATAR_SIZE / 1024 / 1024}MB`,
        });
      }

      // Upload to avatars subdir
      const result = await uploadFile(
        buffer,
        data.filename || 'avatar.jpg',
        data.mimetype,
        'avatars'
      );

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Upload failed',
      });
    }
  });
}

export default uploadRoutes;
