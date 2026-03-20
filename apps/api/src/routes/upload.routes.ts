import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { mkdirSync, existsSync, writeFileSync, unlinkSync } from 'fs';

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// Upload directory
const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

// Ensure upload directory exists
function ensureUploadDir() {
  const imagesDir = join(UPLOAD_DIR, 'images');
  if (!existsSync(imagesDir)) {
    mkdirSync(imagesDir, { recursive: true });
  }
  return imagesDir;
}

export async function uploadRoutes(fastify: FastifyInstance) {
  // Register multipart plugin for file uploads
  await fastify.register(import('@fastify/multipart'), {
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
  });

  // Register static file serving for uploads
  await fastify.register(import('@fastify/static'), {
    root: UPLOAD_DIR,
    prefix: '/uploads/',
    decorateReply: false,
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
      const fileSize = await data.toBuffer().then(buf => buf.length);
      if (fileSize > MAX_FILE_SIZE) {
        return reply.code(400).send({
          success: false,
          error: 'File too large. Maximum size: 2MB',
        });
      }

      // Generate unique filename
      const buffer = await data.toBuffer();
      const ext = extname(data.filename || '.jpg').toLowerCase();
      const filename = `${randomUUID()}${ext}`;

      // Save file
      const uploadDir = ensureUploadDir();
      const filepath = join(uploadDir, filename);
      writeFileSync(filepath, buffer);

      // Return the URL
      const imageUrl = `/uploads/images/${filename}`;

      return reply.send({
        success: true,
        data: {
          url: imageUrl,
          filename,
          size: fileSize,
          mimetype: data.mimetype,
        },
      });
    } catch (error) {
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

      // Security: prevent directory traversal
      if (filename.includes('..') || filename.includes('/')) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid filename',
        });
      }

      const filepath = join(UPLOAD_DIR, 'images', filename);

      if (existsSync(filepath)) {
        unlinkSync(filepath);
      }

      return reply.send({
        success: true,
        message: 'Image deleted',
      });
    } catch (error) {
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
      if (fileSize > 1024 * 1024) {
        return reply.code(400).send({
          success: false,
          error: 'File too large. Maximum size: 1MB',
        });
      }

      // Generate unique filename with user ID prefix
      const ext = extname(data.filename || '.jpg').toLowerCase();
      const filename = `avatar_${request.userId}_${randomUUID()}${ext}`;

      // Save file
      const uploadDir = ensureUploadDir();
      const filepath = join(uploadDir, filename);
      writeFileSync(filepath, buffer);

      // Return the URL
      const avatarUrl = `/uploads/images/${filename}`;

      return reply.send({
        success: true,
        data: {
          url: avatarUrl,
          filename,
          size: fileSize,
          mimetype: data.mimetype,
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Upload failed',
      });
    }
  });
}

export default uploadRoutes;
