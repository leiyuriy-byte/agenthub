'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, User, notificationApi, messageApi, pointsApi } from '@/lib/api';
import { Button } from '@agenthub/ui/button';
import { Input } from '@agenthub/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@agenthub/ui/avatar';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Bell,
  Menu,
  X,
  User as UserIcon,
  Settings,
  LogOut,
  ChevronDown,
  LogIn,
  Loader2,
  MessageCircle,
  Calendar,
  Flame,
  Trophy,
} from 'lucide-react';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, checkAuth } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [userPoints, setUserPoints] = useState<{ points: number; level: number; levelName: string } | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Fetch unread notification count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      setMessageUnreadCount(0);
      return;
    }

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
      // Silently fail
    }
    setIsLoadingNotifications(false);
  }, [user]);

  // Fetch check-in status and user points
  const fetchCheckinStatus = useCallback(async () => {
    if (!user) {
      setCheckedIn(false);
      setUserPoints(null);
      return;
    }

    try {
      const [checkinRes, pointsRes] = await Promise.all([
        pointsApi.hasCheckedIn(),
        pointsApi.getMyPoints(),
      ]);

      if (checkinRes.success && checkinRes.data) {
        setCheckedIn(checkinRes.data.checkedIn);
      }
      if (pointsRes.success && pointsRes.data) {
        setUserPoints({
          points: pointsRes.data.points,
          level: pointsRes.data.level,
          levelName: pointsRes.data.levelName,
        });
      }
    } catch {
      // Silently fail
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();
    // Poll every 60 seconds
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    fetchCheckinStatus();
  }, [fetchCheckinStatus]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Handle logout
  const handleLogout = useCallback(() => {
    logout();
    setIsUserMenuOpen(false);
    router.push('/');
  }, [logout, router]);

  // Handle daily check-in
  const handleCheckin = useCallback(async () => {
    if (!user || isCheckingIn || checkedIn) return;

    setIsCheckingIn(true);
    try {
      const response = await pointsApi.checkin();
      if (response.success && response.data) {
        if (response.data.success) {
          setCheckedIn(true);
          setUserPoints((prev) => prev ? { ...prev, points: prev.points + (response.data?.points || 0) } : null);
          toast.success(`签到成功！+${response.data.points} 积分`);
        } else {
          toast.info(response.data.message || '今日已签到');
        }
      }
    } catch (error) {
      toast.error('签到失败，请稍后重试');
    }
    setIsCheckingIn(false);
    setIsUserMenuOpen(false);
  }, [user, isCheckingIn, checkedIn, router]);

  // Handle notification click
  const handleNotificationClick = () => {
    router.push('/notifications');
  };

  // Get initials for avatar fallback
  const getInitials = (user: User) => {
    if (user.displayName) {
      return user.displayName.slice(0, 2).toUpperCase();
    }
    if (user.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  const navLinks = [
    { href: '/agents', label: '发现 Agent' },
    { href: '/discussions', label: '讨论区' },
    { href: '/articles', label: '博客' },
    { href: '/resources', label: '资源' },
    { href: '/activities', label: '活动' },
    { href: '/feedback', label: '反馈' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">AH</span>
          </div>
          <span className="text-xl font-bold text-foreground hidden sm:block">
            AgentHub
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="主要导航">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors min-h-[24px] ${
                pathname === link.href || pathname.startsWith(link.href + '/')
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Search Bar - Desktop */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex flex-1 max-w-md mx-8"
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="搜索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 bg-muted/50 border-transparent focus:border-primary focus:bg-background transition-all"
            />
          </div>
        </form>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* Search Button - Mobile */}
          <button
            onClick={() => router.push('/search')}
            className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="搜索"
          >
            <Search className="h-5 w-5" />
          </button>

          {user ? (
            <>
              {/* Create Agent Button */}
              <Link href="/agents/new">
                <Button variant="default" size="sm" className="hidden sm:inline-flex gap-1">
                  <Plus className="h-4 w-4" />
                  <span>创建</span>
                </Button>
                <Button variant="default" size="sm" className="sm:hidden p-2">
                  <Plus className="h-4 w-4" />
                </Button>
              </Link>

              {/* Notifications */}
              <button
                onClick={handleNotificationClick}
                className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="通知"
              >
                {isLoadingNotifications ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Bell className="h-5 w-5" />
                )}
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-5 w-5 min-w-[20px] px-1 flex items-center justify-center bg-red-500 text-white text-xs font-medium rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Messages */}
              <Link
                href="/messages"
                className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="私信"
              >
                <MessageCircle className="h-5 w-5" />
                {messageUnreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-5 w-5 min-w-[20px] px-1 flex items-center justify-center bg-[#10b981] text-white text-xs font-medium rounded-full">
                    {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                  </span>
                )}
              </Link>

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-accent transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 rounded-xl border bg-background p-1 shadow-lg"
                    >
                      <div className="px-3 py-2 border-b">
                        <p className="font-medium text-sm truncate">{user.displayName || user.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="p-1">
                        <Link
                          href="/messages"
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <MessageCircle className="h-4 w-4" />
                          私信
                        </Link>
                        <Link
                          href={`/users/${user.id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <UserIcon className="h-4 w-4" />
                          个人主页
                        </Link>
                        <Link
                          href="/settings"
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Settings className="h-4 w-4" />
                          设置
                        </Link>
                      </div>
                      <div className="border-t p-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-accent text-red-500 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          退出登录
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  登录
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="default" size="sm">
                  注册
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={isMobileMenuOpen ? '关闭菜单' : '打开菜单'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t bg-background"
            role="navigation"
            aria-label="移动端导航菜单"
          >
            <div className="container px-4 py-4 space-y-4">
              {/* Mobile Search */}
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="搜索 Agent..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="搜索"
                    className="w-full pl-10"
                  />
                </div>
              </form>

              {/* Mobile Nav Links */}
              <nav className="space-y-1" role="navigation" aria-label="主要导航">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block px-4 py-3 text-sm font-medium rounded-lg transition-colors min-h-[44px] flex items-center ${
                      pathname === link.href || pathname.startsWith(link.href + '/')
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Mobile Create Button (if logged in) */}
              {user && (
                <Link href="/agents/new">
                  <Button className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    创建 Agent
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default Navbar;
