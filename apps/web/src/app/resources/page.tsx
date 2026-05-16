'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Input } from '@agenthub/ui/input';
import { Badge } from '@agenthub/ui/badge';
import { Button } from '@agenthub/ui/button';
import { Card, CardContent, CardFooter } from '@agenthub/ui/card';
import { Skeleton } from '@agenthub/ui/skeleton';
import { resourceApi, Resource, ResourceCategory } from '@/lib/api';
import { formatNumber, cn } from '@/lib/utils';
import { Search, Eye, Heart, Plus, Wrench, Database, Code, GraduationCap } from 'lucide-react';

type SortOption = 'createdAt' | 'viewCount' | 'likeCount';
type ResourceType = 'tool' | 'dataset' | 'api' | 'learning';

const typeIcons: Record<ResourceType, React.ReactNode> = {
  tool: <Wrench className="h-4 w-4" />,
  dataset: <Database className="h-4 w-4" />,
  api: <Code className="h-4 w-4" />,
  learning: <GraduationCap className="h-4 w-4" />,
};

const typeLabels: Record<ResourceType, string> = {
  tool: '工具',
  dataset: '数据集',
  api: 'API',
  learning: '学习资源',
};

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<ResourceType | ''>('');
  const [sortBy, setSortBy] = useState<SortOption>('createdAt');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const response = await resourceApi.getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    };
    fetchCategories();
  }, []);

  // Fetch resources
  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    const response = await resourceApi.list({
      limit,
      offset: (page - 1) * limit,
      categoryId: selectedCategory || undefined,
      type: selectedType || undefined,
      status: 'approved',
      orderBy: sortBy,
    });

    if (response.success && response.data) {
      setResources(response.data.resources);
      setTotal(response.data.total);
    }
    setIsLoading(false);
  }, [page, selectedCategory, selectedType, sortBy]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const totalPages = Math.ceil(total / limit);

  // Filter by search query on client
  const filteredResources = searchQuery
    ? resources.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : resources;

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">资源分享</h1>
          <p className="mt-2 text-muted-foreground">
            发现和分享 AI Agent 开发相关的工具、数据集和 API
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索资源..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as SortOption);
              setPage(1);
            }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="createdAt">最新</option>
            <option value="viewCount">最多浏览</option>
            <option value="likeCount">最多点赞</option>
          </select>
        </div>

        {/* Type Pills */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSelectedType('');
              setPage(1);
            }}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              selectedType === ''
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            全部
          </button>
          {(Object.keys(typeLabels) as ResourceType[]).map((type) => (
            <button
              key={type}
              onClick={() => {
                setSelectedType(type);
                setPage(1);
              }}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5',
                selectedType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {typeIcons[type]}
              {typeLabels[type]}
            </button>
          ))}
        </div>

        {/* Category Pills */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSelectedCategory('');
              setPage(1);
            }}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              selectedCategory === ''
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            全部分类
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategory(category.id);
                setPage(1);
              }}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                selectedCategory === category.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Resources Grid */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-32 w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Wrench className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">暂无资源</h3>
            <p className="text-muted-foreground mb-4">成为第一个分享资源的作者吧！</p>
            <Link href="/resources/new">
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                分享资源
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredResources.map((resource, index) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link href={`/resources/${resource.slug}`}>
                  <Card className="h-full overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
                    {/* Cover Image */}
                    {resource.coverImage ? (
                      <div className="relative h-32 w-full overflow-hidden">
                        <img
                          src={resource.coverImage}
                          alt={resource.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-32 w-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                        {typeIcons[resource.type]}
                      </div>
                    )}

                    <CardContent className="p-4">
                      {/* Type Badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="gap-1">
                          {typeIcons[resource.type]}
                          {typeLabels[resource.type]}
                        </Badge>
                        {resource.isFree && (
                          <Badge variant="secondary">免费</Badge>
                        )}
                      </div>

                      {/* Name */}
                      <h3 className="mb-2 line-clamp-1 text-lg font-semibold">
                        {resource.name}
                      </h3>

                      {/* Description */}
                      <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                        {resource.description}
                      </p>

                      {/* Tags */}
                      {resource.tags && resource.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {resource.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="border-t p-4 pt-3">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatNumber(resource.viewCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {formatNumber(resource.likeCount)}
                        </span>
                        {resource.category && (
                          <span>{resource.category.name}</span>
                        )}
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
