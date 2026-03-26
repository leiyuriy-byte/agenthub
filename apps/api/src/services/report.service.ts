/**
 * Report Service - Handle content reporting and moderation
 */

import { db } from '@agenthub/db';
import { reports, users, agents, posts, comments } from '@agenthub/db/schema';
import { eq, and, desc, sql, like, or, inArray } from 'drizzle-orm';

export interface CreateReportInput {
  reporterId: string;
  targetType: 'agent' | 'post' | 'comment' | 'user';
  targetId: string;
  reason: string;
}

export interface ReportListParams {
  limit?: number;
  offset?: number;
  status?: 'pending' | 'reviewed' | 'resolved' | 'rejected';
  targetType?: string;
  search?: string;
}

export interface ReportWithDetails {
  id: string;
  reporterId: string;
  reporter?: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  reviewerId: string | null;
  reviewer?: {
    id: string;
    username: string;
    displayName: string | null;
  };
  resolution: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  // Target details
  targetDetails?: {
    type: string;
    title: string;
    author?: string;
    status?: string;
    url: string;
  };
}

class ReportService {
  /**
   * Create a new report
   */
  async create(input: CreateReportInput): Promise<ReportWithDetails> {
    // Verify the target exists
    const targetExists = await this.verifyTarget(input.targetType, input.targetId);
    if (!targetExists) {
      throw new Error('Target not found');
    }

    // Check if user already reported this target recently
    const existingReport = await db
      .select()
      .from(reports)
      .where(
        and(
          eq(reports.reporterId, input.reporterId),
          eq(reports.targetType, input.targetType),
          eq(reports.targetId, input.targetId),
          eq(reports.status, 'pending')
        )
      )
      .limit(1);

    if (existingReport.length > 0) {
      throw new Error('You have already reported this content');
    }

    const [report] = await db
      .insert(reports)
      .values({
        id: crypto.randomUUID(),
        reporterId: input.reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        status: 'pending',
      })
      .returning();

    if (!report || !report.id) {
      throw new Error('Failed to create report');
    }

    return this.getById(report.id) as Promise<ReportWithDetails>;
  }

