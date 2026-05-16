import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============== User System ==============

/** Users table */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash'),
  displayName: text('display_name'),
  avatar: text('avatar'),
  bio: text('bio'),
  role: text('role').notNull().default('user'), // user, moderator, admin
  level: integer('level').notNull().default(1),
  points: integer('points').notNull().default(0),
  isVerified: integer('is_verified', { mode: 'boolean' }).notNull().default(false),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
  // OAuth fields
  githubId: text('github_id').unique(),
  googleId: text('google_id').unique(),
  oauthProvider: text('oauth_provider'), // 'github' | 'google' | null
  // Email notification preferences
  emailNotifyOnComment: integer('email_notify_comment', { mode: 'boolean' }).notNull().default(true),
  emailNotifyOnFollow: integer('email_notify_follow', { mode: 'boolean' }).notNull().default(true),
  emailNotifyOnLike: integer('email_notify_like', { mode: 'boolean' }).notNull().default(true),
  emailNotifyOnMention: integer('email_notify_mention', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** User social links */
export const userSocialLinks = sqliteTable('user_social_links', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(), // github, twitter, website
  url: text('url').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** User tech stack tags */
export const userTags = sqliteTable('user_tags', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tag: text('tag').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Follows (followers/following) */
export const follows = sqliteTable('follows', {
  id: text('id').primaryKey(),
  followerId: text('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  followingId: text('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** User achievements/badges */
export const userBadges = sqliteTable('user_badges', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  badge: text('badge').notNull(),
  earnedAt: integer('earned_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Login sessions */
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Email verification tokens */
export const emailVerifications = sqliteTable('email_verifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Password reset tokens */
export const passwordResets = sqliteTable('password_resets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  usedAt: integer('used_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ============== Agent System ==============

/** Agent categories */
export const agentCategories = sqliteTable('agent_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  icon: text('icon'),
  parentId: text('parent_id'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Agents */
export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  logo: text('logo'),
  tagline: text('tagline'), // 一句话描述
  description: text('description'), // 完整介绍 (Markdown)
  demoUrl: text('demo_url'),
  githubUrl: text('github_url'),
  docsUrl: text('docs_url'),
  categoryId: text('category_id'),
  status: text('status').notNull().default('draft'), // draft, published, archived
  isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
  version: text('version').notNull().default('1.0.0'),
  viewCount: integer('view_count').notNull().default(0),
  starCount: integer('star_count').notNull().default(0),
  favoriteCount: integer('favorite_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  avgRating: real('avg_rating'),
  ratingCount: integer('rating_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Agent tags */
export const agentTags = sqliteTable('agent_tags', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  tag: text('tag').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Agent screenshots */
export const agentScreenshots = sqliteTable('agent_screenshots', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  caption: text('caption'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Agent versions */
export const agentVersions = sqliteTable('agent_versions', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  version: text('version').notNull(),
  changelog: text('changelog'),
  downloadUrl: text('download_url'),
  features: text('features'), // JSON array of feature strings for version comparison
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Agent ratings */
export const agentRatings = sqliteTable('agent_ratings', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  overall: integer('overall').notNull(), // 1-5
  functionality: integer('functionality'),
  usability: integer('usability'),
  documentation: integer('documentation'),
  codeQuality: integer('code_quality'),
  design: integer('design'),
  comment: text('comment'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Agent comments - discussion/comments on agent detail pages */
export const agentComments = sqliteTable('agent_comments', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentId: text('parent_id'), // for nested replies
  content: text('content').notNull(), // Markdown supported
  screenshotUrl: text('screenshot_url'), // optional screenshot attachment
  likeCount: integer('like_count').notNull().default(0),
  isHidden: integer('is_hidden', { mode: 'boolean' }).notNull().default(false), // hidden by moderator
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Agent comment likes */
export const agentCommentLikes = sqliteTable('agent_comment_likes', {
  id: text('id').primaryKey(),
  commentId: text('comment_id').notNull().references(() => agentComments.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** User feedback - bug reports and feature suggestions */
export const userFeedback = sqliteTable('user_feedback', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // bug_report, feature_suggestion
  title: text('title').notNull(),
  description: text('description').notNull(),
  screenshots: text('screenshots'), // JSON array of screenshot URLs
  status: text('status').notNull().default('pending'), // pending, in_progress, resolved, rejected
  priority: text('priority'), // low, medium, high
  resolution: text('resolution'), // resolution notes from admin
  adminResponse: text('admin_response'), // response to the user
  reviewedBy: text('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
});

/** Agent favorites */
export const agentFavorites = sqliteTable('agent_favorites', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ============== Community System ==============

/** Discussion channels/categories */
export const channels = sqliteTable('channels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  icon: text('icon'),
  type: text('type').notNull().default('public'), // public, private
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Posts */
export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channelId: text('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(), // Markdown
  type: text('type').notNull().default('normal'), // normal, question, poll, share
  isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
  viewCount: integer('view_count').notNull().default(0),
  likeCount: integer('like_count').notNull().default(0),
  dislikeCount: integer('dislike_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Post tags */
export const postTags = sqliteTable('post_tags', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  tag: text('tag').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Post votes */
export const postVotes = sqliteTable('post_votes', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  value: integer('value').notNull(), // 1 for like, -1 for dislike
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Post favorites */
export const postFavorites = sqliteTable('post_favorites', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Comments */
export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  parentId: text('parent_id'),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  isAccepted: integer('is_accepted', { mode: 'boolean' }).notNull().default(false), // for Q&A
  likeCount: integer('like_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Comment votes */
export const commentVotes = sqliteTable('comment_votes', {
  id: text('id').primaryKey(),
  commentId: text('comment_id').notNull().references(() => comments.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  value: integer('value').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Polls (within posts) */
export const polls = sqliteTable('polls', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  isAnonymous: integer('is_anonymous', { mode: 'boolean' }).notNull().default(false),
  isMultiSelect: integer('is_multi_select', { mode: 'boolean' }).notNull().default(false),
  endsAt: integer('ends_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Poll options */
export const pollOptions = sqliteTable('poll_options', {
  id: text('id').primaryKey(),
  pollId: text('poll_id').notNull().references(() => polls.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

/** Poll votes */
export const pollVotes = sqliteTable('poll_votes', {
  id: text('id').primaryKey(),
  pollId: text('poll_id').notNull().references(() => polls.id, { onDelete: 'cascade' }),
  optionId: text('option_id').notNull().references(() => pollOptions.id, { onDelete: 'cascade' }),
  userId: text('user_id'),
  ipAddress: text('ip_address'), // for anonymous voting
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ============== Notifications ==============

/** Notifications */
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // like, comment, follow, mention, system
  title: text('title').notNull(),
  content: text('content'),
  link: text('link'),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ============== Messaging (Private Messages) ==============

/** Conversations */
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Conversation participants */
export const conversationParticipants = sqliteTable('conversation_participants', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lastReadAt: integer('last_read_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Messages */
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  type: text('type').notNull().default('text'), // text, image, file
  metadata: text('metadata'), // JSON for file info
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ============== Reports & Moderation ==============

/** Reports */
export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  reporterId: text('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetType: text('target_type').notNull(), // post, comment, agent, user
  targetId: text('target_id').notNull(),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('pending'), // pending, reviewed, resolved, rejected
  reviewerId: text('reviewer_id'),
  resolution: text('resolution'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
});

// ============== Points & Level System ==============

/** Point transactions - history of point changes */
export const pointTransactions = sqliteTable('point_transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  points: integer('points').notNull(), // positive or negative
  reason: text('reason').notNull(), // agent_published, post_created, answer_accepted, daily_checkin, like_received
  referenceId: text('reference_id'), // related entity ID (agent_id, post_id, etc.)
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** Daily check-in records */
export const userCheckins = sqliteTable('user_checkins', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // YYYY-MM-DD format for easy lookup
  points: integer('points').notNull().default(5),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ============== Type Exports ==============

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Channel = typeof channels.$inferSelect;
export type Notification = typeof notifications.$inferSelect;

// Feedback types
export type AgentComment = typeof agentComments.$inferSelect;
export type NewAgentComment = typeof agentComments.$inferInsert;
export type UserFeedback = typeof userFeedback.$inferSelect;
export type NewUserFeedback = typeof userFeedback.$inferInsert;
