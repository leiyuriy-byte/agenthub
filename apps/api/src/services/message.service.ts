/**
 * Message Service - 私信功能
 * 提供对话和消息的 CRUD 操作
 */
import { db } from '@agenthub/db';
import { 
  conversations, 
  conversationParticipants, 
  messages,
  users 
} from '@agenthub/db/schema';
import { eq, and, desc, or, sql, like } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface CreateConversationInput {
  participantIds: string[]; // 参与者ID列表（当前用户会自动加入）
}

export interface SendMessageInput {
  conversationId: string;
  content: string;
  type?: 'text' | 'image' | 'file';
  metadata?: string;
}

export interface ConversationWithParticipant {
  id: string;
  createdAt: Date;
  participants: {
    id: string;
    userId: string;
    lastReadAt: Date | null;
    user: {
      id: string;
      username: string;
      displayName: string | null;
      avatar: string | null;
    };
  }[];
  lastMessage?: {
    id: string;
    content: string;
    type: string;
    senderId: string;
    createdAt: Date;
  };
  unreadCount?: number;
}

export interface MessageWithSender {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  metadata: string | null;
  createdAt: Date;
  sender: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
}

/**
 * 创建私信对话
 * 如果已存在两人的对话，则返回已有对话
 */
export async function createConversation(
  currentUserId: string, 
  input: CreateConversationInput
): Promise<{ id: string }> {
  const { participantIds } = input;
  
  // 确保当前用户在参与者列表中
  if (!participantIds.includes(currentUserId)) {
    participantIds.push(currentUserId);
  }
  
  // 两人对话：检查是否已存在
  if (participantIds.length === 2) {
    const existing = await db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, participantIds[0]));
    
    for (const p of existing) {
      // 找到与第二个用户的共同对话
      const otherConv = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, p.conversationId),
            eq(conversationParticipants.userId, participantIds[1])
          )
        );
      
      if (otherConv.length > 0) {
        return { id: p.conversationId };
      }
    }
  }
  
  // 创建新对话
  const conversationId = randomUUID();
  await db.insert(conversations).values({
    id: conversationId,
  });
  
  // 添加参与者
  for (const userId of participantIds) {
    await db.insert(conversationParticipants).values({
      id: randomUUID(),
      conversationId,
      userId,
    });
  }
  
  return { id: conversationId };
}

/**
 * 获取当前用户的所有对话列表
 */
export async function getConversations(
  currentUserId: string
): Promise<ConversationWithParticipant[]> {
  // 获取当前用户参与的所有对话
  const userConvs = await db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, currentUserId));
  
  const conversationIds = userConvs.map(c => c.conversationId);
  
  if (conversationIds.length === 0) {
    return [];
  }
  
  // 获取每个对话的详情
  const result: ConversationWithParticipant[] = [];
  
  for (const convId of conversationIds) {
    // 获取参与者
    const participants = await db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, convId));
    
    // 获取参与者用户信息
    const participantInfos = await Promise.all(
      participants.map(async (p) => {
        const [user] = await db
          .select({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            avatar: users.avatar,
          })
          .from(users)
          .where(eq(users.id, p.userId));
        
        return {
          id: p.id,
          userId: p.userId,
          lastReadAt: p.lastReadAt,
          user: user || null,
        };
      })
    );
    
    // 获取最后一条消息
    const [lastMsg] = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(desc(messages.createdAt))
      .limit(1);
    
    // 计算未读数
    const currentParticipant = participants.find(p => p.userId === currentUserId);
    let unreadCount = 0;
    if (currentParticipant?.lastReadAt) {
      const unreadMsgs = await db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, convId),
            sql`${messages.createdAt} > ${currentParticipant.lastReadAt}`,
            eq(messages.senderId, sql`NOT ${currentUserId}`)
          )
        );
      unreadCount = unreadMsgs.length;
    } else if (!currentParticipant?.lastReadAt) {
      // 从未读过，获取所有非自己发送的消息数
      const allMsgs = await db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, convId),
            eq(messages.senderId, sql`NOT ${currentUserId}`)
          )
        );
      unreadCount = allMsgs.length;
    }
    
    // 获取最后一条消息的发送者信息
    let lastMessageWithSender = undefined;
    if (lastMsg) {
      const [sender] = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatar: users.avatar,
        })
        .from(users)
        .where(eq(users.id, lastMsg.senderId));
      
      lastMessageWithSender = {
        id: lastMsg.id,
        content: lastMsg.content,
        type: lastMsg.type,
        senderId: lastMsg.senderId,
        createdAt: lastMsg.createdAt,
        sender: sender || null,
      };
    }
    
    // 获取对话创建时间
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, convId));
    
    result.push({
      id: convId,
      createdAt: conv?.createdAt || new Date(),
      participants: participantInfos.filter(p => p.user !== null) as ConversationWithParticipant['participants'],
      lastMessage: lastMessageWithSender,
      unreadCount,
    });
  }
  
  // 按最后消息时间排序
  result.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt?.getTime() || a.createdAt.getTime();
    const bTime = b.lastMessage?.createdAt?.getTime() || b.createdAt.getTime();
    return bTime - aTime;
  });
  
  return result;
}

/**
 * 获取对话详情
 */
