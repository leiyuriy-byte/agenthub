/**
 * Conversation Page - 私信对话详情
 * /messages/[id]
 */
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage, Button, Textarea } from '@agenthub/ui';
import { messageApi, Conversation, Message, ConversationParticipant } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;
  
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 获取对方用户信息
  const getOtherParticipant = useCallback((): ConversationParticipant['user'] | null => {
    if (!conversation || !user) return null;
    return conversation.participants.find(p => p.userId !== user.id)?.user || null;
  }, [conversation, user]);

  // 加载对话和消息
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/messages');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchConversation = async () => {
    try {
      const response = await messageApi.getConversation(conversationId);
      if (response.success && response.data) {
        setConversation(response.data.conversation);
      } else {
        setError(response.error || 'Failed to load conversation');
      }
    } catch (_err) {
      setError('Failed to load conversation');
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await messageApi.getMessages(conversationId, { limit: 50 });
      if (response.success && response.data) {
        setMessages(response.data.messages);
        setHasMore(response.data.messages.length === 50);
        // 标记为已读
        await messageApi.markAsRead(conversationId);
      } else {
        setError(response.error || 'Failed to load messages');
      }
    } catch (_err) {
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!hasMore || messages.length === 0) return;
    
    try {
      const response = await messageApi.getMessages(conversationId, { 
        limit: 50, 
        beforeId: messages[messages.length - 1]?.id 
      });
      if (response.success && response.data) {
        const data = response.data;
        setMessages(prev => [...prev, ...(data.messages ?? [])]);
        setHasMore((data.messages?.length ?? 0) === 50);
      }
    } catch (_err) {
      console.error('Failed to load more messages');
    }
  };

  useEffect(() => {
    if (isAuthenticated && conversationId) {
      fetchConversation();
      fetchMessages();
    }
  }, [isAuthenticated, conversationId]);

  // 滚动到底部
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLoading, messages.length]);

  // 发送消息
  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;
    
    setIsSending(true);
    try {
      const response = await messageApi.sendMessage({
        conversationId,
        content: newMessage.trim(),
      });
      
      if (response.success && response.data) {
        setNewMessage('');
        // 重新获取消息列表
        await fetchMessages();
      } else {
        setError(response.error || 'Failed to send message');
      }
    } catch (_err) {
      setError('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return '今天';
    } else if (days === 1) {
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
    }
  };

  // 获取用户显示名
  const getDisplayName = (participant: ConversationParticipant['user']) => {
    return participant.displayName || participant.username;
  };

  // 获取首字母
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  // 按日期分组消息
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const other = getOtherParticipant();

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800/50 bg-[#0a0a0b]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/messages"
              className="p-2 hover:bg-zinc-800/50 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            
            {other && (
              <Link href={`/users/${other.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={other.avatar || undefined} />
                  <AvatarFallback className="bg-zinc-700 text-zinc-300">
                    {getInitials(getDisplayName(other))}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-lg font-semibold text-white">{getDisplayName(other)}</h1>
                  <p className="text-xs text-zinc-500">@{other.username}</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
          >
            {error}
          </motion.div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Load more trigger */}
          {hasMore && (
            <div 
              ref={loadMoreRef}
              className="flex justify-center py-4"
            >
              <button
                onClick={loadMoreMessages}
                className="text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
              >
                加载更多
              </button>
            </div>
          )}
          
          {Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-6">
                <span className="px-3 py-1 text-xs text-zinc-500 bg-zinc-800/50 rounded-full">
                  {formatDate(msgs[0]?.createdAt ?? new Date().toISOString())}
                </span>
              </div>
              
              {/* Messages for this date */}
              {msgs.map((message, index) => {
                const isOwn = message.senderId === user?.id;
                const showAvatar = index === 0 || msgs[index - 1]?.senderId !== message.senderId;
                
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 mb-4 ${isOwn ? 'flex-row-reverse' : ''}`}
                  >
                    {showAvatar ? (
                      <Link href={`/users/${message.sender.id}`}>
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarImage src={message.sender.avatar || undefined} />
                          <AvatarFallback className="bg-zinc-700 text-zinc-300 text-sm">
                            {getInitials(getDisplayName(message.sender))}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                    ) : (
                      <div className="w-10 flex-shrink-0" />
                    )}
                    
                    <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div className={`px-4 py-3 rounded-2xl ${
                        isOwn 
                          ? 'bg-[#10b981] text-white rounded-br-md' 
                          : 'bg-zinc-800 text-zinc-200 rounded-bl-md'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                      <span className="text-xs text-zinc-500 mt-1 px-1">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-zinc-800/50 bg-[#0a0a0b]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="发送消息..."
              className="min-h-[44px] max-h-32 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 resize-none focus:ring-[#10b981] focus:border-[#10b981]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || isSending}
              className="px-6 bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
