'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { Input } from '@agenthub/ui/input';
import { Badge } from '@agenthub/ui/badge';
import { Button } from '@agenthub/ui/button';
import { Card, CardContent, CardFooter } from '@agenthub/ui/card';
import { Skeleton } from '@agenthub/ui/skeleton';
import { activityApi, Activity } from '@/lib/api';
import { formatNumber, cn } from '@/lib/utils';
import { Search, Eye, Users, Calendar, MapPin, Video, Plus, CalendarDays } from 'lucide-react';

type SortOption = 'startTime' | 'createdAt' | 'viewCount';
type ActivityStatus = 'upcoming' | 'ongoing' | 'ended';
type ActivityType = 'online' | 'offline';

const statusLabels: Record<ActivityStatus, string> = {
  upcoming: '即将开始',
  ongoing: '进行中',
  ended: '已结束',
};

const statusColors: Record<ActivityStatus, string> = {
  upcoming: 'bg-blue-500',
  ongoing: 'bg-green-500',
  ended: 'bg-gray-500',
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ActivityStatus | ''>('');
  const [selectedType, setSelectedType] = useState<ActivityType | ''>('');
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('startTime');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    const response = await activityApi.list({
      limit,
      offset: (page - 1) * limit,
      status: selectedStatus || undefined,
      type: selectedType || undefined,
      upcoming: showUpcomingOnly,
      orderBy: sortBy,
    });

    if (response.success && response.data) {
      setActivities(response.data.activities);
      setTotal(response.data.total);
    }
    setIsLoading(false);
  }, [page, selectedStatus, selectedType, showUpcomingOnly, sortBy]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const totalPages = Math.ceil(total / limit);

  // Filter by search query on client
  const filteredActivities = searchQuery
    ? activities.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activities;

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">活动日历</h1>
            <p className="mt-2 text-muted-foreground">
              发现和参与 AI Agent 相关的线上线下活动
            </p>
          </div>
          <Link href="/activities/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              创建活动
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索活动... className="
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 className="
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
              className="rounded-md border border-input bg-background px-3 py-2 text-sm className="
            >
              <option value="startTime">按时间</option>
              <option value="createdAt">最新创建</option>
              <option value="viewCount">最多浏览</option>
            </select>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="活动状态筛选">
          <button
            onClick={() => {
              setShowUpcomingOnly(true);
              setSelectedStatus('');
              setPage(1);
            }}
            aria-selected={showUpcomingOnly && selectedStatus === ''}
            role="tab className="
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors min-h-[44px]',
              showUpcomingOnly && selectedStatus === ''
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            即将开始
          </button>
          <button
            onClick={() => {
              setSelectedStatus('ongoing');
              setShowUpcomingOnly(false);
              setPage(1);
            }}
            aria-selected={selectedStatus === 'ongoing'}
            role="tab className="
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors min-h-[44px]',
              selectedStatus === 'ongoing'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            进行中
          </button>
          <button
            onClick={() => {
              setSelectedStatus('ended');
              setShowUpcomingOnly(false);
              setPage(1);
            }}
            aria-selected={selectedStatus === 'ended'}
            role="tab className="
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors min-h-[44px]',
              selectedStatus === 'ended'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            已结束
          </button>
        </div>

        {/* Type Tabs */}
        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="活动类型筛选">
          <button
            onClick={() => {
              setSelectedType('');
              setPage(1);
            }}
            aria-selected={selectedType === ''}
            role="tab className="
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 min-h-[44px]',
              selectedType === ''
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            全部
          </button>
          <button
            onClick={() => {
              setSelectedType('online');
              setPage(1);
            }}
            aria-selected={selectedType === 'online'}
            role="tab className="
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 min-h-[44px]',
              selectedType === 'online'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <Video className="h-4 w-4" />
            线上活动
          </button>
          <button
            onClick={() => {
              setSelectedType('offline');
              setPage(1);
            }}
            aria-selected={selectedType === 'offline'}
            role="tab className="
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 min-h-[44px]',
              selectedType === 'offline'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <MapPin className="h-4 w-4" />
            线下活动
          </button>
        </div>

        {/* Activities Grid */}
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
        ) : filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">暂无活动</h3>
            <p className="text-muted-foreground mb-4">成为第一个创建活动的组织者吧！</p>
            <Link href="/activities/new">
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                创建活动
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredActivities.map((activity, index) => (
              <div class="animate-slide-up className="
                key={activity.id}
                
                
                
              >
                <Link href={`/activities/${activity.slug}`}>
                  <Card className="h-full overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
                    {/* Cover Image */}
                    {activity.coverImage ? (
                      <div className="relative h-40 w-full overflow-hidden">
                        <Image
                          src={activity.coverImage}
                          alt={activity.title}
                          fill
                          className="object-cover className="
                        />
                        <div className={cn('absolute top-2 right-2 px-2 py-1 rounded-full text-xs text-white font-medium', statusColors[activity.status as ActivityStatus] || 'bg-gray-500')}>
                          {statusLabels[activity.status as ActivityStatus] || activity.status}
                        </div>
                      </div>
                    ) : (
                      <div className="relative h-40 w-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                        <Calendar className="h-12 w-12 text-white/50" />
                        <div className={cn('absolute top-2 right-2 px-2 py-1 rounded-full text-xs text-white font-medium', statusColors[activity.status as ActivityStatus] || 'bg-gray-500')}>
                          {statusLabels[activity.status as ActivityStatus] || activity.status}
                        </div>
                      </div>
                    )}

                    <CardContent className="p-4">
                      {/* Type Badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="gap-1">
                          {activity.type === 'online' ? (
                            <Video className="h-3 w-3" />
                          ) : (
                            <MapPin className="h-3 w-3" />
                          )}
                          {activity.type === 'online' ? '线上' : '线下'}
                        </Badge>
                        {activity.isFeatured && (
                          <Badge variant="secondary">推荐</Badge>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="mb-2 line-clamp-2 text-lg font-semibold leading-tight">
                        {activity.title}
                      </h3>

                      {/* Description */}
                      <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                        {activity.description}
                      </p>

                      {/* Time & Location */}
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(activity.startTime).toLocaleDateString('zh-CN', {
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        {activity.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="line-clamp-1">{activity.location}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="border-t p-4 pt-3">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatNumber(activity.viewCount)}
                        </span>
                        {activity.registrationCount !== undefined && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {activity.registrationCount} 已报名
                          </span>
                        )}
                        {activity.maxAttendees && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {activity.maxAttendees} 人上限
                          </span>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <Button
              variant="outline className="
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              上一页
            </Button>
            <span className="flex items-center px-4 text-sm">
              第 {page} / {totalPages} 页
            </span>
            <Button
              variant="outline className="
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
