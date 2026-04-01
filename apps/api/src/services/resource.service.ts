import { db } from '@agenthub/db';
import { eq, desc, and, sql, SQL } from 'drizzle-orm';
import { schema } from '@agenthub/db';
const { resources, resourceCategories, users } = schema;

// Generate unique ID
function generateId(): string {
  return `res_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Generate slug from name
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ============== Resource Categories ==============

export async function getResourceCategories() {
  return db
    .select()
    .from(resourceCategories)
    .orderBy(resourceCategories.sortOrder, resourceCategories.name);
}

export async function getResourceCategoryById(id: string) {
  const result = await db
    .select()
    .from(resourceCategories)
    .where(eq(resourceCategories.id, id))
    .limit(1);
  return result[0] || null;
}

export async function getResourceCategoryBySlug(slug: string) {
  const result = await db
    .select()
    .from(resourceCategories)
    .where(eq(resourceCategories.slug, slug))
    .limit(1);
  return result[0] || null;
}

export async function createResourceCategory(data: {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}) {
  const id = `rcat_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const slug = data.slug || slugify(data.name);
  
  await db.insert(resourceCategories).values({
    id,
    name: data.name,
    slug,
    description: data.description || null,
    icon: data.icon || null,
    sortOrder: data.sortOrder || 0,
  });
  
  return { id, name: data.name, slug, description: data.description || null, icon: data.icon || null, sortOrder: data.sortOrder || 0 };
}

// ============== Resources ==============

export interface ResourceListItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  url: string | null;
  coverImage: string | null;
  categoryId: string | null;
  categoryName?: string;
  tags: string[];
  isFree: boolean;
  isFeatured: boolean;
  viewCount: number;
  likeCount: number;
  submitterId: string | null;
  submitterName?: string;
  status: string;
  createdAt: number;
}

export async function getResources(options: {
  categoryId?: string;
  type?: string;
  status?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'viewCount' | 'likeCount';
}): Promise<ResourceListItem[]> {
  const { categoryId, type, status = 'approved', featured, limit = 20, offset = 0, orderBy = 'createdAt' } = options;
  
  const conditions: SQL[] = [];
  
  if (status) {
    conditions.push(eq(resources.status, status));
  }
  if (categoryId) {
    conditions.push(eq(resources.categoryId, categoryId));
  }
  if (type) {
    conditions.push(eq(resources.type, type));
  }
  if (featured !== undefined) {
    conditions.push(eq(resources.isFeatured, featured));
  }
  
  const orderField = orderBy === 'viewCount' ? resources.viewCount :
                    orderBy === 'likeCount' ? resources.likeCount :
                    resources.createdAt;
  
  const result = await db
    .select()
    .from(resources)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(orderField))
    .limit(limit)
    .offset(offset);
  
  // Get category names and submitter names
  const categoryIds = [...new Set(result.map(r => r.categoryId).filter(Boolean))];
  const submitterIds = [...new Set(result.map(r => r.submitterId).filter(Boolean))];
  
  const categoryMap: Record<string, string> = {};
  const submitterMap: Record<string, string> = {};
  
  if (categoryIds.length > 0) {
    const categories = await db
      .select({ id: resourceCategories.id, name: resourceCategories.name })
      .from(resourceCategories)
      .where(sql`${resourceCategories.id} IN ${categoryIds}`);
    categories.forEach(c => categoryMap[c.id] = c.name);
  }
  
  if (submitterIds.length > 0) {
    const submitters = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        username: users.username,
      })
      .from(users)
      .where(sql`${users.id} IN ${submitterIds}`);
    submitters.forEach(u => {
      submitterMap[u.id] = u.displayName || u.username;
    });
  }
  
  return result.map(resource => ({
    ...resource,
    categoryName: resource.categoryId ? categoryMap[resource.categoryId] || null : null,
    submitterName: resource.submitterId ? submitterMap[resource.submitterId] || null : null,
    tags: resource.tags ? JSON.parse(resource.tags) : [],
  }));
}