export async function getConversation(
  conversationId: string,
  currentUserId: string
): Promise<ConversationWithParticipant | null> {
  // 验证用户是否是对话参与者
  const [participant] = await db
    .select()
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, currentUserId)
      )
    );
  
  if (!participant) {
    return null;
  }
  
  // 获取所有参与者
  const allParticipants = await db
    .select()
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, conversationId));
  
  const participantInfos = await Promise.all(
    allParticipants.map(async (p) => {
      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatar: users.avatar,
        })
        .from(users)
        .where(eq(users.id, p.userId));
      
      return {
        id: p.id,
        userId: p.userId,
        lastReadAt: p.lastReadAt,
        user: user || null,
      };
    })
  );
  
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId));
  
  return {
    id: conversationId,
    createdAt: conv?.createdAt || new Date(),
    participants: participantInfos.filter(p => p.user !== null) as ConversationWithParticipant['participants'],
  };
}

/**
 * 发送消息
 */
export async function sendMessage(
  senderId: string,
  input: SendMessageInput
): Promise<{ id: string }> {
  const { conversationId, content, type = 'text', metadata } = input;
  
  // 验证发送者是参与者
  const [participant] = await db
    .select()
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, senderId)
      )
    );
  
  if (!participant) {
    throw new Error('You are not a participant of this conversation');
  }
  
  const messageId = randomUUID();
  await db.insert(messages).values({
    id: messageId,
    conversationId,
    senderId,
    content,
    type,
    metadata: metadata || null,
  });
  
  return { id: messageId };
}

/**
 * 获取对话消息列表
 */
export async function getMessages(
  conversationId: string,
  currentUserId: string,
  options?: { limit?: number; beforeId?: string }
): Promise<MessageWithSender[]> {
  const limit = options?.limit || 50;
  
  // 验证用户是参与者
  const [participant] = await db
    .select()
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, currentUserId)
      )
    );
  
  if (!participant) {
    throw new Error('You are not a participant of this conversation');
  }
  
  // 构建查询条件
  const conditions = [eq(messages.conversationId, conversationId)];
  
  if (options?.beforeId) {
    const [beforeMsg] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, options.beforeId));
    
    if (beforeMsg) {
      conditions.push(sql`${messages.createdAt} < ${beforeMsg.createdAt}`);
    }
  }
  
  // 获取消息
  const msgs = await db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  
  // 获取发送者信息
  const result = await Promise.all(
    msgs.map(async (msg) => {
      const [sender] = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatar: users.avatar,
        })
        .from(users)
        .where(eq(users.id, msg.senderId));
      
      return {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        content: msg.content,
        type: msg.type,
        metadata: msg.metadata,
        createdAt: msg.createdAt,
        sender: sender || null,
      };
    })
  );
  
  return result;
}

/**
 * 标记对话为已读
 */
export async function markAsRead(
  conversationId: string,
  currentUserId: string
): Promise<void> {
  await db
    .update(conversationParticipants)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, currentUserId)
      )
    );
}

/**
 * 获取与指定用户的对话（如果没有则创建）
 */
export async function getOrCreateConversation(
  currentUserId: string,
  targetUserId: string
): Promise<{ id: string }> {
  return createConversation(currentUserId, {
    participantIds: [currentUserId, targetUserId],
  });
}

/**
 * 搜索消息
 */
export async function searchMessages(
  currentUserId: string,
  query: string,
  options?: { limit?: number }
): Promise<MessageWithSender[]> {
  const limit = options?.limit || 20;
  
  // 获取用户参与的所有对话ID
  const userConvs = await db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, currentUserId));
  
  const conversationIds = userConvs.map(c => c.conversationId);
  
  if (conversationIds.length === 0) {
    return [];
  }
  
  // 搜索消息
  const msgs = await db
    .select()
    .from(messages)
    .where(
      and(
        sql`${messages.conversationId} IN ${conversationIds}`,
        sql`${messages.content} LIKE ${`%${query}%`}`
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  
  // 获取发送者信息
  const result = await Promise.all(
    msgs.map(async (msg) => {
      const [sender] = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatar: users.avatar,
        })
        .from(users)
        .where(eq(users.id, msg.senderId));
      
      return {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        content: msg.content,
        type: msg.type,
        metadata: msg.metadata,
        createdAt: msg.createdAt,
        sender: sender || null,
      };
    })
  );
  
  return result;
}

/**
 * 删除对话（软删除，只删除当前用户的参与记录）
 */
export async function deleteConversation(
  conversationId: string,
  currentUserId: string
): Promise<void> {
  await db
    .delete(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, currentUserId)
      )
    );
}

/**
 * 获取当前用户的未读消息总数
 */
export async function getTotalUnreadCount(currentUserId: string): Promise<number> {
  // 获取当前用户参与的所有对话
  const userConvs = await db
    .select()
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, currentUserId));
  
  let totalUnread = 0;
  
  for (const conv of userConvs) {
    // 获取未读消息（非自己发送的，在 lastReadAt 之后的）
    let unreadMsgs;
    if (conv.lastReadAt) {
      unreadMsgs = await db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conv.conversationId),
            sql`${messages.senderId} != ${currentUserId}`,
            sql`${messages.createdAt} > ${conv.lastReadAt}`
          )
        );
    } else {
      // 从未读过，获取所有非自己发送的消息
      unreadMsgs = await db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conv.conversationId),
            sql`${messages.senderId} != ${currentUserId}`
          )
        );
    }
    
    totalUnread += unreadMsgs.length;
  }
  
  return totalUnread;
}
