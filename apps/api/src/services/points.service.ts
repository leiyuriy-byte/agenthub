import { eq, desc, and, sql, gte } from 'drizzle-orm';
import { db, schema } from '@agenthub/db';
import { nanoid } from 'nanoid';
import { sendPointsUpdateToUser } from './websocket.service.js';

// Point values for different actions
export const POINTS = {
  AGENT_PUBLISHED: 50,
  POST_CREATED: 10,
  ANSWER_ACCEPTED: 30,
  LIKE_RECEIVED: 2,
  DAILY_CHECKIN: 5,
} as const;

// Level thresholds (cumulative points required)
export const LEVEL_THRESHOLDS = [
  { level: 1, minPoints: 0 },
  { level: 2, minPoints: 100 },
  { level: 3, minPoints: 300 },
  { level: 4, minPoints: 600 },
  { level: 5, minPoints: 1000 },
  { level: 6, minPoints: 1800 },
  { level: 7, minPoints: 3000 },
  { level: 8, minPoints: 5000 },
  { level: 9, minPoints: 8000 },
  { level: 10, minPoints: 12000 },
] as const;

// Level names
export const LEVEL_NAMES: Record<number, string> = {
  1: '新手',
  2: '入门',
  3: '进阶',
  4: '熟练',
  5: '专家',
  6: '资深专家',
  7: '大师',
  8: '传奇',
  9: '神话',
  10: '王者',
};

/**
 * Calculate level from points
 */
export function calculateLevel(points: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    const threshold = LEVEL_THRESHOLDS[i];
    if (threshold && points >= threshold.minPoints) {
      return threshold.level;
    }
  }
  return 1;
}

/**
 * Get points required for next level
 */
export function getNextLevelPoints(currentPoints: number): number | null {
  const currentLevel = calculateLevel(currentPoints);
  if (currentLevel >= 10) return null;
  
  const nextLevel = LEVEL_THRESHOLDS.find(t => t.level === currentLevel + 1);
  return nextLevel?.minPoints ?? null;
}

/**
 * Get user points and level info
 */
export async function getUserPoints(userId: string) {
  const [user] = await db.select({
    id: schema.users.id,
    points: schema.users.points,
    level: schema.users.level,
  }).from(schema.users).where(eq(schema.users.id, userId));

  if (!user) return null;

  // Recalculate level to ensure it's correct
  const calculatedLevel = calculateLevel(user.points);
  
  // Update level if needed
  if (calculatedLevel !== user!.level) {
    await db.update(schema.users)
      .set({ level: calculatedLevel })
      .where(eq(schema.users.id, userId));
  }

  const nextLevelPoints = getNextLevelPoints(user.points);
  const currentLevelThreshold = LEVEL_THRESHOLDS.find(t => t.level === calculatedLevel)?.minPoints ?? 0;
  const progress = nextLevelPoints 
    ? ((user.points - currentLevelThreshold) / (nextLevelPoints - currentLevelThreshold)) * 100
    : 100;

  return {
    points: user.points,
    level: calculatedLevel,
    levelName: LEVEL_NAMES[calculatedLevel],
    nextLevelPoints,
    progress: Math.round(progress),
  };
}

/**
 * Add points to user and create transaction record
 */
export async function addPoints(
  userId: string,
  points: number,
  reason: string,
  referenceId?: string
) {
  // Create transaction record
  await db.insert(schema.pointTransactions).values({
    id: nanoid(),
    userId,
    points,
    reason,
    referenceId,
  });

  // Get current user info before update
  const [currentUser] = await db.select({
    points: schema.users.points,
    level: schema.users.level,
  }).from(schema.users).where(eq(schema.users.id, userId));

  if (!currentUser) {
    throw new Error('User not found');
  }

  // Calculate new level
  const newPoints = currentUser.points + points;
  const newLevel = calculateLevel(newPoints);

  // Update user points and level
  const [updatedUser] = await db.update(schema.users)
    .set({
      points: newPoints,
      level: newLevel,
    })
    .where(eq(schema.users.id, userId))
    .returning({ points: schema.users.points, level: schema.users.level });

  if (!updatedUser) {
    throw new Error('Failed to update user points');
  }

  // Send WebSocket notification about points update
  try {
    const level = updatedUser.level ?? 1;
    sendPointsUpdateToUser(userId, {
      points: updatedUser.points,
      level: level,
      levelName: LEVEL_NAMES[level] || '新手',
      change: points,
      reason,
    });
  } catch (error) {
    console.error('Failed to send WebSocket points update:', error);
  }

  return updatedUser;
}

/**
 * Daily check-in
 * Returns { success: true, points: 5 } if successful
 * Returns { success: false, message: "..." } if already checked in today
 */
