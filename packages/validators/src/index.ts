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

  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string()
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
    logo: z.string().url().optional().or(z.literal('')),
    demoUrl: z.string().url().optional().or(z.literal('')),
    githubUrl: z.string().url().optional().or(z.literal('')),
    docsUrl: z.string().url().optional().or(z.literal('')),
    categoryId: z.string().optional(),
  }),

  update: z.object({
    name: z.string().min(1).max(100).optional(),
    tagline: z.string().max(200).optional(),
    description: z.string().optional(),
    logo: z.string().url().optional().or(z.literal('')),
    demoUrl: z.string().url().optional().or(z.literal('')),
    githubUrl: z.string().url().optional().or(z.literal('')),
    docsUrl: z.string().url().optional().or(z.literal('')),
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

/**
 * Article validation schemas
 */
export const articleSchemas = {
  createCategory: z.object({
    name: z.string().min(1).max(50),
    slug: z.string().max(50).regex(/^[a-z0-9-]+$/).optional(),
    description: z.string().max(200).optional(),
    icon: z.string().optional(),
    sortOrder: z.number().min(0).optional(),
  }),

  create: z.object({
    title: z.string().min(1).max(200),
    content: z.string().min(1),
    excerpt: z.string().max(500).optional(),
    coverImage: z.string().url().optional().or(z.literal('')),
    categoryId: z.string().optional(),
    tags: z.array(z.string()).max(10).optional(),
    status: z.enum(['draft', 'published']).optional(),
  }),

  update: z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).optional(),
    excerpt: z.string().max(500).optional(),
    coverImage: z.string().url().optional().or(z.literal('')),
    categoryId: z.string().optional(),
    tags: z.array(z.string()).max(10).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
  }),
};

/**
 * Resource validation schemas
 */
export const resourceSchemas = {
  createCategory: z.object({
    name: z.string().min(1).max(50),
    slug: z.string().max(50).regex(/^[a-z0-9-]+$/).optional(),
    description: z.string().max(200).optional(),
    icon: z.string().optional(),
    sortOrder: z.number().min(0).optional(),
  }),

  create: z.object({
    name: z.string().min(1).max(100),
    description: z.string().min(1).max(1000),
    type: z.enum(['tool', 'dataset', 'api', 'learning']),
    url: z.string().url().optional().or(z.literal('')),
    coverImage: z.string().url().optional().or(z.literal('')),
    categoryId: z.string().optional(),
    tags: z.array(z.string()).max(10).optional(),
    isFree: z.boolean().optional(),
  }),

  update: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().min(1).max(1000).optional(),
    type: z.enum(['tool', 'dataset', 'api', 'learning']).optional(),
    url: z.string().url().optional().or(z.literal('')),
    coverImage: z.string().url().optional().or(z.literal('')),
    categoryId: z.string().optional(),
    tags: z.array(z.string()).max(10).optional(),
    isFree: z.boolean().optional(),
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    isFeatured: z.boolean().optional(),
  }),
};

/**
 * Activity validation schemas
 */
export const activitySchemas = {
  create: z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1),
    coverImage: z.string().url().optional().or(z.literal('')),
    type: z.enum(['online', 'offline']),
    location: z.string().max(200).optional(),
    startTime: z.number(),
    endTime: z.number(),
    maxAttendees: z.number().min(1).optional(),
  }),

  update: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).optional(),
    coverImage: z.string().url().optional().or(z.literal('')),
    type: z.enum(['online', 'offline']).optional(),
    location: z.string().max(200).optional(),
    startTime: z.number().optional(),
    endTime: z.number().optional(),
    maxAttendees: z.number().min(1).optional(),
    status: z.enum(['upcoming', 'ongoing', 'ended', 'cancelled']).optional(),
    isFeatured: z.boolean().optional(),
  }),
};

// Re-export schemas for convenience
export const createCategorySchema = articleSchemas.createCategory;
export const createArticleSchema = articleSchemas.create;
export const updateArticleSchema = articleSchemas.update;
export const createResourceSchema = resourceSchemas.create;
export const updateResourceSchema = resourceSchemas.update;
export const createActivitySchema = activitySchemas.create;
export const updateActivitySchema = activitySchemas.update;
