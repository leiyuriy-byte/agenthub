/**
 * Messages Page - 私信对话列表
 * /messages
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@agenthub/ui';
import { messageApi, Conversation, User } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export default function MessagesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/messages');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function fetchConversations() {
      if (!isAuthenticated) return;
      
      try {
        const response = await messageApi.getConversations();
        if (response.success && response.data) {
          setConversations(response.data.conversations);
        } else {
          setError(response.error || 'Failed to load conversations');
        }
      } catch (err) {
        setError('Failed to load conversations');
      } finally {
        setIsLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchConversations();
    }
  }, [isAuthenticated]);

  // 获取对方用户信息
  const getOtherParticipant = (conv: Conversation): ConversationParticipant['user'] | null => {
    if (!user) return null;
    return conv.participants.find(p => p.userId !== user.id)?.user || null;
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
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

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Header */}
      <div className="border-b border-zinc-800/50 bg-[#0a0a0b]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-white">私信</h1>
            <Link
              href="/messages/new"
              className="px-4 py-2 bg-[#10b981] text-white text-sm font-medium rounded-lg hover:bg-[#059669] transition-colors"
            >
              新建对话
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

        {conversations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-zinc-300 mb-2">暂无私信</h3>
            <p className="text-zinc-500 text-sm mb-6">开始与他人私信交流吧</p>
            <Link
              href="/messages/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#10b981] text-white text-sm font-medium rounded-lg hover:bg-[#059669] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建对话
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv, index) => {
              const other = getOtherParticipant(conv);
              if (!other) return null;
              
              const hasUnread = (conv.unreadCount || 0) > 0;
              
              return (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={`/messages/${conv.id}`}
                    className={`flex items-center gap-4 p-4 rounded-xl hover:bg-zinc-800/30 transition-colors group ${
                      hasUnread ? 'bg-zinc-800/20' : ''
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={other.avatar || undefined} />
                        <AvatarFallback className="bg-zinc-700 text-zinc-300">
                          {getInitials(getDisplayName(other))}
                        </AvatarFallback>
                      </Avatar>
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#10b981] text-white text-xs font-medium rounded-full flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-medium truncate ${
                          hasUnread ? 'text-white' : 'text-zinc-300'
                        }`}>
                          {getDisplayName(other)}
                        </span>
                        <span className="text-xs text-zinc-500 flex-shrink-0 ml-2">
                          {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : formatTime(conv.createdAt)}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${
                        hasUnread ? 'text-zinc-400' : 'text-zinc-500'
                      }`}>
                        {conv.lastMessage ? conv.lastMessage.content : '暂无消息'}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