export async function dailyCheckin(userId: string) {
  const today: string = new Date().toISOString().split('T')[0] as string; // YYYY-MM-DD

  // Check if already checked in today
  const [existing] = await db.select()
    .from(schema.userCheckins)
    .where(
      and(
        eq(schema.userCheckins.userId, userId),
        eq(schema.userCheckins.date, today)
      )
    );

  if (existing) {
    return {
      success: false,
      message: '今日已签到',
      checkedIn: true,
    };
  }

  // Create check-in record
  const checkinId = nanoid();
  await db.insert(schema.userCheckins).values({
    id: checkinId,
    userId: userId,
    date: today,
    points: POINTS.DAILY_CHECKIN,
  });

  // Add points
  await addPoints(userId, POINTS.DAILY_CHECKIN, 'daily_checkin');

  return {
    success: true,
    points: POINTS.DAILY_CHECKIN,
    checkedIn: true,
  };
}

/**
 * Check if user has checked in today
 */
export async function hasCheckedInToday(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0] as string;
  const [existing] = await db.select()
    .from(schema.userCheckins)
    .where(
      and(
        eq(schema.userCheckins.userId, userId),
        eq(schema.userCheckins.date, today)
      )
    );
  return !!existing;
}

/**
 * Get user point transaction history
 */
export async function getPointHistory(userId: string, limit = 20, offset = 0) {
  const transactions = await db.select()
    .from(schema.pointTransactions)
    .where(eq(schema.pointTransactions.userId, userId))
    .orderBy(desc(schema.pointTransactions.createdAt))
    .limit(limit)
    .offset(offset);

  return transactions.map(t => ({
    id: t.id,
    points: t.points,
    reason: t.reason,
    referenceId: t.referenceId,
    createdAt: t.createdAt,
  }));
}

/**
 * Get leaderboard
 * type: 'total' | 'weekly' | 'monthly'
 */
export async function getLeaderboard(type: 'total' | 'weekly' | 'monthly' = 'total', limit = 50) {
  let whereClause;

  if (type === 'weekly') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    whereClause = gte(schema.pointTransactions.createdAt, weekAgo);
  } else if (type === 'monthly') {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    whereClause = gte(schema.pointTransactions.createdAt, monthAgo);
  }

  let users;
  
  if (type === 'total') {
    // Just get users ordered by total points
    users = await db.select({
      id: schema.users.id,
      username: schema.users.username,
      displayName: schema.users.displayName,
      avatar: schema.users.avatar,
      points: schema.users.points,
      level: schema.users.level,
    })
      .from(schema.users)
      .orderBy(desc(schema.users.points))
      .limit(limit);
  } else {
    // For weekly/monthly, sum up transactions
    const transactions = await db.select({
      userId: schema.pointTransactions.userId,
      totalPoints: sql<number>`sum(${schema.pointTransactions.points})`.as('total_points'),
    })
      .from(schema.pointTransactions)
      .where(whereClause)
      .groupBy(schema.pointTransactions.userId)
      .orderBy(desc(sql`total_points`))
      .limit(limit);

    // Get user details for each
    users = await Promise.all(
      transactions.map(async (t) => {
        const [user] = await db.select({
          id: schema.users.id,
          username: schema.users.username,
          displayName: schema.users.displayName,
          avatar: schema.users.avatar,
          points: schema.users.points,
          level: schema.users.level,
        })
          .from(schema.users)
          .where(eq(schema.users.id, t.userId));
        return user;
      })
    );
  }

  // Filter out undefined users first
  const validUsers = users.filter((u): u is NonNullable<typeof u> => !!u);

  return validUsers.map((user, index) => ({
    rank: index + 1,
    id: user!.id,
    username: user!.username,
    displayName: user!.displayName,
    avatar: user!.avatar,
    points: type === 'total' ? user.points : (user as unknown as { totalPoints: number }).totalPoints || user.points,
    level: calculateLevel(user.points),
    levelName: LEVEL_NAMES[calculateLevel(user.points)],
  }));
}

/**
 * Award points for specific actions (called by other services)
 */
export async function awardPointsForAction(
  userId: string,
  action: 'agent_published' | 'post_created' | 'answer_accepted' | 'like_received',
  referenceId?: string
) {
  const pointsMap = {
    agent_published: POINTS.AGENT_PUBLISHED,
    post_created: POINTS.POST_CREATED,
    answer_accepted: POINTS.ANSWER_ACCEPTED,
    like_received: POINTS.LIKE_RECEIVED,
  };

  const points = pointsMap[action];
  return addPoints(userId, points, action, referenceId);
}

/**
 * Get user's check-in streak
 */
export async function getCheckinStreak(userId: string): Promise<number> {
  const checkins = await db.select()
    .from(schema.userCheckins)
    .where(eq(schema.userCheckins.userId, userId))
    .orderBy(desc(schema.userCheckins.date));

  if (checkins.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < checkins.length; i++) {
    const checkinDate = new Date(checkins[i]!.date);
    checkinDate.setHours(0, 0, 0, 0);

    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);

    if (checkinDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
