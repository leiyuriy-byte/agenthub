'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { Input } from '@agenthub/ui/input';
import { Badge } from '@agenthub/ui/badge';
import { Button } from '@agenthub/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@agenthub/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@agenthub/ui/avatar';
import { agentApi, Agent, AgentCategory } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { Search, Star, Eye, MessageCircle, Filter, ArrowUpDown, Loader2 } from 'lucide-react';

type SortOption = 'createdAt' | 'viewCount' | 'starCount' | 'avgRating';
type SortOrder = 'asc' | 'desc';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [categories, setCategories] = useState<AgentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const response = await agentApi.getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    };
    fetchCategories();
  }, []);

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    const response = await agentApi.list({
      limit,
      offset: (page - 1) * limit,
      categoryId: selectedCategory || undefined,
      search: searchQuery || undefined,
      sortBy,
      sortOrder,
    });

    if (response.success && response.data) {
      setAgents(response.data.agents);
      setTotal(response.data.total);
    }
    setIsLoading(false);
  }, [page, selectedCategory, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">发现 Agent</h1>
          <p className="mt-2 text-muted-foreground">
            探索和发现优秀的 AI Agent 项目
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索 Agent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="gap-2"
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortOrder === 'desc' ? '最新' : '最早'}
            </Button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="createdAt">创建时间</option>
              <option value="viewCount">浏览量</option>
              <option value="starCount">收藏数</option>
              <option value="avgRating">评分</option>
            </select>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setSelectedCategory('');
              setPage(1);
            }}
          >
            全部
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedCategory(category.id);
                setPage(1);
              }}
            >
              {category.name}
            </Button>
          ))}
        </div>

        {/* Agent Grid */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : agents.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Filter className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">没有找到 Agent</h3>
            <p className="text-muted-foreground">试试调整搜索条件或筛选器</p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {agents.map((agent, index) => (
                <div
                  key={agent.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 hover:shadow-primary/10">
                    <Link href={`/agents/${agent.id}`}>
                      {/* Cover Image */}
                      <div className="aspect-video relative bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group">
                        {agent.logo ? (
                          <Image
                            src={agent.logo}
                            alt={agent.name}
                            fill
                            className="object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                            <span className="text-2xl font-bold text-primary">
                              {agent.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>

                    <CardHeader className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={agent.owner?.avatar} />
                          <AvatarFallback>
                            {agent.owner?.username?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <Link href={`/agents/${agent.id}`}>
                            <h3 className="font-semibold truncate hover:text-primary transition-colors">
                              {agent.name}
                            </h3>
                          </Link>
                          <p className="text-sm text-muted-foreground truncate">
                            {agent.owner?.displayName || agent.owner?.username}
                          </p>
                        </div>
                      </div>

                      {agent.tagline && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {agent.tagline}
                        </p>
                      )}
                    </CardHeader>

                    <CardContent className="p-4 pt-0">
                      <div className="flex flex-wrap gap-1">
                        {agent.tags?.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>

                    <CardFooter className="p-4 pt-0 flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          {formatNumber(agent.starCount || 0)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {formatNumber(agent.viewCount || 0)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          {formatNumber(agent.commentCount || 0)}
                        </span>
                      </div>
                      {agent.avgRating && (
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          {agent.avgRating.toFixed(1)}
                        </span>
                      )}
                    </CardFooter>
                  </Card>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  上一页
                </Button>
                <span className="text-sm text-muted-foreground">
                  第 {page} / {totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
