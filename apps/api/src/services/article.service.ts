import { db } from '@agenthub/db';
import { eq, desc, and, sql, SQL, inArray } from 'drizzle-orm';
import { schema } from '@agenthub/db';
const { articles, articleCategories, articleTags, articleSeries, articleSeriesItems, users } = schema;

// Generate unique ID
function generateId(): string {
  return `art_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Generate slug from title
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Calculate read time (roughly 200 words per minute)
function calculateReadTime(content: string): number {
  const wordCount = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

// ============== Article Categories ==============

export async function getArticleCategories() {
  return db
    .select()
    .from(articleCategories)
    .orderBy(articleCategories.sortOrder, articleCategories.name);
}

export async function getArticleCategoryById(id: string) {
  const result = await db
    .select()
    .from(articleCategories)
    .where(eq(articleCategories.id, id))
    .limit(1);
  return result[0] || null;
}

export async function getArticleCategoryBySlug(slug: string) {
  const result = await db
    .select()
    .from(articleCategories)
    .where(eq(articleCategories.slug, slug))
    .limit(1);
  return result[0] || null;
}

export async function createArticleCategory(data: {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}) {
  const id = `acat_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const slug = data.slug || slugify(data.name);
  
  await db.insert(articleCategories).values({
    id,
    name: data.name,
    slug,
    description: data.description || null,
    icon: data.icon || null,
    sortOrder: data.sortOrder || 0,
  });
  
  return { id, name: data.name, slug, description: data.description || null, icon: data.icon || null, sortOrder: data.sortOrder || 0 };
}

// ============== Articles ==============

export interface ArticleListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  categoryId: string | null;
  categoryName?: string | undefined;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  status: string;
  isFeatured: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  readTimeMinutes: number | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

export async function getArticles(options: {
  categoryId?: string;
  status?: string;
  authorId?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'publishedAt' | 'viewCount' | 'likeCount';
}): Promise<ArticleListItem[]> {
  const { categoryId, status = 'published', authorId, featured, limit = 20, offset = 0, orderBy = 'publishedAt' } = options;
  
  const conditions: SQL[] = [];
  
  if (status) {
    conditions.push(eq(articles.status, status));
  }
  if (categoryId) {
    conditions.push(eq(articles.categoryId, categoryId));
  }
  if (authorId) {
    conditions.push(eq(articles.authorId, authorId));
  }
  if (featured !== undefined) {
    conditions.push(eq(articles.isFeatured, featured));
  }
  
  const orderField = orderBy === 'publishedAt' ? articles.publishedAt : 
                    orderBy === 'viewCount' ? articles.viewCount :
                    orderBy === 'likeCount' ? articles.likeCount :
                    articles.createdAt;
  
  const result = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      coverImage: articles.coverImage,
      categoryId: articles.categoryId,
      authorId: articles.authorId,
      status: articles.status,
      isFeatured: articles.isFeatured,
      viewCount: articles.viewCount,
      likeCount: articles.likeCount,
      commentCount: articles.commentCount,
      readTimeMinutes: articles.readTimeMinutes,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .leftJoin(users, eq(articles.authorId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderField === articles.publishedAt ? desc(articles.publishedAt) :
            orderField === articles.viewCount ? desc(articles.viewCount) :
            orderField === articles.likeCount ? desc(articles.likeCount) :
            desc(articles.createdAt))
    .limit(limit)
    .offset(offset);
  
  // Get tags for each article
  const articlesWithTags = await Promise.all(
    result.map(async (article) => {
      const tagsResult = await db
        .select({ tag: articleTags.tag })
        .from(articleTags)
        .where(eq(articleTags.articleId, article.id));
      
      const categoryResult = article.categoryId
        ? await db
            .select({ name: articleCategories.name })
            .from(articleCategories)
            .where(eq(articleCategories.id, article.categoryId))
            .limit(1)
        : [];
      
      return {
        ...article,
        authorName: result.find(r => r.authorId === article.authorId)?.id ? 'User' : 'Unknown',
        authorAvatar: null,
        categoryName: categoryResult[0]?.name || undefined,
        tags: tagsResult.map(t => t.tag),
      };
    })
  );
  
  // Fetch author names separately
  const authorIds = [...new Set(result.map(r => r.authorId))];
  const authorMap: Record<string, { name: string; avatar: string | null }> = {};
  
  if (authorIds.length > 0) {
    const authors = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        username: users.username,
        avatar: users.avatar,
      })
      .from(users)
      .where(inArray(users.id, authorIds.length > 0 ? authorIds : ['__no_ids__']));
    
    authors.forEach(author => {
      authorMap[author.id] = {
        name: author.displayName || author.username,
        avatar: author.avatar,
      };
    });
  }
  
  return articlesWithTags.map(article => ({
    ...article,
    authorName: authorMap[article.authorId]?.name || 'Unknown',
    authorAvatar: authorMap[article.authorId]?.avatar || null,
  }));
}

