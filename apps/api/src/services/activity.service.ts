import { db } from '@agenthub/db';
import { eq, desc, and, sql, asc, SQL } from 'drizzle-orm';
import { schema } from '@agenthub/db';
const { activities, activityRegistrations, users } = schema;

// Generate unique ID
function generateId(): string {
  return `act_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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

// ============== Activities ==============

export interface ActivityListItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImage: string | null;
  type: string;
  location: string | null;
  startTime: Date;
  endTime: Date;
  maxAttendees: number | null;
  isFeatured: boolean;
  viewCount: number;
  status: string;
  organizerId: string;
  organizerName?: string;
  attendeeCount?: number;
  isRegistered?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function getActivities(options: {
  type?: string;
  status?: string;
  featured?: boolean;
  upcoming?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'startTime' | 'createdAt' | 'viewCount';
}): Promise<ActivityListItem[]> {
  const { type, status, featured, upcoming, limit = 20, offset = 0, orderBy = 'startTime' } = options;
  
  const conditions: SQL[] = [];
  const now = Date.now();
  
  if (status) {
    conditions.push(eq(activities.status, status));
  } else if (upcoming) {
    // Default to upcoming if not specified
    conditions.push(eq(activities.status, 'upcoming'));
  }
  
  if (type) {
    conditions.push(eq(activities.type, type));
  }
  if (featured !== undefined) {
    conditions.push(eq(activities.isFeatured, featured));
  }
  if (upcoming) {
    conditions.push(sql`${activities.startTime} > ${now}`);
  }
  
  const orderField = orderBy === 'createdAt' ? activities.createdAt :
                    orderBy === 'viewCount' ? activities.viewCount :
                    activities.startTime;
  
  const result = await db
    .select()
    .from(activities)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderField === activities.startTime ? asc(activities.startTime) : desc(orderField))
    .limit(limit)
    .offset(offset);
  
  // Get organizer names and attendee counts
  const organizerIds = [...new Set(result.map(r => r.organizerId))];
  const organizerMap: Record<string, string> = {};
  
  if (organizerIds.length > 0) {
    const organizers = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        username: users.username,
      })
      .from(users)
      .where(sql`${users.id} IN ${organizerIds}`);
    organizers.forEach(u => {
      organizerMap[u.id] = u.displayName || u.username;
    });
  }
  
  // Get attendee counts
  const activityIds = result.map(r => r.id);
  const attendeeCounts: Record<string, number> = {};
  
  if (activityIds.length > 0) {
    const counts = await db
      .select({
        activityId: activityRegistrations.activityId,
        count: sql`COUNT(*)`,
      })
      .from(activityRegistrations)
      .where(and(
        sql`${activityRegistrations.activityId} IN ${activityIds}`,
        eq(activityRegistrations.status, 'registered')
      ))
      .groupBy(activityRegistrations.activityId);
    
    counts.forEach(c => {
      attendeeCounts[c.activityId] = Number(c.count);
    });
  }
  
  return result.map(activity => ({
    ...activity,
    organizerName: organizerMap[activity.organizerId] || undefined,
    attendeeCount: attendeeCounts[activity.id] || 0,
  }));
}

export async function getActivityById(id: string, userId?: string) {
  const result = await db
    .select()
    .from(activities)
    .where(eq(activities.id, id))
    .limit(1);
  
  if (!result[0]) return null;
  
  const activity = result[0];
  
  // Get organizer info
  const organizerResult = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      username: users.username,
      avatar: users.avatar,
    })
    .from(users)
    .where(eq(users.id, activity.organizerId))
    .limit(1);
  
  // Get attendee count
  const attendeeResult = await db
    .select({ count: sql`COUNT(*)` })
    .from(activityRegistrations)
    .where(and(
      eq(activityRegistrations.activityId, id),
      eq(activityRegistrations.status, 'registered')
    ));
  
  // Check if user is registered
  let isRegistered = false;
  if (userId) {
    const registrationResult = await db
      .select()
      .from(activityRegistrations)
      .where(and(
        eq(activityRegistrations.activityId, id),
        eq(activityRegistrations.userId, userId)
      ))
      .limit(1);
    isRegistered = !!registrationResult[0];
  }
  
  return {
    ...activity,
    organizer: organizerResult[0] ? {
      id: organizerResult[0].id,
      name: organizerResult[0].displayName || organizerResult[0].username,
      avatar: organizerResult[0].avatar,
    } : null,
    attendeeCount: Number(attendeeResult[0]?.count || 0),
    isRegistered,
  };
}

export async function getActivityBySlug(slug: string, userId?: string) {
  const result = await db
    .select()
    .from(activities)
    .where(eq(activities.slug, slug))
    .limit(1);
  
  if (!result[0]) return null;
  return getActivityById(result[0].id, userId);
}

export async function createActivity(data: {
  title: string;
  description: string;
  coverImage?: string;
  type: string;
  location?: string;
  startTime: number;
  endTime: number;
  maxAttendees?: number;
  organizerId: string;
  status?: string;
}) {
  const id = generateId();
  const slug = slugify(data.title) + '-' + Date.now();
  
  // Determine status based on time
  const now = Date.now();
  let status = data.status || 'upcoming';
  if (data.startTime <= now && data.endTime > now) {
    status = 'ongoing';
  } else if (data.endTime <= now) {
    status = 'ended';
  }
  
  await db.insert(activities).values({
    id,
    title: data.title,
    slug,
    description: data.description,
    coverImage: data.coverImage || null,
    type: data.type,
    location: data.location || null,
    startTime: new Date(data.startTime),
    endTime: new Date(data.endTime),
    maxAttendees: data.maxAttendees || null,
    organizerId: data.organizerId,
    status,
  });
  
  return { id, slug, ...data };
}

export async function updateActivity(id: string, data: {
  title?: string;
  description?: string;
  coverImage?: string;
  type?: string;
  location?: string;
  startTime?: number;
  endTime?: number;
  maxAttendees?: number;
  status?: string;
  isFeatured?: boolean;
}) {
  const updates: Record<string, unknown> = {
    updatedAt: Date.now(),
  };
  
  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.coverImage !== undefined) updates.coverImage = data.coverImage;
  if (data.type !== undefined) updates.type = data.type;
  if (data.location !== undefined) updates.location = data.location;
  if (data.startTime !== undefined) updates.startTime = data.startTime;
  if (data.endTime !== undefined) updates.endTime = data.endTime;
  if (data.maxAttendees !== undefined) updates.maxAttendees = data.maxAttendees;
  if (data.status !== undefined) updates.status = data.status;
  if (data.isFeatured !== undefined) updates.isFeatured = data.isFeatured;
  
  await db.update(activities).set(updates).where(eq(activities.id, id));
  
  return { id, ...data };
}

export async function deleteActivity(id: string) {
  // Delete registrations first
  await db.delete(activityRegistrations).where(eq(activityRegistrations.activityId, id));
  // Delete activity
  await db.delete(activities).where(eq(activities.id, id));
  return { success: true };
}

export async function incrementActivityViewCount(id: string) {
  await db
    .update(activities)
    .set({ viewCount: sql`${activities.viewCount} + 1` })
    .where(eq(activities.id, id));
}

// ============== Registrations ==============

export async function registerForActivity(activityId: string, userId: string) {
  // Check if already registered
  const existing = await db
    .select()
    .from(activityRegistrations)
    .where(and(
      eq(activityRegistrations.activityId, activityId),
      eq(activityRegistrations.userId, userId)
    ))
    .limit(1);
  
  if (existing[0]) {
    return { success: false, error: 'Already registered' };
  }
  
  // Check max attendees
  const activity = await getActivityById(activityId);
  if (activity && activity.maxAttendees && activity.attendeeCount >= activity.maxAttendees) {
    return { success: false, error: 'Activity is full' };
  }
  
  const id = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  
  await db.insert(activityRegistrations).values({
    id,
    activityId,
    userId,
    status: 'registered',
  });
  
  return { success: true };
}

export async function cancelRegistration(activityId: string, userId: string) {
  await db
    .delete(activityRegistrations)
    .where(and(
      eq(activityRegistrations.activityId, activityId),
      eq(activityRegistrations.userId, userId)
    ));
  
  return { success: true };
}

export async function getUserRegistrations(userId: string) {
  const result = await db
    .select()
    .from(activityRegistrations)
    .where(eq(activityRegistrations.userId, userId));
  
  // Get activity details for each registration
  const registrationsWithActivities = await Promise.all(
    result.map(async (reg) => {
      const activity = await getActivityById(reg.activityId);
      return {
        ...reg,
        activity,
      };
    })
  );
  
  return registrationsWithActivities;
}

// ============== Stats ==============

export async function getActivityStats() {
  const totalResult = await db
    .select({ count: sql`COUNT(*)` })
    .from(activities)
    .where(eq(activities.status, 'upcoming'));
  
  const ongoingResult = await db
    .select({ count: sql`COUNT(*)` })
    .from(activities)
    .where(eq(activities.status, 'ongoing'));
  
  const featuredResult = await db
    .select({ count: sql`COUNT(*)` })
    .from(activities)
    .where(and(eq(activities.status, 'upcoming'), eq(activities.isFeatured, true)));
  
  return {
    upcoming: Number(totalResult[0]?.count || 0),
    ongoing: Number(ongoingResult[0]?.count || 0),
    featured: Number(featuredResult[0]?.count || 0),
  };
}