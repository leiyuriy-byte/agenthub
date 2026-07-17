'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, notificationApi, messageApi, pointsApi } from '@/lib/api';
import { Button } from '@agenthub/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@agenthub/ui/avatar';
import {
  Search,
  Bell,
  Menu,
  Settings,
  LogOut,
  ChevronDown,
  MessageCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

/**
 * NavbarClient - 客户端交互组件
 * 
 * 职责：
 * - 用户认证状态管理
 * - 通知计数
 * - 消息计数
 * - 签到状态
 * - 用户菜单交互
 * - 移动端菜单
 * 
 * 优化策略：
 * - 通过 dynamic import 延迟加载
 * - 不阻塞服务端渲染
 * - Suspense 边界外显示骨架屏
 */

interface NavbarClientProps {
  user?: {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
    points?: number;
    level?: number;
  } | null;
}

export function NavbarClient({ user: initialUser }: NavbarClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, checkAuth } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const userMenuRef = useRef<HTMLDivElement>(null);

  // 使用初始用户或 store 中的用户
  const currentUser = user || initialUser;

  // 检查认证状态
  useEffect(() => {
    if (!currentUser) {
      checkAuth();
    }
  }, [checkAuth, currentUser]);

  // 获取未读通知数
  const fetchUnreadCount = useCallback(async () => {
    if (!currentUser) return;

    setIsLoadingNotifications(true);
    try {
      const [notifRes, msgRes] = await Promise.all([
        notificationApi.getUnreadCount(),
        messageApi.getUnreadCount(),
      ]);

      if (notifRes.success && notifRes.data) {
        setUnreadCount(notifRes.data.count);
      }
      if (msgRes.success && msgRes.data) {
        setMessageUnreadCount(msgRes.data.count);
      }
    } catch {
      // 静默失败
    }
    setIsLoadingNotifications(false);
  }, [currentUser]);

  // 获取签到状态
  const fetchCheckinStatus = useCallback(async () => {
    if (!currentUser) return;

    try {
      const checkinRes = await pointsApi.hasCheckedIn();
      if (checkinRes.success && checkinRes.data) {
        setCheckedIn(checkinRes.data.checkedIn);
      }
    } catch {
      // 静默失败
    }
  }, [currentUser]);

  // 初始加载
  useEffect(() => {
    if (currentUser) {
      fetchUnreadCount();
      fetchCheckinStatus();
    }
  }, [currentUser, fetchUnreadCount, fetchCheckinStatus]);

  // 定期刷新通知数（每 60 秒）
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [currentUser, fetchUnreadCount]);

  // 点击外部关闭用户菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // 处理登出
  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // 处理签到
  const handleCheckin = async () => {
    if (!currentUser || checkedIn) return;

    try {
      const res = await pointsApi.checkIn();
      if (res.success) {
        setCheckedIn(true);
      }
    } catch {
      // 静默失败
    }
  };

  // 未登录时显示登录/注册按钮
  if (!currentUser) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center"
        >
          登录
        </Link>
        <Link
          href="/register"
          className="hidden sm:inline-flex items-center gap-1.5 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors min-h-[44px]"
        >
          注册
        </Link>
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={isMobileMenuOpen ? '关闭菜单' : '打开菜单'}
          aria-expanded={isMobileMenuOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Right Side - Authenticated */}
      <div className="hidden md:flex items-center gap-2">
        {/* 创建按钮 */}
        <Link
          href="/agents/new"
          className="inline-flex items-center gap-1.5 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors min-h-[44px]"
        >
          <span>创建</span>
        </Link>

        {/* 搜索框 - 移动端 */}
        <form onSubmit={handleSearch} className="relative md:hidden">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索..."
            className="w-40 h-9 pl-9 pr-3 bg-muted/50 rounded-md border-0 text-sm"
          />
        </form>

        {/* 通知按钮 */}
        <Link
          href="/notifications"
          className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={`通知 ${unreadCount > 0 ? `, ${unreadCount} 条未读` : ''}`}
        >
          {isLoadingNotifications ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* 消息按钮 */}
        <Link
          href="/messages"
          className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={`消息 ${messageUnreadCount > 0 ? `, ${messageUnreadCount} 条未读` : ''}`}
        >
          <MessageCircle className="h-5 w-5" />
          {messageUnreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
            </span>
          )}
        </Link>

        {/* 用户菜单 */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded-lg transition-colors min-h-[44px]"
            aria-expanded={isUserMenuOpen}
            aria-haspopup="true"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentUser.avatar || undefined} alt={currentUser.displayName || currentUser.username} />
              <AvatarFallback className="text-xs">
                {(currentUser.displayName || currentUser.username).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </button>

          {/* 用户下拉菜单 */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-background border rounded-lg shadow-lg py-1 z-50">
              {/* 用户信息 */}
              <div className="px-4 py-3 border-b">
                <p className="font-medium">{currentUser.displayName || currentUser.username}</p>
                <p className="text-sm text-muted-foreground">@{currentUser.username}</p>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span>积分: {currentUser.points || 0}</span>
                  <span>•</span>
                  <span>Lv.{currentUser.level || 1}</span>
                </div>
              </div>

              {/* 签到 */}
              <button
                onClick={handleCheckin}
                disabled={checkedIn}
                className="w-full px-4 py-2 text-left text-sm hover:bg-muted/50 flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle className={`h-4 w-4 ${checkedIn ? 'text-green-500' : 'text-muted-foreground'}`} />
                {checkedIn ? '已签到' : '签到 +5 积分'}
              </button>

              {/* 菜单项 */}
              <Link
                href={`/users/${currentUser.username}`}
                className="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50"
                onClick={() => setIsUserMenuOpen(false)}
              >
                我的主页
              </Link>
              <Link
                href="/settings"
                className="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <Settings className="inline h-4 w-4 mr-2" />
                设置
              </Link>
              {currentUser.level && currentUser.level >= 5 && (
                <Link
                  href="/admin"
                  className="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  管理后台
                </Link>
              )}
              <hr className="my-1" />
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-muted/50 flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden p-2 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label={isMobileMenuOpen ? '关闭菜单' : '打开菜单'}
        aria-expanded={isMobileMenuOpen}
      >
        {isMobileMenuOpen ? (
          <Menu className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </button>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-background border-b shadow-lg md:hidden z-40">
          <div className="container px-4 py-4 space-y-2">
            {/* 搜索框 - 移动端 */}
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索 Agent、帖子、用户..."
                className="w-full h-10 pl-10 pr-4 bg-muted/50 rounded-md border-0 text-sm"
              />
            </form>

            {/* 导航链接 */}
            <Link
              href="/agents"
              className="block px-4 py-2 text-sm font-medium hover:bg-muted/50 rounded-lg"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              发现 Agent
            </Link>
            <Link
              href="/discussions"
              className="block px-4 py-2 text-sm font-medium hover:bg-muted/50 rounded-lg"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              讨论区
            </Link>
            <Link
              href="/articles"
              className="block px-4 py-2 text-sm font-medium hover:bg-muted/50 rounded-lg"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              博客
            </Link>
            <Link
              href="/resources"
              className="block px-4 py-2 text-sm font-medium hover:bg-muted/50 rounded-lg"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              资源
            </Link>
            <Link
              href="/activities"
              className="block px-4 py-2 text-sm font-medium hover:bg-muted/50 rounded-lg"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              活动
            </Link>
            <Link
              href="/feedback"
              className="block px-4 py-2 text-sm font-medium hover:bg-muted/50 rounded-lg"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              反馈
            </Link>

            <hr className="my-2" />

            {/* 用户菜单 - 移动端 */}
            <Link
              href={`/users/${currentUser.username}`}
              className="block px-4 py-2 text-sm hover:bg-muted/50 rounded-lg"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              我的主页
            </Link>
            <Link
              href="/notifications"
              className="block px-4 py-2 text-sm hover:bg-muted/50 rounded-lg flex items-center justify-between"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              通知
              {unreadCount > 0 && (
                <span className="h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/messages"
              className="block px-4 py-2 text-sm hover:bg-muted/50 rounded-lg flex items-center justify-between"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              消息
              {messageUnreadCount > 0 && (
                <span className="h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {messageUnreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/settings"
              className="block px-4 py-2 text-sm hover:bg-muted/50 rounded-lg"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              设置
            </Link>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-muted/50 rounded-lg"
            >
              退出登录
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default NavbarClient;
