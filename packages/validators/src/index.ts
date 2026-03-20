import { z } from 'zod';

/**
 * Auth validation schemas
 */
export const authSchemas = {
  register: z.object({
    email: z.string().email('Invalid email address'),
    username: z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must be at most 20 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
    displayName: z.string().max(50).optional(),
  }),

  login: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),

  forgotPassword: z.object({
    email: z.string().email('Invalid email address'),
  }),

  resetPassword: z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  }),
};

/**
 * User validation schemas
 */
export const userSchemas = {
  updateProfile: z.object({
    displayName: z.string().max(50).optional(),
    bio: z.string().max(500).optional(),
    avatar: z.string().url().optional(),
  }),

  addSocialLink: z.object({
    platform: z.enum(['github', 'twitter', 'website', 'linkedin', 'youtube']),
    url: z.string().url('Invalid URL'),
  }),

  addTag: z.object({
    tag: z.string().max(30).min(1),
  }),
};

/**
 * Agent validation schemas
 */
export const agentSchemas = {
  create: z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
    tagline: z.string().max(200).optional(),
    description: z.string().optional(),
    demoUrl: z.string().url().optional(),
    githubUrl: z.string().url().optional(),
    docsUrl: z.string().url().optional(),
    categoryId: z.string().optional(),
  }),

  update: z.object({
    name: z.string().min(1).max(100).optional(),
    tagline: z.string().max(200).optional(),
    description: z.string().optional(),
    demoUrl: z.string().url().optional(),
    githubUrl: z.string().url().optional(),
    docsUrl: z.string().url().optional(),
    categoryId: z.string().optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
  }),

  rate: z.object({
    overall: z.number().min(1).max(5),
    functionality: z.number().min(1).max(5).optional(),
    usability: z.number().min(1).max(5).optional(),
    documentation: z.number().min(1).max(5).optional(),
    codeQuality: z.number().min(1).max(5).optional(),
    design: z.number().min(1).max(5).optional(),
    comment: z.string().max(1000).optional(),
  }),
};

/**
 * Post validation schemas
 */
export const postSchemas = {
  create: z.object({
    channelId: z.string().min(1),
    title: z.string().min(1).max(200),
    content: z.string().min(1),
    type: z.enum(['normal', 'question', 'poll', 'share']).default('normal'),
    tags: z.array(z.string()).max(5).optional(),
  }),

  update: z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).optional(),
    tags: z.array(z.string()).max(5).optional(),
  }),
};

/**
 * Comment validation schemas
 */
export const commentSchemas = {
  create: z.object({
    content: z.string().min(1).max(5000),
    parentId: z.string().optional(),
  }),

  update: z.object({
    content: z.string().min(1).max(5000),
  }),
};

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

/**
 * ID parameter schema
 */
export const idParam = z.object({
  id: z.string().min(1),
});
