'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, User, notificationApi, messageApi, pointsApi, searchApi } from '@/lib/api';
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
  Loader2,
  MessageCircle,
  Bot,
  FileText,
} from 'lucide-react';

interface QuickSearchResult {
  agents: { id: string; name: string; slug: string; logo: string | null }[];
  posts: { id: string; title: string }[];
  users: { id: string; username: string; displayName: string | null; avatar: string | null }[];
}

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
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<QuickSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  // Fetch check-in status
  const fetchCheckinStatus = useCallback(async () => {
    if (!user) {
      setCheckedIn(false);
      return;
    }

    try {
      const checkinRes = await pointsApi.hasCheckedIn();
      if (checkinRes.success && checkinRes.data) {
        setCheckedIn(checkinRes.data.checkedIn);
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
      setShowSearchDropdown(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Handle quick search for autocomplete
  const handleSearchChange = async (value: string) => {
    setSearchQuery(value);
    if (value.trim().length < 1) {
      setSearchResults(null);
      setShowSearchDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchApi.quickSearch(value.trim(), 5);
      if (response.success && response.data) {
        const hasResults = 
          response.data.agents.length > 0 || 
          response.data.posts.length > 0 || 
          response.data.users.length > 0;
        setSearchResults(response.data);
        setShowSearchDropdown(hasResults);
      }
    } catch (error) {
      // Silently fail
    }
    setIsSearching(false);
  };

  // Clear search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const searchContainer = document.getElementById('search-container');
      if (searchContainer && !searchContainer.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          toast.success(`签到成功！+${response.data.points} 积分`);
        } else {
          toast.info(response.data.message || '今日已签到');
        }
      }
    } catch {
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
        <Link href="/" className="flex items-center gap-2 shrink-0 min-h-[44px] min-w-[44px] items-center justify-center">
          <div className="h-8 w-8 rounded-lg bg-[#4338ca] flex items-center justify-center" aria-hidden="true">
            <span className="text-white font-bold text-sm">AH</span>
          </div>
          <span className="text-xl font-bold text-foreground hidden sm:block">
            AgentHub
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 h-11" role="navigation" aria-label="主要导航">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
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
          <div className="relative w-full" id="search-container">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="搜索 Agent/帖子/用户..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchResults && setShowSearchDropdown(true)}
              className="w-full pl-10 pr-4 bg-muted/50 border-transparent focus:border-primary focus:bg-background transition-all"
            />
            {/* Search Autocomplete Dropdown */}
            <AnimatePresence>
              {showSearchDropdown && searchResults && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute top-full mt-2 w-full rounded-xl border bg-background shadow-lg overflow-hidden z-50"
                >
                  {isSearching ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </div>
                  ) : (
                    <>
                      {/* Agents */}
                      {searchResults.agents.length > 0 && (
                        <div className="p-2">
                          <p className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Bot className="h-3 w-3" /> Agent
                          </p>
                          {searchResults.agents.map((agent) => (
                            <Link
                              key={agent.id}
                              href={`/agents/${agent.slug}`}
                              onClick={() => setShowSearchDropdown(false)}
                              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-accent transition-colors"
                            >
                              {agent.logo ? (
                                <img src={agent.logo} alt={agent.name} className="h-6 w-6 rounded-md object-cover" />
                              ) : (
                                <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                                  <Bot className="h-3 w-3 text-primary" />
                                </div>
                              )}
                              <span className="text-sm truncate">{agent.name}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                      {/* Posts */}
                      {searchResults.posts.length > 0 && (
                        <div className="p-2 border-t">
                          <p className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <FileText className="h-3 w-3" /> 帖子
                          </p>
                          {searchResults.posts.map((post) => (
                            <Link
                              key={post.id}
                              href={`/discussions/${post.id}`}
                              onClick={() => setShowSearchDropdown(false)}
                              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-accent transition-colors"
                            >
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm truncate">{post.title}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                      {/* Users */}
                      {searchResults.users.length > 0 && (
                        <div className="p-2 border-t">
                          <p className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <UserIcon className="h-3 w-3" /> 用户
                          </p>
                          {searchResults.users.map((userItem) => (
                            <Link
                              key={userItem.id}
                              href={`/users/${userItem.id}`}
                              onClick={() => setShowSearchDropdown(false)}
                              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-accent transition-colors"
                            >
                              {userItem.avatar ? (
                                <img src={userItem.avatar} alt={userItem.displayName || userItem.username} className="h-6 w-6 rounded-full object-cover" />
                              ) : (
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                  <UserIcon className="h-3 w-3 text-primary" />
                                </div>
                              )}
                              <span className="text-sm truncate">{userItem.displayName || userItem.username}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                      {/* No results */}
                      {searchResults.agents.length === 0 && searchResults.posts.length === 0 && searchResults.users.length === 0 && (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          未找到相关结果
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
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
                <Button variant="default" size="sm" className="sm:hidden p-2" aria-label="创建 Agent">
                  <Plus className="h-4 w-4" />
                </Button>
              </Link>

              {/* Notifications */}
              <button
                onClick={handleNotificationClick}
                className="relative p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="通知"
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
                className="relative p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="私信"
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
                  aria-label="用户菜单"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="menu"
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
                    placeholder="搜索 Agent/帖子/用户..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
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
