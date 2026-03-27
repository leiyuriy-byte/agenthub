import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { 
  getUserPoints, 
  dailyCheckin, 
  hasCheckedInToday, 
  getPointHistory, 
  getLeaderboard,
  getCheckinStreak,
  POINTS
} from '../services/points.service.js';

// Schemas
const getPointsSchema = z.object({});

const checkinSchema = z.object({});

const leaderboardSchema = z.object({
  type: z.enum(['total', 'weekly', 'monthly']).default('total'),
  limit: z.coerce.number().min(1).max(100).default(50),
});

const historySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * Register points routes
 */
export async function pointsRoutes(fastify: FastifyInstance) {
  // ============================================
  // GET /api/points - Get user points and level
  // ============================================
  fastify.get(
    '/points',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!;
      
      const pointsInfo = await getUserPoints(userId);
      if (!pointsInfo) {
        return reply.status(404).send({
          success: false,
          message: 'User not found',
        });
      }

      const checkedIn = await hasCheckedInToday(userId);
      const streak = await getCheckinStreak(userId);

      return reply.send({
        success: true,
        data: {
          ...pointsInfo,
          checkedInToday: checkedIn,
          streak,
        },
      });
    }
  );

  // ============================================
  // POST /api/points/checkin - Daily check-in
  // ============================================
  fastify.post(
    '/points/checkin',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!;
      
      const result = await dailyCheckin(userId);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          message: result.message,
          data: {
            checkedIn: result.checkedIn,
          },
        });
      }

      const pointsInfo = await getUserPoints(userId);
      const streak = await getCheckinStreak(userId);

      return reply.send({
        success: true,
        message: `签到成功！+${result.points} 积分`,
        data: {
          checkedIn: true,
          pointsEarned: result.points,
          totalPoints: pointsInfo?.points,
          level: pointsInfo?.level,
          streak,
        },
      });
    }
  );

  // ============================================
  // GET /api/points/history - Get point transaction history
  // ============================================
  fastify.get(
    '/points/history',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof historySchema> }>, reply: FastifyReply) => {
      const userId = request.userId!;
      const { limit, offset } = historySchema.parse(request.query);

      const history = await getPointHistory(userId, limit, offset);
      const pointsInfo = await getUserPoints(userId);

      // Map reason codes to readable names
      const reasonNames: Record<string, string> = {
        agent_published: '发布 Agent',
        post_created: '发布帖子',
        answer_accepted: '回答被采纳',
        like_received: '获得点赞',
        daily_checkin: '每日签到',
      };

      const formattedHistory = history.map(h => ({
        id: h.id,
        points: h.points,
        reason: reasonNames[h.reason] || h.reason,
        reasonKey: h.reason,
        referenceId: h.referenceId,
        createdAt: h.createdAt,
      }));

      return reply.send({
        success: true,
        data: {
          transactions: formattedHistory,
          totalPoints: pointsInfo?.points || 0,
        },
      });
    }
  );

  // ============================================
  // GET /api/points/leaderboard - Get leaderboard
  // ============================================
  fastify.get(
    '/points/leaderboard',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof leaderboardSchema> }>, reply: FastifyReply) => {
      const { type, limit } = leaderboardSchema.parse(request.query);

      const leaderboard = await getLeaderboard(type, limit);

      return reply.send({
        success: true,
        data: {
          type,
          leaderboard,
        },
      });
    }
  );

  // ============================================
  // GET /api/points/config - Get points configuration
  // ============================================
  fastify.get(
    '/points/config',
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        success: true,
        data: {
          rules: [
            { action: 'agent_published', points: POINTS.AGENT_PUBLISHED, description: '发布 Agent' },
            { action: 'post_created', points: POINTS.POST_CREATED, description: '发布帖子' },
            { action: 'answer_accepted', points: POINTS.ANSWER_ACCEPTED, description: '回答被采纳' },
            { action: 'like_received', points: POINTS.LIKE_RECEIVED, description: '获得点赞' },
            { action: 'daily_checkin', points: POINTS.DAILY_CHECKIN, description: '每日签到' },
          ],
        },
      });
    }
  );
}

export default pointsRoutes;
