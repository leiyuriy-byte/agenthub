/**
 * New Conversation Page - 新建私信对话
 * /messages/new
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage, Button, Textarea } from '@agenthub/ui';
import { messageApi, User, userApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export default function NewConversationPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/messages/new');
    }
  }, [authLoading, isAuthenticated, router]);

  // 搜索用户
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setUsers([]);
        return;
      }

      setIsSearching(true);
      try {
        // 这里需要一个搜索用户的 API，暂时用获取所有用户的代替
        // 实际项目中应该添加 /api/users/search 接口
        const response = await userApi.getProfile(searchQuery);
        if (response.success && response.data && response.data.id !== user?.id) {
          setUsers([response.data]);
        } else {
          setUsers([]);
        }
      } catch {
        setUsers([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user?.id]);

  // 创建对话并发送消息
  const handleCreateAndSend = async () => {
    if (!selectedUser || !message.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      // 1. 创建对话
      const createResponse = await messageApi.createDm(selectedUser.id);
      
      if (!createResponse.success || !createResponse.data) {
        setError(createResponse.error || 'Failed to create conversation');
        setIsCreating(false);
        return;
      }

      // 2. 发送消息
      const sendResponse = await messageApi.sendMessage({
        conversationId: createResponse.data.id,
        content: message.trim(),
      });

      if (sendResponse.success) {
        // 跳转到对话页面
        router.push(`/messages/${createResponse.data.id}`);
      } else {
        setError(sendResponse.error || 'Failed to send message');
      }
    } catch {
      setError('Failed to start conversation');
    } finally {
      setIsCreating(false);
    }
  };

  // 获取首字母
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  if (authLoading) {
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
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/messages"
              className="p-2 hover:bg-zinc-800/50 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-white">新建私信</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Search user */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            发送给
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedUser(null);
              }}
              placeholder="搜索用户名..."
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Search results */}
          {users.length > 0 && !selectedUser && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 bg-zinc-800/80 border border-zinc-700 rounded-xl overflow-hidden"
            >
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setSelectedUser(u);
                    setSearchQuery(u.displayName || u.username);
                    setUsers([]);
                  }}
                  aria-label={`选择用户 ${u.displayName || u.username}`}
                  className="w-full flex items-center gap-3 p-3 hover:bg-zinc-700/50 transition-colors text-left min-h-[44px]"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={u.avatar || undefined} />
                    <AvatarFallback className="bg-zinc-700 text-zinc-300">
                      {getInitials(u.displayName || u.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white font-medium">{u.displayName || u.username}</p>
                    <p className="text-zinc-500 text-sm">@{u.username}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}

          {/* Selected user */}
          {selectedUser && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-2 flex items-center justify-between p-3 bg-zinc-800/50 border border-[#10b981]/30 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedUser.avatar || undefined} />
                  <AvatarFallback className="bg-zinc-700 text-zinc-300">
                    {getInitials(selectedUser.displayName || selectedUser.username)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-medium">
                    {selectedUser.displayName || selectedUser.username}
                  </p>
                  <p className="text-zinc-500 text-sm">@{selectedUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setSearchQuery('');
                }}
                aria-label="清除已选择用户"
                className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )}
        </div>

        {/* Message input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            消息内容
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="输入你想发送的消息..."
            className="min-h-[150px] bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:ring-[#10b981] focus:border-[#10b981] resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            取消
          </Button>
          <Button
            onClick={handleCreateAndSend}
            disabled={!selectedUser || !message.trim() || isCreating}
            className="flex-1 bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                发送中...
              </div>
            ) : (
              '发送消息'
            )}
          </Button>
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-zinc-800/30 rounded-xl">
          <h3 className="text-sm font-medium text-zinc-400 mb-2">提示</h3>
          <ul className="text-xs text-zinc-500 space-y-1">
            <li>• 输入用户名或昵称搜索用户</li>
            <li>• 选择用户后输入消息内容</li>
            <li>• 发送消息后即可开始对话</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