  /**
   * Get report by ID
   */
  async getById(id: string): Promise<ReportWithDetails | null> {
    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, id))
      .limit(1);

    if (!report) return null;

    return this.enrichReport(report);
  }

  /**
   * List reports with filtering
   */
  async list(params: ReportListParams): Promise<{ reports: ReportWithDetails[]; total: number }> {
    const { limit = 20, offset = 0, status, targetType, search } = params;

    const conditions = [];

    if (status) {
      conditions.push(eq(reports.status, status));
    }

    if (targetType) {
      conditions.push(eq(reports.targetType, targetType));
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(reports)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const totalCount = countResult?.count ?? 0;

    // Get paginated results
    const reportList = await db
      .select()
      .from(reports)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(reports.createdAt))
      .limit(limit)
      .offset(offset);

    // Enrich each report
    const enrichedReports = await Promise.all(
      reportList.map((report) => this.enrichReport(report))
    );

    return {
      reports: enrichedReports,
      total: countResult.count,
    };
  }

  /**
   * Get pending report count
   */
  async getPendingCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(reports)
      .where(eq(reports.status, 'pending'));

    return result?.count ?? 0;
  }

  /**
   * Resolve a report (admin action)
   */
  async resolve(
    reportId: string,
    reviewerId: string,
    resolution: 'ignored' | 'warning' | 'deleted' | 'banned',
    targetAction?: string
  ): Promise<ReportWithDetails> {
    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);

    if (!report) {
      throw new Error('Report not found');
    }

    if (report.status !== 'pending') {
      throw new Error('Report has already been processed');
    }

    // Update report
    const [updated] = await db
      .update(reports)
      .set({
        status: 'resolved',
        reviewerId,
        resolution: targetAction || resolution,
        resolvedAt: new Date(),
      })
      .where(eq(reports.id, reportId))
      .returning();

    if (!updated) {
      throw new Error('Failed to update report');
    }

    // Take action based on resolution
    await this.takeAction(report.targetType, report.targetId, resolution);

    return this.getById(updated.id) as Promise<ReportWithDetails>;
  }

  /**
   * Reject a report (admin action)
   */
  async reject(reportId: string, reviewerId: string): Promise<ReportWithDetails> {
    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);

    if (!report) {
      throw new Error('Report not found');
    }

    if (report.status !== 'pending') {
      throw new Error('Report has already been processed');
    }

    const [updated] = await db
      .update(reports)
      .set({
        status: 'rejected',
        reviewerId,
        resolvedAt: new Date(),
      })
      .where(eq(reports.id, reportId))
      .returning();

    return this.getById(updated.id) as Promise<ReportWithDetails>;
  }

  /**
   * Helper: Verify target exists
   */
  private async verifyTarget(type: string, id: string): Promise<boolean> {
    switch (type) {
      case 'agent': {
        const [agent] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
        return !!agent;
      }
      case 'post': {
        const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
        return !!post;
      }
      case 'comment': {
        const [comment] = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
        return !!comment;
      }
      case 'user': {
        const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
        return !!user;
      }
      default:
        return false;
    }
  }

  /**
   * Helper: Enrich report with reporter and target details
   */
  private async enrichReport(report: typeof reports.$inferSelect): Promise<ReportWithDetails> {
    // Get reporter info
    const [reporter] = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatar: users.avatar,
      })
      .from(users)
      .where(eq(users.id, report.reporterId))
      .limit(1);

    // Get reviewer info if exists
    let reviewer: { id: string; username: string; displayName: string | null } | undefined;
    if (report.reviewerId) {
      const [reviewerUser] = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
        })
        .from(users)
        .where(eq(users.id, report.reviewerId))
        .limit(1);
      reviewer = reviewerUser;
    }

    // Get target details
    const targetDetails = await this.getTargetDetails(report.targetType, report.targetId);

    return {
      ...report,
      reporter,
      reviewer,
      targetDetails: targetDetails || undefined,
    };
  }

  /**
   * Helper: Get target details for display
   */
  private async getTargetDetails(
    type: string,
    id: string
  ): Promise<{ type: string; title: string; author?: string; status?: string; url: string } | null> {
    switch (type) {
      case 'agent': {
        const [agent] = await db
          .select({
            id: agents.id,
            name: agents.name,
            status: agents.status,
            ownerId: agents.ownerId,
          })
          .from(agents)
          .where(eq(agents.id, id))
          .limit(1);

        if (!agent) return null;

        // Get owner username
        const [owner] = await db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, agent.ownerId))
          .limit(1);

        return {
          type: 'Agent',
          title: agent.name,
          status: agent.status,
          author: owner?.username,
          url: `/agents/${agent.id}`,
        };
      }
      case 'post': {
        const [post] = await db
          .select({
            id: posts.id,
            title: posts.title,
            authorId: posts.authorId,
          })
          .from(posts)
          .where(eq(posts.id, id))
          .limit(1);

        if (!post) return null;

        const [author] = await db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, post.authorId))
          .limit(1);

        return {
          type: 'Post',
          title: post.title,
          author: author?.username,
          url: `/discussions/${post.id}`,
        };
      }
      case 'comment': {
        const [comment] = await db
          .select({
            id: comments.id,
            content: comments.content,
            authorId: comments.authorId,
            postId: comments.postId,
          })
          .from(comments)
          .where(eq(comments.id, id))
          .limit(1);

        if (!comment) return null;

        const [author] = await db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, comment.authorId))
          .limit(1);

        return {
          type: 'Comment',
          title: comment.content.slice(0, 100) + (comment.content.length > 100 ? '...' : ''),
          author: author?.username,
          url: `/discussions/${comment.postId}#comment-${comment.id}`,
        };
      }
      case 'user': {
        const [user] = await db
          .select({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
          })
          .from(users)
          .where(eq(users.id, id))
          .limit(1);

        if (!user) return null;

        return {
          type: 'User',
          title: user.displayName || user.username,
          url: `/users/${user.username}`,
        };
      }
      default:
        return null;
    }
  }

  /**
   * Helper: Take action on reported content
   */
  private async takeAction(
    type: string,
    id: string,
    resolution: 'ignored' | 'warning' | 'deleted' | 'banned'
  ): Promise<void> {
    if (resolution === 'ignored') return;

    switch (type) {
      case 'agent':
        if (resolution === 'deleted') {
          await db.delete(agents).where(eq(agents.id, id));
        }
        break;
      case 'post':
        if (resolution === 'deleted') {
          await db.delete(posts).where(eq(posts.id, id));
        }
        break;
      case 'comment':
        if (resolution === 'deleted') {
          await db.delete(comments).where(eq(comments.id, id));
        }
        break;
      case 'user':
        if (resolution === 'banned') {
          // Set user role to banned
          await db.update(users).set({ role: 'banned' }).where(eq(users.id, id));
        }
        break;
    }
  }
}

export const reportService = new ReportService();
