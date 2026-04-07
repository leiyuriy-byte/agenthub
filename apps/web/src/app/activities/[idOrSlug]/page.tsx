'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Badge } from '@agenthub/ui/badge';
import { Button } from '@agenthub/ui/button';
import { Skeleton } from '@agenthub/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@agenthub/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/lib/api';
import { activityApi, Activity } from '@/lib/api';
import { formatRelativeTime, formatNumber } from '@/lib/utils';
import { ChevronLeft, Calendar, MapPin, Video, Users, Eye, Share2, Loader2, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';

const statusLabels: Record<string, string> = {
  upcoming: '即将开始',
  ongoing: '进行中',
  ended: '已结束',
  cancelled: '已取消',
};

const statusColors: Record<string, string> = {
  upcoming: 'bg-blue-500',
  ongoing: 'bg-green-500',
  ended: 'bg-gray-500',
  cancelled: 'bg-red-500',
};

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  const idOrSlug = params.idOrSlug as string;

  const fetchActivity = useCallback(async () => {
    setIsLoading(true);
    const response = await activityApi.get(idOrSlug);
    if (response.success && response.data) {
      setActivity(response.data);
    } else {
      toast.error('活动不存在');
      router.push('/activities');
    }
    setIsLoading(false);
  }, [idOrSlug, router]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const handleRegister = async () => {
    if (!isAuthenticated) {
      toast.error('请先登录');
      router.push('/login');
      return;
    }
    if (!activity) return;

    setIsRegistering(true);
    const response = await activityApi.register(activity.id);
    if (response.success) {
      toast.success('报名成功！');
      setActivity((prev) => prev ? { ...prev, isRegistered: true, registrationCount: (prev.registrationCount || 0) + 1 } : null);
    } else {
      toast.error(response.error || '报名失败');
    }
    setIsRegistering(false);
  };

  const handleCancelRegister = async () => {
    if (!activity) return;
    if (!confirm('确定要取消报名吗？')) return;

    setIsRegistering(true);
    const response = await activityApi.cancelRegistration(activity.id);
    if (response.success) {
      toast.success('已取消报名');
      setActivity((prev) => prev ? { ...prev, isRegistered: false, registrationCount: Math.max(0, (prev.registrationCount || 1) - 1) } : null);
    } else {
      toast.error('取消失败');
    }
    setIsRegistering(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container max-w-4xl py-8">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-12 w-3/4 mb-2" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  if (!activity) {
    return null;
  }

  const isOrganizer = user?.id === activity.organizerId;
  const canRegister = !isOrganizer && activity.status === 'upcoming';

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-4xl py-8">
        {/* Back Link */}
        <Link
          href="/activities"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          返回活动列表
        </Link>

        {/* Activity Header */}
        <div className="mb-8">
          {/* Status & Type */}
          <div className="mb-4 flex flex-wrap gap-2">
            <div className={`px-3 py-1 rounded-full text-sm text-white font-medium ${statusColors[activity.status] || 'bg-gray-500'}`}>
              {statusLabels[activity.status] || activity.status}
            </div>
            <Badge variant="outline" className="gap-1">
              {activity.type === 'online' ? (
                <Video className="h-4 w-4" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              {activity.type === 'online' ? '线上活动' : '线下活动'}
            </Badge>
            {activity.isFeatured && <Badge variant="secondary">推荐</Badge>}
          </div>

          {/* Title */}
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            {activity.title}
          </h1>

          {/* Organizer */}
          <div className="mb-6 flex items-center gap-2">
            <span className="text-muted-foreground">组织者：</span>
            <Link
              href={`/users/${activity.organizerId}`}
              className="flex items-center gap-2 hover:text-foreground"
            >
              {activity.organizer?.avatar ? (
                <Avatar className="h-6 w-6">
                  <AvatarImage src={activity.organizer.avatar} />
                  <AvatarFallback>
                    {activity.organizer.displayName?.[0] || 'O'}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Avatar className="h-6 w-6">
                  <AvatarFallback>O</AvatarFallback>
                </Avatar>
              )}
              <span className="font-medium">
                {activity.organizer?.displayName || activity.organizer?.username}
              </span>
            </Link>
          </div>

          {/* Time & Location */}
          <div className="mb-6 flex flex-wrap gap-6 text-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">开始时间</div>
                <div className="text-muted-foreground">
                  {new Date(activity.startTime).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">结束时间</div>
                <div className="text-muted-foreground">
                  {new Date(activity.endTime).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          </div>

          {activity.location && (
            <div className="mb-6 flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">活动地点</div>
                <div className="text-muted-foreground">{activity.location}</div>
              </div>
            </div>
          )}

          {/* Register Button */}
          {canRegister && (
            <div className="mb-6">
              {activity.isRegistered ? (
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={handleCancelRegister}
                    disabled={isRegistering}
                    className="gap-2"
                  >
                    {isRegistering ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    已报名 - 取消
                  </Button>
                  <span className="text-muted-foreground">
                    您已报名此活动
                  </span>
                </div>
              ) : (
                <Button
                  onClick={handleRegister}
                  disabled={isRegistering}
                  className="gap-2"
                >
                  {isRegistering ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {activity.maxAttendees && activity.registrationCount !== undefined && activity.registrationCount >= activity.maxAttendees
                    ? '报名已满'
                    : '立即报名'}
                </Button>
              )}
            </div>
          )}

          {/* Share */}
          <div className="flex gap-4">
            <Button variant="outline" className="gap-2">
              <Share2 className="h-4 w-4" />
              分享
            </Button>
          </div>
        </div>

        {/* Cover Image */}
        {activity.coverImage && (
          <div className="mb-8 relative h-80 w-full overflow-hidden rounded-lg">
            <img
              src={activity.coverImage}
              alt={activity.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Description */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">活动详情</h2>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p>{activity.description}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground border-t pt-6">
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {formatNumber(activity.viewCount)} 次浏览
          </span>
          {activity.registrationCount !== undefined && (
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {activity.registrationCount} 已报名
            </span>
          )}
          {activity.maxAttendees && (
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {activity.maxAttendees} 人上限
            </span>
          )}
          <span>{formatRelativeTime(activity.createdAt)}</span>
        </div>

        {/* Create New */}
        <div className="mt-12 p-6 bg-muted rounded-lg">
          <h3 className="text-lg font-semibold mb-2">组织活动？</h3>
          <p className="text-muted-foreground mb-4">
            有有趣的 AI Agent 线下聚会、技术分享会？创建一个活动吧！
          </p>
          <Link href="/activities/new">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              创建活动
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
