'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { adminApi, AdminStats } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent } from '@agenthub/ui/card';
import {
  Users,
  Bot as BotIcon,
  FileText as PostIcon,
  MessageCircle,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layout/admin-layout';

interface StatsCardProps {
  title: string;
  value: number;
  todayValue?: number;
  icon: React.ElementType;
  color: string;
}

function StatsCard({ title, value, todayValue, icon: Icon, color }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="mt-2 text-3xl font-bold">{value.toLocaleString()}</p>
              {todayValue !== undefined && todayValue > 0 && (
                <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                  今日 +{todayValue}
                </p>
              )}
            </div>
            <div className={`rounded-full p-3 ${color}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, checkAuth, logout } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check auth and admin role
  useEffect(() => {
    checkAuth().then(() => {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) {
        router.push('/login?redirect=/admin');
        return;
      }
      if (currentUser.role !== 'admin' && currentUser.role !== 'moderator') {
        toast.error('无权限访问');
        router.push('/');
        return;
      }
    });
  }, [checkAuth, router]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await adminApi.getStats();
        if (response.success && response.data) {
          setStats(response.data);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const currentUser = useAuthStore.getState().user;
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator')) {
      fetchStats();
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user.role !== 'admin' && user.role !== 'moderator') {
    return null;
  }

  return (
    <AdminLayout onLogout={handleLogout}>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">仪表盘</h1>
        <p className="mt-2 text-muted-foreground">欢迎回来，这是系统概览</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="总用户数"
          value={stats?.totalUsers || 0}
          todayValue={stats?.todayUsers}
          icon={Users}
          color="bg-blue-500"
        />
        <StatsCard
          title="总 Agent 数"
          value={stats?.totalAgents || 0}
          todayValue={stats?.todayAgents}
          icon={BotIcon}
          color="bg-purple-500"
        />
        <StatsCard
          title="总帖子数"
          value={stats?.totalPosts || 0}
          todayValue={stats?.todayPosts}
          icon={PostIcon}
          color="bg-green-500"
        />
        <StatsCard
          title="总评论数"
          value={stats?.totalComments || 0}
          icon={MessageCircle}
          color="bg-orange-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg md:text-xl font-semibold mb-4">快速操作</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/users">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">用户管理</p>
                  <p className="text-sm text-muted-foreground">查看和管理用户</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/agents">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                  <BotIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">Agent 管理</p>
                  <p className="text-sm text-muted-foreground">管理 Agent 上下架</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/posts">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                  <PostIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">帖子管理</p>
                  <p className="text-sm text-muted-foreground">管理帖子和置顶</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
