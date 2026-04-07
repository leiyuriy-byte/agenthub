import { eq, and, desc, asc, like, sql, or, type SQL } from 'drizzle-orm';
import { db, schema, type AgentCategory } from '@agenthub/db';
import { nanoid } from 'nanoid';
import { awardPointsForAction } from './points.service.js';

export interface CreateAgentData {
  ownerId: string;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  demoUrl?: string;
  githubUrl?: string;
  docsUrl?: string;
  categoryId?: string;
}

export interface UpdateAgentData {
  name?: string;
  tagline?: string;
  description?: string;
  demoUrl?: string;
  githubUrl?: string;
  docsUrl?: string;
  categoryId?: string;
  status?: 'draft' | 'published' | 'archived';
  logo?: string;
}

export interface RateAgentData {
  userId: string;
  overall: number;
  functionality?: number;
  usability?: number;
  documentation?: number;
  codeQuality?: number;
  design?: number;
  comment?: string;
}

export interface AgentListParams {
  limit?: number;
  offset?: number;
  categoryId?: string;
  status?: string;
  search?: string;
  sortBy?: 'createdAt' | 'viewCount' | 'starCount' | 'avgRating';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Agent service - handles Agent CRUD and interactions
 */
export const agentService = {
  /**
   * Create a new agent
   */
  async create(data: CreateAgentData) {
    const id = nanoid();

    const [agent] = await db.insert(schema.agents).values({
      id,
      ownerId: data.ownerId,
      name: data.name,
      slug: data.slug,
      tagline: data.tagline,
      description: data.description,
      demoUrl: data.demoUrl,
      githubUrl: data.githubUrl,
      docsUrl: data.docsUrl,
      categoryId: data.categoryId,
      status: 'draft',
    }).returning();

    return agent;
  },

  /**
   * Get agent by ID
   */
  async findById(id: string) {
    const [agent] = await db.select()
      .from(schema.agents)
      .where(eq(schema.agents.id, id))
      .limit(1);

    if (!agent) return null;

    // Get owner info
    const [owner] = await db.select({
      id: schema.users.id,
      username: schema.users.username,
      displayName: schema.users.displayName,
      avatar: schema.users.avatar,
    })
      .from(schema.users)
      .where(eq(schema.users.id, agent.ownerId))
      .limit(1);

    // Get category
    let category: AgentCategory | null = null;
    if (agent.categoryId) {
      const [cat] = await db.select()
        .from(schema.agentCategories)
        .where(eq(schema.agentCategories.id, agent.categoryId))
        .limit(1);
      category = cat || null;
    }

    // Get tags
    const tags = await db.select()
      .from(schema.agentTags)
      .where(eq(schema.agentTags.agentId, id));

    // Get screenshots
    const screenshots = await db.select()
      .from(schema.agentScreenshots)
      .where(eq(schema.agentScreenshots.agentId, id))
      .orderBy(schema.agentScreenshots.sortOrder);

    // Get versions
    const versions = await db.select()
      .from(schema.agentVersions)
      .where(eq(schema.agentVersions.agentId, id))
      .orderBy(desc(schema.agentVersions.createdAt));

    // Check if current user has favorited
    // (This will be populated by the route handler if userId is provided)

    return {
      ...agent,
      owner,
      category,
      tags: tags.map(t => t.tag),
      screenshots,
      versions,
    };
  },

  /**
   * Get agent by slug
   */
  async findBySlug(slug: string) {
    const [agent] = await db.select()
      .from(schema.agents)
      .where(eq(schema.agents.slug, slug))
      .limit(1);

    if (!agent) return null;
    return this.findById(agent.id);
  },

  /**
   * List agents with filtering, sorting, and pagination
   */
  async list(params: AgentListParams = {}) {
    const {
      limit = 20,
      offset = 0,
      categoryId,
      status = 'published',
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    // Build conditions
    const conditions: SQL[] = [];

    if (status) {
      conditions.push(eq(schema.agents.status, status));
    }

    if (categoryId) {
      conditions.push(eq(schema.agents.categoryId, categoryId));
    }

    if (search) {
      const searchCondition = or(
        like(schema.agents.name, `%${search}%`),
        like(schema.agents.tagline, `%${search}%`),
        like(schema.agents.description, `%${search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    // Build order by
    const orderFn = sortOrder === 'desc' ? desc : asc;
    let orderBy;
    switch (sortBy) {
      case 'viewCount':
        orderBy = orderFn(schema.agents.viewCount);
        break;
      case 'starCount':
        orderBy = orderFn(schema.agents.starCount);
        break;
      case 'avgRating':
        orderBy = orderFn(schema.agents.avgRating);
        break;
      default:
        orderBy = orderFn(schema.agents.createdAt);
    }

    // Build where condition - handle empty conditions case
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countQuery = db.select({
      count: sql<number>`count(*)`,
    })
      .from(schema.agents);
    
    if (whereCondition) {
      countQuery.where(whereCondition);
    }
    const [countResult] = await countQuery;

    // Get agents
    const agentsQuery = db.select()
      .from(schema.agents);
    
    if (whereCondition) {
      agentsQuery.where(whereCondition);
    }
    const agents = await agentsQuery
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Get owner info for each agent
    const agentsWithDetails = await Promise.all(
      agents.map(async (agent) => {
        const [owner] = await db.select({
          id: schema.users.id,
          username: schema.users.username,
          displayName: schema.users.displayName,
          avatar: schema.users.avatar,
        })
          .from(schema.users)
          .where(eq(schema.users.id, agent.ownerId))
          .limit(1);

        let category: AgentCategory | null = null;
        if (agent.categoryId) {
          const [cat] = await db.select()
            .from(schema.agentCategories)
            .where(eq(schema.agentCategories.id, agent.categoryId))
            .limit(1);
          category = cat || null;
        }

        const tags = await db.select()
          .from(schema.agentTags)
          .where(eq(schema.agentTags.agentId, agent.id));

        return {
          ...agent,
          owner,
          category,
          tags: tags.map(t => t.tag),
        };
      })
    );

    return {
      agents: agentsWithDetails,
      total: countResult!.count,
      limit,
      offset,
    };
  },

  /**
   * Update an agent
   */
  async update(id: string, data: UpdateAgentData, ownerId: string) {
    // Check ownership
    const [agent] = await db.select()
      .from(schema.agents)
      .where(eq(schema.agents.id, id))
      .limit(1);

    if (!agent) {
      throw new Error('Agent not found');
    }

    if (agent.ownerId !== ownerId) {
      throw new Error('Not authorized to update this agent');
    }

    const [updated] = await db.update(schema.agents)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.agents.id, id))
      .returning();

    return updated;
  },

  /**
   * Delete an agent
   */
  async delete(id: string, ownerId: string) {
    // Check ownership
    const [agent] = await db.select()
      .from(schema.agents)
      .where(eq(schema.agents.id, id))
      .limit(1);

    if (!agent) {
      throw new Error('Agent not found');
    }

    if (agent.ownerId !== ownerId) {
      throw new Error('Not authorized to delete this agent');
    }

    await db.delete(schema.agents).where(eq(schema.agents.id, id));

    return { success: true };
  },

  /**
   * Publish an agent (change status from draft to published)
   * Awards 50 points to the owner upon first publication
   */
  async publish(id: string, ownerId: string) {
    // Check if agent is currently draft (first publication)
    const [agent] = await db.select()
      .from(schema.agents)
      .where(eq(schema.agents.id, id))
      .limit(1);

    if (!agent) {
      throw new Error('Agent not found');
    }

    const isFirstPublish = agent.status === 'draft';

    // Update status to published
    const updated = await this.update(id, { status: 'published' }, ownerId);

    // Award points for first publication
    if (isFirstPublish) {
      try {
        await awardPointsForAction(ownerId, 'agent_published', id);
      } catch (error) {
        // Log error but don't fail the publish operation
        console.error('Failed to award points for agent publication:', error);
      }
    }

    return updated;
  },

  /**
   * Increment view count
   */
  async incrementViewCount(id: string) {
    await db.update(schema.agents)
      .set({
        viewCount: sql`${schema.agents.viewCount} + 1`,
      })
      .where(eq(schema.agents.id, id));
  },

  /**
   * Rate an agent
   */
  async rate(id: string, data: RateAgentData) {
    // Check if user already rated
    const [existing] = await db.select()
      .from(schema.agentRatings)
      .where(
        and(
          eq(schema.agentRatings.agentId, id),
          eq(schema.agentRatings.userId, data.userId)
        )
      )
      .limit(1);

    let rating;
    const ratingId = nanoid();
    if (existing) {
      // Update existing rating
      [rating] = await db.update(schema.agentRatings)
        .set({
          overall: data.overall,
          functionality: data.functionality,
          usability: data.usability,
          documentation: data.documentation,
          codeQuality: data.codeQuality,
          design: data.design,
          comment: data.comment,
          updatedAt: new Date(),
        })
        .where(eq(schema.agentRatings.id, existing.id))
        .returning();
    } else {
      // Create new rating
      [rating] = await db.insert(schema.agentRatings).values({
        id: ratingId,
        agentId: id,
        userId: data.userId,
        overall: data.overall,
        functionality: data.functionality,
        usability: data.usability,
        documentation: data.documentation,
        codeQuality: data.codeQuality,
        design: data.design,
        comment: data.comment,
      }).returning();
    }

    // Recalculate average rating
    const [stats] = await db.select({
      avg: sql<number>`avg(${schema.agentRatings.overall})`,
      count: sql<number>`count(*)`,
    })
      .from(schema.agentRatings)
      .where(eq(schema.agentRatings.agentId, id));

    if (!stats) return rating;

    await db.update(schema.agents)
      .set({
        avgRating: stats.avg,
        ratingCount: stats.count,
      })
      .where(eq(schema.agents.id, id));

    return rating;
  },

  /**
   * Get user's rating for an agent
   */
  async getUserRating(agentId: string, userId: string) {
    const [rating] = await db.select()
      .from(schema.agentRatings)
      .where(
        and(
          eq(schema.agentRatings.agentId, agentId),
          eq(schema.agentRatings.userId, userId)
        )
      )
      .limit(1);

    return rating || null;
  },

  /**
   * Favorite an agent
   */
  async favorite(agentId: string, userId: string) {
    // Check if already favorited
    const [existing] = await db.select()
      .from(schema.agentFavorites)
      .where(
        and(
          eq(schema.agentFavorites.agentId, agentId),
          eq(schema.agentFavorites.userId, userId)
        )
      )
      .limit(1);

    if (existing) {
      return { success: true, favorited: true };
    }

    const id = nanoid();
    await db.insert(schema.agentFavorites).values({
      id,
      agentId,
      userId,
    });

    // Increment favorite count
    await db.update(schema.agents)
      .set({
        favoriteCount: sql`${schema.agents.favoriteCount} + 1`,
      })
      .where(eq(schema.agents.id, agentId));

    return { success: true, favorited: true };
  },

  /**
   * Unfavorite an agent
   */
  async unfavorite(agentId: string, userId: string) {
    const result = await db.delete(schema.agentFavorites)
      .where(
        and(
          eq(schema.agentFavorites.agentId, agentId),
          eq(schema.agentFavorites.userId, userId)
        )
      );

    // Decrement favorite count
    await db.update(schema.agents)
      .set({
        favoriteCount: sql`${schema.agents.favoriteCount} - 1`,
      })
      .where(eq(schema.agents.id, agentId));

    return { success: true, favorited: false };
  },

  /**
   * Check if user has favorited an agent
   */
  async isFavorited(agentId: string, userId: string) {
    const [favorite] = await db.select()
      .from(schema.agentFavorites)
      .where(
        and(
          eq(schema.agentFavorites.agentId, agentId),
          eq(schema.agentFavorites.userId, userId)
        )
      )
      .limit(1);

    return !!favorite;
  },

  /**
   * Get user's favorites
   */
  async getUserFavorites(userId: string, limit = 20, offset = 0) {
    const favorites = await db.select({
      agentId: schema.agentFavorites.agentId,
      createdAt: schema.agentFavorites.createdAt,
    })
      .from(schema.agentFavorites)
      .where(eq(schema.agentFavorites.userId, userId))
      .orderBy(desc(schema.agentFavorites.createdAt))
      .limit(limit)
      .offset(offset);

    const agents = await Promise.all(
      favorites.map(async (fav) => {
        const [agent] = await db.select()
          .from(schema.agents)
          .where(eq(schema.agents.id, fav.agentId))
          .limit(1);
        return agent;
      })
    );

    return agents.filter(Boolean);
  },

  /**
   * Get featured agents
   */
  async getFeatured(limit = 10) {
    const agents = await db.select()
      .from(schema.agents)
      .where(
        and(
          eq(schema.agents.status, 'published'),
          eq(schema.agents.isFeatured, true)
        )
      )
      .orderBy(desc(schema.agents.starCount))
      .limit(limit);

    // Get owner info
    return Promise.all(
      agents.map(async (agent) => {
        const [owner] = await db.select({
          id: schema.users.id,
          username: schema.users.username,
          displayName: schema.users.displayName,
          avatar: schema.users.avatar,
        })
          .from(schema.users)
          .where(eq(schema.users.id, agent.ownerId))
          .limit(1);

        return { ...agent, owner };
      })
    );
  },

  /**
   * Get agent categories
   */
  async getCategories() {
    return db.select()
      .from(schema.agentCategories)
      .orderBy(schema.agentCategories.sortOrder);
  },

  /**
   * Get related agents (same category, excluding current agent)
   */
  async getRelatedAgents(agentId: string, categoryId: string | null, limit = 6) {
    // If no category, return recent agents
    if (!categoryId) {
      const agents = await db.select()
        .from(schema.agents)
        .where(
          and(
            eq(schema.agents.status, 'published'),
            sql`${schema.agents.id} != ${agentId}`
          )
        )
        .orderBy(desc(schema.agents.createdAt))
        .limit(limit);

      return Promise.all(
        agents.map(async (agent) => {
          const [owner] = await db.select({
            id: schema.users.id,
            username: schema.users.username,
            displayName: schema.users.displayName,
            avatar: schema.users.avatar,
          })
            .from(schema.users)
            .where(eq(schema.users.id, agent.ownerId))
            .limit(1);

          return { ...agent, owner };
        })
      );
    }

    // Get agents from same category
    const agents = await db.select()
      .from(schema.agents)
      .where(
        and(
          eq(schema.agents.status, 'published'),
          eq(schema.agents.categoryId, categoryId),
          sql`${schema.agents.id} != ${agentId}`
        )
      )
      .orderBy(desc(schema.agents.avgRating))
      .limit(limit);

    // If not enough in same category, get recent agents to fill
    if (agents.length < limit) {
      const recentAgents = await db.select()
        .from(schema.agents)
        .where(
          and(
            eq(schema.agents.status, 'published'),
            sql`${schema.agents.id} NOT IN (${sql.raw(agents.map(a => `'${a.id}'`).join(',')) || "''"})`,
            sql`${schema.agents.id} != ${agentId}`
          )
        )
        .orderBy(desc(schema.agents.createdAt))
        .limit(limit - agents.length);

      agents.push(...recentAgents);
    }

    return Promise.all(
      agents.map(async (agent) => {
        const [owner] = await db.select({
          id: schema.users.id,
          username: schema.users.username,
          displayName: schema.users.displayName,
          avatar: schema.users.avatar,
        })
          .from(schema.users)
          .where(eq(schema.users.id, agent.ownerId))
          .limit(1);

        return { ...agent, owner };
      })
    );
  },

  /**
   * Create agent category (for seeding)
   */
  async createCategory(name: string, slug: string, description?: string, icon?: string) {
    const id = nanoid();
    const [category] = await db.insert(schema.agentCategories).values({
      id,
      name,
      slug,
      description,
      icon,
    }).returning();
    return category;
  },

  /**
   * Get rating statistics for an agent
   */
  async getRatingStats(agentId: string) {
    // Get all ratings
    const ratings = await db.select()
      .from(schema.agentRatings)
      .where(eq(schema.agentRatings.agentId, agentId));

    if (ratings.length === 0) {
      return {
        total: 0,
        average: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        dimensions: {
          functionality: null,
          usability: null,
          documentation: null,
          codeQuality: null,
          design: null,
        },
      };
    }

    // Calculate distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;

    // Calculate dimension averages
    const dimensionSums = {
      functionality: { sum: 0, count: 0 },
      usability: { sum: 0, count: 0 },
      documentation: { sum: 0, count: 0 },
      codeQuality: { sum: 0, count: 0 },
      design: { sum: 0, count: 0 },
    };

    for (const rating of ratings) {
      sum += rating.overall;
      distribution[rating.overall as keyof typeof distribution]++;

      if (rating.functionality) {
        dimensionSums.functionality.sum += rating.functionality;
        dimensionSums.functionality.count++;
      }
      if (rating.usability) {
        dimensionSums.usability.sum += rating.usability;
        dimensionSums.usability.count++;
      }
      if (rating.documentation) {
        dimensionSums.documentation.sum += rating.documentation;
        dimensionSums.documentation.count++;
      }
      if (rating.codeQuality) {
        dimensionSums.codeQuality.sum += rating.codeQuality;
        dimensionSums.codeQuality.count++;
      }
      if (rating.design) {
        dimensionSums.design.sum += rating.design;
        dimensionSums.design.count++;
      }
    }

    const dimensions = {
      functionality: dimensionSums.functionality.count > 0
        ? dimensionSums.functionality.sum / dimensionSums.functionality.count
        : null,
      usability: dimensionSums.usability.count > 0
        ? dimensionSums.usability.sum / dimensionSums.usability.count
        : null,
      documentation: dimensionSums.documentation.count > 0
        ? dimensionSums.documentation.sum / dimensionSums.documentation.count
        : null,
      codeQuality: dimensionSums.codeQuality.count > 0
        ? dimensionSums.codeQuality.sum / dimensionSums.codeQuality.count
        : null,
      design: dimensionSums.design.count > 0
        ? dimensionSums.design.sum / dimensionSums.design.count
        : null,
    };

    return {
      total: ratings.length,
      average: sum / ratings.length,
      distribution,
      dimensions,
    };
  },

  /**
   * Get recent ratings for an agent
   */
  async getRatings(agentId: string, limit = 10, offset = 0) {
    const ratings = await db.select({
      id: schema.agentRatings.id,
      overall: schema.agentRatings.overall,
      functionality: schema.agentRatings.functionality,
      usability: schema.agentRatings.usability,
      documentation: schema.agentRatings.documentation,
      codeQuality: schema.agentRatings.codeQuality,
      design: schema.agentRatings.design,
      comment: schema.agentRatings.comment,
      createdAt: schema.agentRatings.createdAt,
    })
      .from(schema.agentRatings)
      .where(eq(schema.agentRatings.agentId, agentId))
      .orderBy(desc(schema.agentRatings.createdAt))
      .limit(limit)
      .offset(offset);

    // Get user info for each rating
    const ratingsWithUsers = await Promise.all(
      ratings.map(async (rating) => {
        const [user] = await db.select({
          id: schema.users.id,
          username: schema.users.username,
          displayName: schema.users.displayName,
          avatar: schema.users.avatar,
        })
          .from(schema.users)
          .where(eq(schema.users.id, (rating as any).userId))
          .limit(1);

        return { ...rating, user };
      })
    );

    return ratingsWithUsers;
  },
};

export default agentService;
