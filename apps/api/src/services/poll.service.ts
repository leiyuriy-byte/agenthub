import { eq, and, sql } from 'drizzle-orm';
import { db, schema } from '@agenthub/db';
import { nanoid } from 'nanoid';

export interface CreatePollData {
  postId: string;
  question: string;
  options: string[];
  isAnonymous?: boolean;
  isMultiSelect?: boolean;
  endsAt?: Date;
}

export interface PollOptionData {
  text: string;
}

export interface VoteData {
  pollId: string;
  optionIds: string[];
  userId?: string;
  ipAddress?: string;
}

export interface PollWithOptions {
  id: string;
  postId: string;
  question: string;
  isAnonymous: boolean;
  isMultiSelect: boolean;
  endsAt: Date | null;
  totalVotes: number;
  userVotedOptionIds: string[];
  options: Array<{
    id: string;
    text: string;
    voteCount: number;
    percentage: number;
  }>;
  hasEnded: boolean;
}

/**
 * Poll service - handles poll creation, voting, and results
 */
export const pollService = {
  /**
   * Create a new poll with options
   */
  async create(data: CreatePollData) {
    const pollId = nanoid();

    // Create the poll
    const [poll] = await db.insert(schema.polls).values({
      id: pollId,
      postId: data.postId,
      question: data.question,
      isAnonymous: data.isAnonymous ?? false,
      isMultiSelect: data.isMultiSelect ?? false,
      endsAt: data.endsAt ?? null,
    }).returning();

    // Create poll options
    const options: Array<{ id: string; pollId: string; text: string; sortOrder: number }> = [];
    for (let i = 0; i < data.options.length; i++) {
      const optionText = data.options[i];
      if (!optionText) continue;
      const [option] = await db.insert(schema.pollOptions).values({
        id: nanoid(),
        pollId,
        text: optionText,
        sortOrder: i,
      }).returning();
      if (option) options.push(option);
    }

    return poll;
  },

  /**
   * Get poll by post ID with options and vote counts
   */
  async getByPostId(postId: string, userId?: string, ipAddress?: string) {
    const [poll] = await db.select().from(schema.polls).where(eq(schema.polls.postId, postId));
    if (!poll) return null;

    const options = await db
      .select()
      .from(schema.pollOptions)
      .where(eq(schema.pollOptions.pollId, poll.id))
      .orderBy(schema.pollOptions.sortOrder);

    // Get vote counts for each option
    const optionsWithVotes = await Promise.all(
      options.map(async (opt) => {
        const [result] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.pollVotes)
          .where(eq(schema.pollVotes.optionId, opt.id));
        return {
          ...opt,
          voteCount: Number(result?.count) || 0,
        };
      })
    );

    const totalVotes = optionsWithVotes.reduce((sum, o) => sum + o.voteCount, 0);

    // Get user's existing votes if logged in or have IP
    let userVotedOptionIds: string[] = [];
    if (userId || ipAddress) {
      const voteConditions = [eq(schema.pollVotes.pollId, poll.id)];
      if (userId) {
        voteConditions.push(eq(schema.pollVotes.userId, userId));
      } else if (ipAddress) {
        voteConditions.push(eq(schema.pollVotes.ipAddress, ipAddress));
      }

      const userVotes = await db
        .select({ optionId: schema.pollVotes.optionId })
        .from(schema.pollVotes)
        .where(and(...voteConditions));

      userVotedOptionIds = userVotes.map((v) => v.optionId);
    }

    // Calculate percentages
    const optionsWithPercentage = optionsWithVotes.map((opt) => ({
      id: opt.id,
      text: opt.text,
      voteCount: opt.voteCount,
      percentage: totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0,
    }));

    const now = new Date();
    const hasEnded = poll.endsAt ? new Date(poll.endsAt) < now : false;

    return {
      id: poll.id,
      postId: poll.postId,
      question: poll.question,
      isAnonymous: poll.isAnonymous,
      isMultiSelect: poll.isMultiSelect,
      endsAt: poll.endsAt,
      totalVotes,
      userVotedOptionIds,
      options: optionsWithPercentage,
      hasEnded,
    } as PollWithOptions;
  },

  /**
   * Vote on a poll
   */
  async vote(data: VoteData) {
    const { pollId, optionIds, userId, ipAddress } = data;

    // Get the poll to check if it's multi-select
    const [poll] = await db.select().from(schema.polls).where(eq(schema.polls.id, pollId));
    if (!poll) {
      throw new Error('Poll not found');
    }

    // Check if poll has ended
    if (poll.endsAt) {
      const endsAt = new Date(poll.endsAt);
      if (endsAt < new Date()) {
        throw new Error('Poll has ended');
      }
    }

    // For non-multi-select polls, only allow one vote
    if (!poll.isMultiSelect && optionIds.length > 1) {
      throw new Error('Only one option can be selected for this poll');
    }

    // Remove existing votes for this user/IP on this poll (to handle "change vote")
    const deleteConditions: ReturnType<typeof eq>[] = [eq(schema.pollVotes.pollId, pollId)];
    if (userId) {
      deleteConditions.push(eq(schema.pollVotes.userId, userId));
    } else if (ipAddress) {
      deleteConditions.push(eq(schema.pollVotes.ipAddress, ipAddress));
    }

    await db.delete(schema.pollVotes).where(and(...deleteConditions));

    // Insert new votes
    const votes: Array<{ id: string; pollId: string; optionId: string; userId: string | null; ipAddress: string | null }> = [];
    for (const optionId of optionIds) {
      // Verify option belongs to this poll
      const [option] = await db
        .select()
        .from(schema.pollOptions)
        .where(and(eq(schema.pollOptions.id, optionId), eq(schema.pollOptions.pollId, pollId)));

      if (!option) {
        throw new Error(`Option ${optionId} not found in poll`);
      }

      const [vote] = await db.insert(schema.pollVotes).values({
        id: nanoid(),
        pollId,
        optionId: option.id,
        userId: userId || null,
        ipAddress: ipAddress || null,
      }).returning();

      if (vote) {
        votes.push({
          id: vote.id,
          pollId: vote.pollId,
          optionId: vote.optionId,
          userId: vote.userId,
          ipAddress: vote.ipAddress,
        });
      }
    }

    return votes;
  },

  /**
   * Check if user has voted on a poll
   */
  async hasVoted(pollId: string, userId?: string, ipAddress?: string) {
    const conditions: ReturnType<typeof eq>[] = [eq(schema.pollVotes.pollId, pollId)];

    if (userId) {
      conditions.push(eq(schema.pollVotes.userId, userId));
    } else if (ipAddress) {
      conditions.push(eq(schema.pollVotes.ipAddress, ipAddress));
    } else {
      return false;
    }

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.pollVotes)
      .where(and(...conditions));

    return Number(result?.count) > 0;
  },

  /**
   * Get poll results (for displaying after voting or after poll ends)
   */
  async getResults(pollId: string) {
    const [poll] = await db.select().from(schema.polls).where(eq(schema.polls.id, pollId));
    if (!poll) return null;

    const options = await db
      .select()
      .from(schema.pollOptions)
      .where(eq(schema.pollOptions.pollId, pollId))
      .orderBy(schema.pollOptions.sortOrder);

    const optionsWithVotes = await Promise.all(
      options.map(async (opt) => {
        const [result] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.pollVotes)
          .where(eq(schema.pollVotes.optionId, opt.id));
        return {
          ...opt,
          voteCount: Number(result?.count) || 0,
        };
      })
    );

    const totalVotes = optionsWithVotes.reduce((sum, o) => sum + o.voteCount, 0);

    return {
      poll,
      totalVotes,
      options: optionsWithVotes.map((opt) => ({
        id: opt.id,
        text: opt.text,
        voteCount: opt.voteCount,
        percentage: totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0,
      })),
    };
  },

  /**
   * Delete a poll and all its options and votes
   */
  async delete(pollId: string) {
    // Delete votes first (child records)
    await db.delete(schema.pollVotes).where(eq(schema.pollVotes.pollId, pollId));

    // Delete options
    await db.delete(schema.pollOptions).where(eq(schema.pollOptions.pollId, pollId));

    // Delete poll
    await db.delete(schema.polls).where(eq(schema.polls.id, pollId));

    return { success: true };
  },
};