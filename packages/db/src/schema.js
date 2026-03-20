import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const users = sqliteTable('users', {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name'),
    avatar: text('avatar'),
    bio: text('bio'),
    role: text('role').notNull().default('user'),
    level: integer('level').notNull().default(1),
    points: integer('points').notNull().default(0),
    isVerified: integer('is_verified', { mode: 'boolean' }).notNull().default(false),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const userSocialLinks = sqliteTable('user_social_links', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(),
    url: text('url').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const userTags = sqliteTable('user_tags', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tag: text('tag').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const follows = sqliteTable('follows', {
    id: text('id').primaryKey(),
    followerId: text('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    followingId: text('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const userBadges = sqliteTable('user_badges', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    badge: text('badge').notNull(),
    earnedAt: integer('earned_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const sessions = sqliteTable('sessions', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const emailVerifications = sqliteTable('email_verifications', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const passwordResets = sqliteTable('password_resets', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    usedAt: integer('used_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const agentCategories = sqliteTable('agent_categories', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    icon: text('icon'),
    parentId: text('parent_id').references(() => agentCategories.id),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const agents = sqliteTable('agents', {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    logo: text('logo'),
    tagline: text('tagline'),
    description: text('description'),
    demoUrl: text('demo_url'),
    githubUrl: text('github_url'),
    docsUrl: text('docs_url'),
    categoryId: text('category_id').references(() => agentCategories.id),
    status: text('status').notNull().default('draft'),
    isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
    version: text('version').notNull().default('1.0.0'),
    viewCount: integer('view_count').notNull().default(0),
    starCount: integer('star_count').notNull().default(0),
    favoriteCount: integer('favorite_count').notNull().default(0),
    commentCount: integer('comment_count').notNull().default(0),
    avgRating: real('avg_rating'),
    ratingCount: integer('rating_count').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const agentTags = sqliteTable('agent_tags', {
    id: text('id').primaryKey(),
    agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
    tag: text('tag').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const agentScreenshots = sqliteTable('agent_screenshots', {
    id: text('id').primaryKey(),
    agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    caption: text('caption'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const agentVersions = sqliteTable('agent_versions', {
    id: text('id').primaryKey(),
    agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
    version: text('version').notNull(),
    changelog: text('changelog'),
    downloadUrl: text('download_url'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const agentRatings = sqliteTable('agent_ratings', {
    id: text('id').primaryKey(),
    agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    overall: integer('overall').notNull(),
    functionality: integer('functionality'),
    usability: integer('usability'),
    documentation: integer('documentation'),
    codeQuality: integer('code_quality'),
    design: integer('design'),
    comment: text('comment'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const agentFavorites = sqliteTable('agent_favorites', {
    id: text('id').primaryKey(),
    agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const channels = sqliteTable('channels', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    icon: text('icon'),
    type: text('type').notNull().default('public'),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const posts = sqliteTable('posts', {
    id: text('id').primaryKey(),
    authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    channelId: text('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content').notNull(),
    type: text('type').notNull().default('normal'),
    isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
    isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
    viewCount: integer('view_count').notNull().default(0),
    likeCount: integer('like_count').notNull().default(0),
    dislikeCount: integer('dislike_count').notNull().default(0),
    commentCount: integer('comment_count').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const postTags = sqliteTable('post_tags', {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
    tag: text('tag').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const postVotes = sqliteTable('post_votes', {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    value: integer('value').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const postFavorites = sqliteTable('post_favorites', {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const comments = sqliteTable('comments', {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
    parentId: text('parent_id').references(() => comments.id, { onDelete: 'cascade' }),
    authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    isAccepted: integer('is_accepted', { mode: 'boolean' }).notNull().default(false),
    likeCount: integer('like_count').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const commentVotes = sqliteTable('comment_votes', {
    id: text('id').primaryKey(),
    commentId: text('comment_id').notNull().references(() => comments.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    value: integer('value').notNull().default(1),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const polls = sqliteTable('polls', {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
    question: text('question').notNull(),
    isAnonymous: integer('is_anonymous', { mode: 'boolean' }).notNull().default(false),
    isMultiSelect: integer('is_multi_select', { mode: 'boolean' }).notNull().default(false),
    endsAt: integer('ends_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const pollOptions = sqliteTable('poll_options', {
    id: text('id').primaryKey(),
    pollId: text('poll_id').notNull().references(() => polls.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
});
export const pollVotes = sqliteTable('poll_votes', {
    id: text('id').primaryKey(),
    pollId: text('poll_id').notNull().references(() => polls.id, { onDelete: 'cascade' }),
    optionId: text('option_id').notNull().references(() => pollOptions.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    ipAddress: text('ip_address'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const notifications = sqliteTable('notifications', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    link: text('link'),
    isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const conversations = sqliteTable('conversations', {
    id: text('id').primaryKey(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const conversationParticipants = sqliteTable('conversation_participants', {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    lastReadAt: integer('last_read_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const messages = sqliteTable('messages', {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    type: text('type').notNull().default('text'),
    metadata: text('metadata'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
});
export const reports = sqliteTable('reports', {
    id: text('id').primaryKey(),
    reporterId: text('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    reason: text('reason').notNull(),
    status: text('status').notNull().default('pending'),
    reviewerId: text('reviewer_id').references(() => users.id),
    resolution: text('resolution'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql `CURRENT_TIMESTAMP`),
    resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
});
//# sourceMappingURL=schema.js.map