export async function getArticleById(id: string) {
  const result = await db
    .select()
    .from(articles)
    .where(eq(articles.id, id))
    .limit(1);
  
  if (!result[0]) return null;
  
  const article = result[0];
  
  // Get tags
  const tagsResult = await db
    .select({ tag: articleTags.tag })
    .from(articleTags)
    .where(eq(articleTags.articleId, id));
  
  // Get author info
  const authorResult = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      username: users.username,
      avatar: users.avatar,
    })
    .from(users)
    .where(eq(users.id, article.authorId))
    .limit(1);
  
  // Get category
  const categoryResult = article.categoryId
    ? await db
        .select()
        .from(articleCategories)
        .where(eq(articleCategories.id, article.categoryId))
        .limit(1)
    : [];
  
  return {
    ...article,
    tags: tagsResult.map(t => t.tag),
    author: authorResult[0] ? {
      id: authorResult[0].id,
      name: authorResult[0].displayName || authorResult[0].username,
      avatar: authorResult[0].avatar,
    } : null,
    category: categoryResult[0] || null,
  };
}

export async function getArticleBySlug(slug: string) {
  const result = await db
    .select()
    .from(articles)
    .where(eq(articles.slug, slug))
    .limit(1);
  
  if (!result[0]) return null;
  return getArticleById(result[0].id);
}

export async function createArticle(data: {
  authorId: string;
  title: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  categoryId?: string;
  tags?: string[];
  status?: string;
}) {
  const id = generateId();
  const slug = slugify(data.title) + '-' + Date.now();
  const readTime = calculateReadTime(data.content);
  const now = Date.now();
  
  await db.insert(articles).values({
    id,
    authorId: data.authorId,
    title: data.title,
    slug,
    excerpt: data.excerpt || null,
    content: data.content,
    coverImage: data.coverImage || null,
    categoryId: data.categoryId || null,
    status: data.status || 'draft',
    readTimeMinutes: readTime,
    publishedAt: data.status === 'published' ? new Date(now) : null,
  });
  
  // Add tags
  if (data.tags && data.tags.length > 0) {
    const tagRecords = data.tags.map((tag, index) => ({
      id: `atag_${Date.now()}_${index}`,
      articleId: id,
      tag,
    }));
    await db.insert(articleTags).values(tagRecords);
  }
  
  return { id, slug, ...data };
}

