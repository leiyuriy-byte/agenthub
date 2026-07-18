'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@agenthub/ui/button';
import { Card, CardContent } from '@agenthub/ui/card';
import { notificationApi, Notification, useAuthStore } from '@/lib/api';
import { formatRelativeTime, cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Loader2,
  MessageSquare,
  ThumbsUp,
  UserPlus,
  AlertCircle,
  Trash2,
} from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await notificationApi.list({
        limit: 50,
        offset: 0,
        unreadOnly: filter === 'unread',
      });

      if (response.success && response.data) {
        setNotifications(response.data.notifications);
        setTotal(response.data.total);
        setUnreadCount(response.data.unreadCount);
      }
    } catch {
      toast.error('获取通知失败');
    }
    setIsLoading(false);
  }, [user, filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark notification as read
  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await notificationApi.markAsRead(id);
      if (response.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      toast.error('操作失败');
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    setIsMarkingAllRead(true);
    try {
      const response = await notificationApi.markAllAsRead();
      if (response.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success('已标记全部为已读');
      }
    } catch {
      toast.error('操作失败');
    }
    setIsMarkingAllRead(false);
  };

  // Delete notification
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条通知吗？')) return;

    try {
      const response = await notificationApi.delete(id);
      if (response.success) {
        const notification = notifications.find((n) => n.id === id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (notification && !notification.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        toast.success('通知已删除');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'reply':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'like':
        return <ThumbsUp className="h-4 w-4 text-red-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-purple-500" />;
      case 'system':
        return <Bell className="h-4 w-4 text-orange-500" />;
      case 'mention':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">通知</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount > 0 ? `${unreadCount} 条未读通知` : '暂无未读通知'}
            </p>
          </div>
          <div className="flex gap-2">
            {/* Filter */}
            <div className="flex border rounded-lg overflow-hidden" role="tablist" aria-label="通知筛选">
              <button
                onClick={() => setFilter('all')}
                aria-selected={filter === 'all'}
                role="tab"
                className={cn(
                  'px-3 py-1.5 text-sm transition-colors min-h-[44px]',
                  filter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-accent'
                )}
              >
                全部
              </button>
              <button
                onClick={() => setFilter('unread')}
                aria-selected={filter === 'unread'}
                role="tab"
                className={cn(
                  'px-3 py-1.5 text-sm transition-colors min-h-[44px]',
                  filter === 'unread'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-accent'
                )}
              >
                未读
              </button>
            </div>
            {/* Mark all read */}
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllRead}
                className="gap-1"
              >
                {isMarkingAllRead ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4" />
                )}
                全部已读
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <BellOff className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  {filter === 'unread' ? '暂无未读通知' : '暂无通知'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification, index) => (
                  <div class="animate-slide-up"
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'flex items-start gap-3 p-4 hover:bg-accent/50 transition-colors',
                      !notification.isRead && 'bg-primary/5'
                    )}
                  >
                    {/* Unread indicator */}
                    {!notification.isRead && (
                      <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                    )}

                    {/* Icon */}
                    <div className="shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {notification.link ? (
                        <Link
                          href={notification.link}
                          className="block hover:opacity-80"
                          onClick={() => {
                            if (!notification.isRead) {
                              handleMarkAsRead(notification.id);
                            }
                          }}
                        >
                          <p className="font-medium text-sm">{notification.title}</p>
                          {notification.content && (
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {notification.content}
                            </p>
                          )}
                        </Link>
                      ) : (
                        <>
                          <p className="font-medium text-sm">{notification.title}</p>
                          {notification.content && (
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {notification.content}
                            </p>
                          )}
                        </>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleMarkAsRead(notification.id)}
                          title="标记为已读"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(notification.id)}
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