export async function getResourceById(id: string) {
  const result = await db
    .select()
    .from(resources)
    .where(eq(resources.id, id))
    .limit(1);
  
  if (!result[0]) return null;
  
  const resource = result[0];
  
  // Get category
  const categoryResult = resource.categoryId
    ? await db
        .select()
        .from(resourceCategories)
        .where(eq(resourceCategories.id, resource.categoryId))
        .limit(1)
    : [];
  
  // Get submitter info
  const submitterResult = resource.submitterId
    ? await db
        .select({
          id: users.id,
          displayName: users.displayName,
          username: users.username,
          avatar: users.avatar,
        })
        .from(users)
        .where(eq(users.id, resource.submitterId))
        .limit(1)
    : [];
  
  return {
    ...resource,
    category: categoryResult[0] || null,
    submitter: submitterResult[0] ? {
      id: submitterResult[0].id,
      name: submitterResult[0].displayName || submitterResult[0].username,
      avatar: submitterResult[0].avatar,
    } : null,
    tags: resource.tags ? JSON.parse(resource.tags) : [],
  };
}

export async function getResourceBySlug(slug: string) {
  const result = await db
    .select()
    .from(resources)
    .where(eq(resources.slug, slug))
    .limit(1);
  
  if (!result[0]) return null;
  return getResourceById(result[0].id);
}

export async function createResource(data: {
  name: string;
  description: string;
  type: string;
  url?: string;
  coverImage?: string;
  categoryId?: string;
  tags?: string[];
  isFree?: boolean;
  submitterId?: string;
  status?: string;
}) {
  const id = generateId();
  const slug = slugify(data.name) + '-' + Date.now();
  
  await db.insert(resources).values({
    id,
    name: data.name,
    slug,
    description: data.description,
    type: data.type,
    url: data.url || null,
    coverImage: data.coverImage || null,
    categoryId: data.categoryId || null,
    tags: data.tags ? JSON.stringify(data.tags) : null,
    isFree: data.isFree ?? true,
    submitterId: data.submitterId || null,
    status: data.status || 'pending',
  });
  
  return { id, slug, ...data };
}

export async function updateResource(id: string, data: {
  name?: string;
  description?: string;
  type?: string;
  url?: string;
  coverImage?: string;
  categoryId?: string;
  tags?: string[];
  isFree?: boolean;
  status?: string;
  isFeatured?: boolean;
}) {
  const updates: Record<string, unknown> = {
    updatedAt: Date.now(),
  };
  
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.type !== undefined) updates.type = data.type;
  if (data.url !== undefined) updates.url = data.url;
  if (data.coverImage !== undefined) updates.coverImage = data.coverImage;
  if (data.categoryId !== undefined) updates.categoryId = data.categoryId;
  if (data.tags !== undefined) updates.tags = JSON.stringify(data.tags);
  if (data.isFree !== undefined) updates.isFree = data.isFree;
  if (data.status !== undefined) updates.status = data.status;
  if (data.isFeatured !== undefined) updates.isFeatured = data.isFeatured;
  
  await db.update(resources).set(updates).where(eq(resources.id, id));
  
  return { id, ...data };
}

export async function deleteResource(id: string) {
  await db.delete(resources).where(eq(resources.id, id));
  return { success: true };
}

export async function incrementResourceViewCount(id: string) {
  await db
    .update(resources)
    .set({ viewCount: sql`${resources.viewCount} + 1` })
    .where(eq(resources.id, id));
}

export async function likeResource(id: string) {
  await db
    .update(resources)
    .set({ likeCount: sql`${resources.likeCount} + 1` })
    .where(eq(resources.id, id));
}

// ============== Stats ==============

export async function getResourceStats() {
  const totalResult = await db
    .select({ count: sql`COUNT(*)` })
    .from(resources)
    .where(eq(resources.status, 'approved'));
  
  const featuredResult = await db
    .select({ count: sql`COUNT(*)` })
    .from(resources)
    .where(and(eq(resources.status, 'approved'), eq(resources.isFeatured, true)));
  
  const byTypeResult = await db
    .select({ type: resources.type, count: sql`COUNT(*)` })
    .from(resources)
    .where(eq(resources.status, 'approved'))
    .groupBy(resources.type);
  
  return {
    total: Number(totalResult[0]?.count || 0),
    featured: Number(featuredResult[0]?.count || 0),
    byType: byTypeResult.map(r => ({ type: r.type, count: Number(r.count) })),
  };
}