export async function updateArticle(id: string, data: {
  title?: string;
  content?: string;
  excerpt?: string;
  coverImage?: string;
  categoryId?: string;
  tags?: string[];
  status?: string;
}) {
  const updates: Record<string, unknown> = {
    updatedAt: Date.now(),
  };
  
  if (data.title !== undefined) {
    updates.title = data.title;
    // Optionally update slug
  }
  if (data.content !== undefined) {
    updates.content = data.content;
    updates.readTimeMinutes = calculateReadTime(data.content);
  }
  if (data.excerpt !== undefined) updates.excerpt = data.excerpt;
  if (data.coverImage !== undefined) updates.coverImage = data.coverImage;
  if (data.categoryId !== undefined) updates.categoryId = data.categoryId;
  if (data.status !== undefined) {
    updates.status = data.status;
    if (data.status === 'published') {
      updates.publishedAt = Date.now();
    }
  }
  
  await db.update(articles).set(updates).where(eq(articles.id, id));
  
  // Update tags if provided
  if (data.tags !== undefined) {
    // Delete existing tags
    await db.delete(articleTags).where(eq(articleTags.articleId, id));
    
    // Add new tags
    if (data.tags.length > 0) {
      const tagRecords = data.tags.map((tag, index) => ({
        id: `atag_${Date.now()}_${index}`,
        articleId: id,
        tag,
      }));
      await db.insert(articleTags).values(tagRecords);
    }
  }
  
  return { id, ...data };
}

export async function deleteArticle(id: string) {
  // Delete tags first
  await db.delete(articleTags).where(eq(articleTags.articleId, id));
  // Delete series items
  await db.delete(articleSeriesItems).where(eq(articleSeriesItems.articleId, id));
  // Delete article
  await db.delete(articles).where(eq(articles.id, id));
  return { success: true };
}

export async function incrementArticleViewCount(id: string) {
  await db
    .update(articles)
    .set({ viewCount: sql`${articles.viewCount} + 1` })
    .where(eq(articles.id, id));
}

export async function likeArticle(id: string) {
  await db
    .update(articles)
    .set({ likeCount: sql`${articles.likeCount} + 1` })
    .where(eq(articles.id, id));
}

// ============== Article Series ==============

export async function getArticleSeries(authorId?: string) {
  const conditions: SQL[] = [];
  if (authorId) {
    conditions.push(eq(articleSeries.authorId, authorId));
  }
  
  const result = await db
    .select()
    .from(articleSeries)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(articleSeries.createdAt));
  
  // Get article count for each series
  const seriesWithCounts = await Promise.all(
    result.map(async (series) => {
      const countResult = await db
        .select({ count: sql`COUNT(*)` })
        .from(articleSeriesItems)
        .where(eq(articleSeriesItems.seriesId, series.id));
      
      return {
        ...series,
        articleCount: Number(countResult[0]?.count || 0),
      };
    })
  );
  
  return seriesWithCounts;
}

export async function getArticleSeriesWithArticles(seriesId: string) {
  const seriesResult = await db
    .select()
    .from(articleSeries)
    .where(eq(articleSeries.id, seriesId))
    .limit(1);
  
  if (!seriesResult[0]) return null;
  
  const series = seriesResult[0];
  
  const itemsResult = await db
    .select({
      id: articleSeriesItems.id,
      order: articleSeriesItems.order,
      article: articles,
    })
    .from(articleSeriesItems)
    .leftJoin(articles, eq(articleSeriesItems.articleId, articles.id))
    .where(eq(articleSeriesItems.seriesId, seriesId))
    .orderBy(articleSeriesItems.order);
  
  return {
    ...series,
    articles: itemsResult.map(item => item.article).filter(Boolean),
  };
}

// ============== Stats ==============

export async function getArticleStats() {
  const totalResult = await db
    .select({ count: sql`COUNT(*)` })
    .from(articles)
    .where(eq(articles.status, 'published'));
  
  const featuredResult = await db
    .select({ count: sql`COUNT(*)` })
    .from(articles)
    .where(and(eq(articles.status, 'published'), eq(articles.isFeatured, true)));
  
  const viewsResult = await db
    .select({ total: sql`SUM(view_count)` })
    .from(articles)
    .where(eq(articles.status, 'published'));
  
  return {
    total: Number(totalResult[0]?.count || 0),
    featured: Number(featuredResult[0]?.count || 0),
    totalViews: Number(viewsResult[0]?.total || 0),
  };
}