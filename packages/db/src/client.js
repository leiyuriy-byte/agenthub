import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
const DB_PATH = process.env.DATABASE_URL || 'libsql:file:./data/agenthub.db';
const client = createClient({
    url: DB_PATH,
    authToken: process.env.DATABASE_AUTH_TOKEN,
});
export const db = drizzle(client, { schema });
export { schema };
export { client };
export async function initializeDatabase() {
    const dbUrl = process.env.DATABASE_URL || 'libsql:file:./data/agenthub.db';
    await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      display_name TEXT,
      avatar TEXT,
      bio TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      level INTEGER NOT NULL DEFAULT 1,
      points INTEGER NOT NULL DEFAULT 0,
      is_verified INTEGER NOT NULL DEFAULT 0,
      last_login_at INTEGER,
      github_id TEXT UNIQUE,
      google_id TEXT UNIQUE,
      oauth_provider TEXT,
      email_notify_comment INTEGER NOT NULL DEFAULT 1,
      email_notify_follow INTEGER NOT NULL DEFAULT 1,
      email_notify_like INTEGER NOT NULL DEFAULT 1,
      email_notify_mention INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
  `);
    await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)
  `);
    await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS user_social_links (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS user_tags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS follows (
      id TEXT PRIMARY KEY,
      follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(follower_id, following_id)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS user_badges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge TEXT NOT NULL,
      earned_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      ip_address TEXT,
      user_agent TEXT,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS agent_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT,
      parent_id TEXT REFERENCES agent_categories(id),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      logo TEXT,
      tagline TEXT,
      description TEXT,
      demo_url TEXT,
      github_url TEXT,
      docs_url TEXT,
      category_id TEXT REFERENCES agent_categories(id),
      status TEXT NOT NULL DEFAULT 'draft',
      is_featured INTEGER NOT NULL DEFAULT 0,
      version TEXT NOT NULL DEFAULT '1.0.0',
      view_count INTEGER NOT NULL DEFAULT 0,
      star_count INTEGER NOT NULL DEFAULT 0,
      favorite_count INTEGER NOT NULL DEFAULT 0,
      comment_count INTEGER NOT NULL DEFAULT 0,
      avg_rating REAL,
      rating_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_agents_owner ON agents(owner_id)
  `);
    await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug)
  `);
    await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)
  `);
    await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_agents_category ON agents(category_id)
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS agent_tags (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS agent_screenshots (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      caption TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS agent_versions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      version TEXT NOT NULL,
      changelog TEXT,
      download_url TEXT,
      features TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS agent_ratings (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      overall INTEGER NOT NULL,
      functionality INTEGER,
      usability INTEGER,
      documentation INTEGER,
      code_quality INTEGER,
      design INTEGER,
      comment TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(agent_id, user_id)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS agent_favorites (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(agent_id, user_id)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT,
      type TEXT NOT NULL DEFAULT 'public',
      is_default INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'normal',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      view_count INTEGER NOT NULL DEFAULT 0,
      like_count INTEGER NOT NULL DEFAULT 0,
      dislike_count INTEGER NOT NULL DEFAULT 0,
      comment_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id)
  `);
    await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_posts_channel ON posts(channel_id)
  `);
    await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type)
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS post_tags (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS post_votes (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      value INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(post_id, user_id)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS post_favorites (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(post_id, user_id)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      is_accepted INTEGER NOT NULL DEFAULT 0,
      like_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id)
  `);
    await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id)
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS comment_votes (
      id TEXT PRIMARY KEY,
      comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      value INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(comment_id, user_id)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      is_multi_select INTEGER NOT NULL DEFAULT 0,
      ends_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS poll_options (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS poll_votes (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      option_id TEXT NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      ip_address TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      link TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)
  `);
    await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS conversation_participants (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_read_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      metadata TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
    await client.execute(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewer_id TEXT REFERENCES users(id),
      resolution TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      resolved_at INTEGER
    )
  `);
    console.log('✅ Database initialized successfully');
    await runMigrations();
}
async function runMigrations() {
    try {
        const result = await client.execute(`
      PRAGMA table_info(agent_versions)
    `);
        const columns = result.rows || [];
        const featuresExists = columns.some((col) => col.name === 'features');
        if (!featuresExists) {
            await client.execute(`
        ALTER TABLE agent_versions ADD COLUMN features TEXT
      `);
            console.log('✅ Migration: Added features column to agent_versions');
        }
    }
    catch (error) {
        console.error('⚠️ Migration error:', error);
    }
}
export default db;
//# sourceMappingURL=client.js.map