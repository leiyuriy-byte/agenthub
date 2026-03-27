/**
 * Message Routes - 私信 API
 * RESTful API for private messaging
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { 
  createConversation, 
  getConversations, 
  getConversation,
  sendMessage, 
  getMessages, 
  markAsRead,
  getOrCreateConversation,
  searchMessages,
  deleteConversation,
  getTotalUnreadCount
} from '../services/message.service';
import { z } from 'zod';

// Zod schemas
const CreateConversationSchema = z.object({
  participantIds: z.array(z.string()).min(1),
});

const SendMessageSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1).max(5000),
  type: z.enum(['text', 'image', 'file']).optional().default('text'),
  metadata: z.string().optional(),
});

const GetMessagesSchema = z.object({
  conversationId: z.string(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  beforeId: z.string().optional(),
});

const MarkReadSchema = z.object({
  conversationId: z.string(),
});

const SearchMessagesSchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
});

const CreateDmSchema = z.object({
  userId: z.string(),
});

// Types
interface CreateConversationBody {
  participantIds: string[];
}

interface SendMessageBody {
  conversationId: string;
  content: string;
  type?: 'text' | 'image' | 'file';
  metadata?: string;
}

interface GetMessagesQuery {
  conversationId: string;
  limit?: number;
  beforeId?: string;
}

interface MarkReadQuery {
  conversationId: string;
}

interface SearchMessagesQuery {
  q: string;
  limit?: number;
}

interface CreateDmQuery {
  userId: string;
}

interface ConversationParams {
  id: string;
}

export async function messageRoutes(fastify: FastifyInstance) {
  // 错误处理包装器
  const handleError = (reply: FastifyReply, error: Error) => {
    fastify.log.error(error);
    if (error.message.includes('not a participant')) {
      return reply.status(403).send({ error: 'Access denied' });
    }
    return reply.status(500).send({ error: 'Internal server error' });
  };

  /**
   * GET /messages/conversations
   * 获取当前用户的所有对话列表
   */
  fastify.get(
    '/conversations',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.userData.id;
        const conversations = await getConversations(userId);
        return reply.send({ conversations });
      } catch (error) {
        return handleError(reply, error as Error);
      }
    }
  );

  /**
   * GET /messages/conversations/:id
   * 获取指定对话详情
   */
  fastify.get<{ Params: ConversationParams }>(
    '/conversations/:id',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const userId = request.userData.id;
        const conversation = await getConversation(id, userId);
        
        if (!conversation) {
          return reply.status(404).send({ error: 'Conversation not found' });
        }
        
        return reply.send({ conversation });
      } catch (error) {
        return handleError(reply, error as Error);
      }
    }
  );

  /**
   * POST /messages/conversations
   * 创建新对话
   */
  fastify.post<{ Body: CreateConversationBody }>(
    '/conversations',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = CreateConversationSchema.parse(request.body);
        const userId = request.userData.id;
        
        // 不能与自己对话
        if (body.participantIds.includes(userId) && body.participantIds.length === 1) {
          return reply.status(400).send({ error: 'Cannot create conversation with yourself' });
        }
        
        const result = await createConversation(userId, body);
        return reply.status(201).send(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid input', details: error.errors });
        }
        return handleError(reply, error as Error);
      }
    }
  );

  /**
   * POST /messages/dm/:userId
   * 与指定用户创建私信对话
   */
  fastify.post<{ Params: { userId: string } }>(
    '/dm/:userId',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
      try {
        const { userId: targetUserId } = request.params;
        const currentUserId = request.userData.id;
        
        // 不能与自己对话
        if (targetUserId === currentUserId) {
          return reply.status(400).send({ error: 'Cannot create conversation with yourself' });
        }
        
        const result = await getOrCreateConversation(currentUserId, targetUserId);
        return reply.status(201).send(result);
      } catch (error) {
        return handleError(reply, error as Error);
      }
    }
  );

  /**
   * GET /messages/:conversationId
   * 获取对话消息列表
   */
  fastify.get<{ Params: ConversationParams; Querystring: GetMessagesQuery }>(
    '/:conversationId',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { conversationId } = request.params;
        const { limit, beforeId } = request.query as GetMessagesQuery;
        const userId = request.userData.id;
        
        const messages = await getMessages(conversationId, userId, { limit, beforeId });
        return reply.send({ messages });
      } catch (error) {
        return handleError(reply, error as Error);
      }
    }
  );

  /**
   * POST /messages
   * 发送消息
   */
  fastify.post<{ Body: SendMessageBody }>(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = SendMessageSchema.parse(request.body);
        const senderId = request.userData.id;
        
        const result = await sendMessage(senderId, body);
        
        // TODO: 通过 WebSocket 推送消息给接收者
        // 这将在实时通讯功能中实现
        
        return reply.status(201).send(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid input', details: error.errors });
        }
        return handleError(reply, error as Error);
      }
    }
  );

  /**
   * POST /messages/:conversationId/read
   * 标记对话为已读
   */
  fastify.post<{ Params: ConversationParams }>(
    '/:conversationId/read',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { conversationId } = request.params;
        const userId = request.userData.id;
        
        await markAsRead(conversationId, userId);
        return reply.send({ success: true });
      } catch (error) {
        return handleError(reply, error as Error);
      }
    }
  );

  /**
   * GET /messages/search
   * 搜索消息
   */
  fastify.get<{ Querystring: SearchMessagesQuery }>(
    '/search',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { q, limit } = request.query as SearchMessagesQuery;
        const userId = request.userData.id;
        
        const messages = await searchMessages(userId, q, { limit });
        return reply.send({ messages });
      } catch (error) {
        return handleError(reply, error as Error);
      }
    }
  );

  /**
   * DELETE /messages/conversations/:id
   * 删除对话（从用户视角删除）
   */
  fastify.delete<{ Params: ConversationParams }>(
    '/conversations/:id',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const userId = request.userData.id;
        
        await deleteConversation(id, userId);
        return reply.send({ success: true });
      } catch (error) {
        return handleError(reply, error as Error);
      }
    }
  );

  /**
   * GET /messages/unread/count
   * 获取未读消息总数
   */
  fastify.get(
    '/unread/count',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.userData.id;
        const count = await getTotalUnreadCount(userId);
        return reply.send({ count });
      } catch (error) {
        return handleError(reply, error as Error);
      }
    }
  );
}
