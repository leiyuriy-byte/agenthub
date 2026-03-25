'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { searchApi, SearchAgent, SearchPost, SearchUser } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@agenthub/ui/avatar';
import { Badge } from '@agenthub/ui/badge';
import { Button } from '@agenthub/ui/button';
import { Input } from '@agenthub/ui/input';
import { Card, CardContent } from '@agenthub/ui/card';
import {
  Search,
  Bot,
  FileText,
  Users,
  Loader2,
  Star,
  Eye,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  SearchX,
} from 'lucide-react';

type SearchType = 'all' | 'agents' | 'posts' | 'users';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkAuth } = useAuthStore();
  
  const initialQuery = searchParams.get('q') || '';
  const initialType = (searchParams.get('type') as SearchType) || 'all';
  
  const [query, setQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState<SearchType>(initialType);
  const [agents, setAgents] = useState<SearchAgent[]>([]);
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [total, setTotal] = useState({ agents: 0, posts: 0, users: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Perform search
  const performSearch = useCallback(async () => {
    if (!query.trim() || query.trim().length < 2) {
      setAgents([]);
      setPosts([]);
      setUsers([]);
      setTotal({ agents: 0, posts: 0, users: 0 });
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await searchApi.search({
        q: query.trim(),
        type: searchType,
      });

      if (response.success && response.data) {
        setAgents(response.data.agents);
        setPosts(response.data.posts);
        setUsers(response.data.users);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [query, searchType]);

  // Search on mount if there's an initial query
  useEffect(() => {
    if (initialQuery) {
      performSearch();
    }
  }, []);

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}&type=${searchType}`);
      performSearch();
    }
  };

  // Tab counts
  const tabCounts = {
    all: total.agents + total.posts + total.users,
    agents: total.agents,
    posts: total.posts,
    users: total.users,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container py-6">
          <h1 className="text-2xl font-bold mb-4">搜索</h1>
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="搜索 Agent、帖子、用户..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={isLoading || query.trim().length < 2}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '搜索'}
            </Button>
          </form>

          {/* Type Filter Tabs */}
          <div className="flex gap-2 mt-4">
            {(['all', 'agents', 'posts', 'users'] as SearchType[]).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setSearchType(type);
                  if (hasSearched) {
                    router.push(`/search?q=${encodeURIComponent(query.trim())}&type=${type}`);
                    performSearch();
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  searchType === type
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                {type === 'all' ? '全部' : type === 'agents' ? 'Agent' : type === 'posts' ? '帖子' : '用户'}
                {tabCounts[type] > 0 && (
                  <span className="ml-2 text-xs opacity-70">({tabCounts[type]})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="container py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !hasSearched ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">开始搜索</h3>
            <p className="text-muted-foreground text-sm">
              输入关键词搜索 Agent、帖子和用户
            </p>
          </div>
        ) : tabCounts.all === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <SearchX className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">未找到结果</h3>
            <p className="text-muted-foreground text-sm">
              尝试使用不同的关键词或筛选类型
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Agents Results */}
            {(searchType === 'all' || searchType === 'agents') && agents.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Bot className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Agent</h2>
                  <Badge variant="secondary">{total.agents}</Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {agents.map((agent, index) => (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link href={`/agents/${agent.id}`}>
                        <Card className="hover:bg-muted/50 transition-colors h-full">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                                {agent.logo ? (
                                  <Image src={agent.logo} alt="" fill className="object-cover" sizes="48px" />
                                ) : (
                                  <Bot className="h-6 w-6 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium truncate">{agent.name}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {agent.tagline || '暂无描述'}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  {agent.avgRating && (
                                    <span className="flex items-center gap-1">
                                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                      {agent.avgRating.toFixed(1)}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    {agent.viewCount}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Posts Results */}
            {(searchType === 'all' || searchType === 'posts') && posts.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">帖子</h2>
                  <Badge variant="secondary">{total.posts}</Badge>
                </div>
                <div className="space-y-3">
                  {posts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link href={`/discussions/${post.id}`}>
                        <Card className="hover:bg-muted/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium line-clamp-1">{post.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                  {post.content.replace(/[#*`_\[\]]/g, '').slice(0, 150)}...
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  {post.author && (
                                    <span>{post.author.displayName || post.author.username}</span>
                                  )}
                                  {post.channel && (
                                    <Badge variant="outline" className="text-xs">
                                      {post.channel.name}
                                    </Badge>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    {post.viewCount}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MessageCircle className="h-3 w-3" />
                                    {post.commentCount}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Users Results */}
            {(searchType === 'all' || searchType === 'users') && users.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">用户</h2>
                  <Badge variant="secondary">{total.users}</Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {users.map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link href={`/users/${user.id}`}>
                        <Card className="hover:bg-muted/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={user.avatar || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {(user.displayName || user.username).charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium truncate">
                                    {user.displayName || user.username}
                                  </h3>
                                  {user.isVerified && (
                                    <Badge variant="secondary" className="text-xs">
                                      认证
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">@{user.username}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    Lv.{user.level}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground capitalize">
                                    {user.role}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
