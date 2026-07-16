'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Input } from '@agenthub/ui/input';
import { Badge } from '@agenthub/ui/badge';
import { Button } from '@agenthub/ui/button';
import { Card, CardContent, CardFooter } from '@agenthub/ui/card';
import { Skeleton } from '@agenthub/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@agenthub/ui/avatar';
import { articleApi, Article, ArticleCategory } from '@/lib/api';
import { formatRelativeTime, formatNumber, cn } from '@/lib/utils';
import { Search, Eye, MessageCircle, Heart, Plus, PenLine, BookOpen } from 'lucide-react';

type SortOption = 'publishedAt' | 'viewCount' | 'likeCount' | 'createdAt';

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('publishedAt');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const response = await articleApi.getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    };
    fetchCategories();
  }, []);

  // Fetch articles
  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    const response = await articleApi.list({
      limit,
      offset: (page - 1) * limit,
      categoryId: selectedCategory || undefined,
      status: 'published',
      orderBy: sortBy,
    });

    if (response.success && response.data) {
      setArticles(response.data.articles);
      setTotal(response.data.total);
    }
    setIsLoading(false);
  }, [page, selectedCategory, sortBy]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const totalPages = Math.ceil(total / limit);

  // Filter by search query on client (since API doesn't have search)
  const filteredArticles = searchQuery
    ? articles.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : articles;

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">技术博客</h1>
            <p className="mt-2 text-muted-foreground">
              探索 AI Agent 开发的最佳实践和技术文章
            </p>
          </div>
          <Link href="/articles/new">
            <Button className="gap-2">
              <PenLine className="h-4 w-4" />
              撰写文章
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索文章..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortOption);
                setPage(1);
              }}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="publishedAt">最新发布</option>
              <option value="viewCount">最多浏览</option>
              <option value="likeCount">最多点赞</option>
              <option value="createdAt">最早创建</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="文章分类筛选">
          <button
            onClick={() => {
              setSelectedCategory('');
              setPage(1);
            }}
            aria-selected={selectedCategory === ''}
            role="tab"
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors min-h-[44px]',
              selectedCategory === ''
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            全部
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategory(category.id);
                setPage(1);
              }}
              aria-selected={selectedCategory === category.id}
              role="tab"
              aria-label={`筛选${category.name}分类`}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors min-h-[44px]',
                selectedCategory === category.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Articles Grid */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">暂无文章</h3>
            <p className="text-muted-foreground mb-4">成为第一个分享知识的作者吧！</p>
            <Link href="/articles/new">
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                撰写文章
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link href={`/articles/${article.slug}`}>
                  <Card className="h-full overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
                    {/* Cover Image */}
                    {article.coverImage ? (
                      <div className="relative h-40 w-full overflow-hidden">
                        <Image
                          src={article.coverImage}
                          alt={article.title}
                          fill
                          className="object-cover transition-transform hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="h-40 w-full bg-gradient-to-br from-indigo-500 to-purple-600" />
                    )}

                    <CardContent className="p-4">
                      {/* Category & Tags */}
                      {article.category && (
                        <Badge variant="secondary" className="mb-2">
                          {article.category.name}
                        </Badge>
                      )}

                      {/* Title */}
                      <h3 className="mb-2 line-clamp-2 text-lg font-semibold leading-tight">
                        {article.title}
                      </h3>

                      {/* Excerpt */}
                      <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                        {article.excerpt || article.content.substring(0, 150)}
                      </p>

                      {/* Meta */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatNumber(article.viewCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {formatNumber(article.likeCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {formatNumber(article.commentCount)}
                        </span>
                        {article.readTimeMinutes && (
                          <span>{article.readTimeMinutes} 分钟阅读</span>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="border-t p-4 pt-3">
                      <div className="flex items-center gap-2">
                        {article.author?.avatar ? (
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={article.author.avatar} />
                            <AvatarFallback>
                              {article.author.displayName?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>U</AvatarFallback>
                          </Avatar>
                        )}
                        <span className="text-sm font-medium">
                          {article.author?.displayName || article.author?.username}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(article.publishedAt || article.createdAt)}
                        </span>
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              上一页
            </Button>
            <span className="flex items-center px-4 text-sm">
              第 {page} / {totalPages} 页
            </span>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              下一页
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
