/**
 * Report Routes - Content reporting and moderation
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { reportService } from '../services/report.service.js';
import { z } from 'zod';

// Validation schemas
const createReportSchema = z.object({
  targetType: z.enum(['agent', 'post', 'comment', 'user']),
  targetId: z.string().min(1),
  reason: z.string().min(10).max(500),
});

const resolveReportSchema = z.object({
  resolution: z.enum(['ignored', 'warning', 'deleted', 'banned']),
  targetAction: z.string().optional(),
});

const listQuerySchema = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
  status: z.enum(['pending', 'reviewed', 'resolved', 'rejected']).optional(),
  targetType: z.string().optional(),
});

interface ReportParams {
  id: string;
}

export async function reportRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/reports - Create a new report
   */
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate, fastify.requireUser],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = createReportSchema.parse(request.body);

        const report = await reportService.create({
          reporterId: request.userId!,
          targetType: data.targetType,
          targetId: data.targetId,
          reason: data.reason,
        });

        return reply.status(201).send({
          success: true,
          data: report,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(400).send({
          success: false,
          error: error.message || 'Failed to create report',
        });
      }
    }
  );

  /**
   * GET /api/reports - List reports (admin only)
   */
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof listQuerySchema> }>, reply: FastifyReply) => {
      try {
        const { limit, offset, status, targetType } = request.query;

        const result = await reportService.list({
          limit,
          offset,
          status,
          targetType,
        });

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch reports',
        });
      }
    }
  );

  /**
   * GET /api/reports/pending-count - Get pending report count (admin only)
   */
  fastify.get(
    '/pending-count',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const count = await reportService.getPendingCount();

        return reply.send({
          success: true,
          data: { count },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch pending count',
        });
      }
    }
  );

  /**
   * GET /api/reports/:id - Get report details
   */
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
    },
    async (request: FastifyRequest<{ Params: ReportParams }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;

        const report = await reportService.getById(id);

        if (!report) {
          return reply.status(404).send({
            success: false,
            error: 'Report not found',
          });
        }

        return reply.send({
          success: true,
          data: report,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch report',
        });
      }
    }
  );

  /**
   * PUT /api/reports/:id/resolve - Resolve a report (admin)
   */
  fastify.put(
    '/:id/resolve',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
    },
    async (
      request: FastifyRequest<{
        Params: ReportParams;
        Body: z.infer<typeof resolveReportSchema>;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const { resolution, targetAction } = request.body;

        const report = await reportService.resolve(
          id,
          request.userId!,
          resolution,
          targetAction
        );

        return reply.send({
          success: true,
          data: report,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(400).send({
          success: false,
          error: error.message || 'Failed to resolve report',
        });
      }
    }
  );

  /**
   * PUT /api/reports/:id/reject - Reject a report (admin)
   */
  fastify.put(
    '/:id/reject',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
    },
    async (request: FastifyRequest<{ Params: ReportParams }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;

        const report = await reportService.reject(id, request.userId!);

        return reply.send({
          success: true,
          data: report,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(400).send({
          success: false,
          error: error.message || 'Failed to reject report',
        });
      }
    }
  );
}

export default reportRoutes;
