'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { adminApi, TrendData, PopularAgent, PopularTag, ActivityHour, OverviewStats } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@agenthub/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@agenthub/ui/tabs';
import {
  Users,
  Bot as BotIcon,
  FileText as PostIcon,
  TrendingUp,
  Eye,
  Star,
  Tag,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layout/admin-layout';

// Colors for charts
const COLORS = {
  users: '#3b82f6',
  agents: '#8b5cf6',
  posts: '#22c55e',
  comments: '#f97316',
};

const PIE_COLORS = ['#22c55e', '#f97316', '#3b82f6', '#8b5cf6', '#ef4444'];

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}

function StatsCard({ title, value, subtitle, icon: Icon, color }: StatsCardProps) {
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
              <p className="mt-2 text-3xl font-bold">{value}</p>
              {subtitle && (
                <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
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

function TrendChart({ data, title }: { data: TrendData[]; title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="users"
                name="用户"
                stroke={COLORS.users}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="agents"
                name="Agent"
                stroke={COLORS.agents}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="posts"
                name="帖子"
                stroke={COLORS.posts}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityChart({ data }: { data: ActivityHour[] }) {
  const formattedData = data.map((item) => ({
    ...item,
    hour: `${item.hour}:00`,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          用户活跃时段（最近 30 天）
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="hour" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="posts" name="帖子" fill={COLORS.posts} radius={[4, 4, 0, 0]} />
              <Bar dataKey="comments" name="评论" fill={COLORS.comments} radius={[4, 4, 0, 0]} />
              <Bar dataKey="agents" name="Agent" fill={COLORS.agents} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function PopularAgentsTable({ agents }: { agents: PopularAgent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BotIcon className="h-5 w-5" />
          热门 Agent
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">#</th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">名称</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                  <Eye className="h-4 w-4 inline" />
                </th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                  <Star className="h-4 w-4 inline" />
                </th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">评分</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, index) => (
                <tr key={agent.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-2 text-muted-foreground">{index + 1}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {agent.logo && (
                        <img
                          src={agent.logo}
                          alt={agent.name}
                          className="h-8 w-8 rounded object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.tagline}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">{agent.viewCount.toLocaleString()}</td>
                  <td className="py-3 px-2 text-right">{agent.starCount.toLocaleString()}</td>
                  <td className="py-3 px-2 text-right">
                    {agent.avgRating ? agent.avgRating.toFixed(1) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function PopularTagsChart({ tags }: { tags: PopularTag[] }) {
  const top10Tags = tags.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Tag className="h-5 w-5" />
          热门标签 Top 10
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top10Tags} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" />
              <YAxis dataKey="name" type="category" className="text-xs" width={70} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" name="使用次数" fill={COLORS.agents} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewPanel({ overview }: { overview: OverviewStats }) {
  const agentStatusData = [
    { name: '已发布', value: overview.agents.published },
    { name: '草稿', value: overview.agents.draft },
  ];

  const last30DaysData = [
    { name: '新增用户', value: overview.last30Days.users },
    { name: '新增帖子', value: overview.last30Days.posts },
    { name: '新增评论', value: overview.last30Days.comments },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Agent Status Pie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Agent 状态分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={agentStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {agentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Last 30 Days Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">近 30 天新增</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last30DaysData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" name="数量" radius={[4, 4, 0, 0]}>
                  {last30DaysData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">核心指标</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{overview.totals.users}</p>
              <p className="text-sm text-muted-foreground">总用户</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{overview.totals.agents}</p>
              <p className="text-sm text-muted-foreground">总 Agent</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{overview.totals.posts}</p>
              <p className="text-sm text-muted-foreground">总帖子</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{overview.averageRating || '-'}</p>
              <p className="text-sm text-muted-foreground">平均评分</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminStatsPage() {
  const router = useRouter();
  const { user, checkAuth, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [trendsDays, setTrendsDays] = useState(30);
  const [popularAgents, setPopularAgents] = useState<PopularAgent[]>([]);
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);
  const [activityHours, setActivityHours] = useState<ActivityHour[]>([]);
  const [overview, setOverview] = useState<OverviewStats | null>(null);

  // Check auth and admin role
  useEffect(() => {
    checkAuth().then(() => {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) {
        router.push('/login?redirect=/admin/stats');
        return;
      }
      if (currentUser.role !== 'admin' && currentUser.role !== 'moderator') {
        toast.error('无权限访问');
        router.push('/');
        return;
      }
    });
  }, [checkAuth, router]);

  // Fetch all stats data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trendsRes, popularAgentsRes, popularTagsRes, activityHoursRes, overviewRes] =
          await Promise.all([
            adminApi.getTrends(trendsDays),
            adminApi.getPopularAgents(10, 'views'),
            adminApi.getPopularTags(20),
            adminApi.getActivityHours(),
            adminApi.getOverview(),
          ]);

        if (trendsRes.success && trendsRes.data) {
          setTrends(trendsRes.data.trends);
        }
        if (popularAgentsRes.success && popularAgentsRes.data) {
          setPopularAgents(popularAgentsRes.data);
        }
        if (popularTagsRes.success && popularTagsRes.data) {
          setPopularTags(popularTagsRes.data);
        }
        if (activityHoursRes.success && activityHoursRes.data) {
          setActivityHours(activityHoursRes.data);
        }
        if (overviewRes.success && overviewRes.data) {
          setOverview(overviewRes.data);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') console.error('Failed to fetch stats:', error);
        toast.error('获取统计数据失败');
      } finally {
        setIsLoading(false);
      }
    };

    const currentUser = useAuthStore.getState().user;
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator')) {
      fetchData();
    }
  }, [trendsDays, user]);

  // Fetch trends when days change
  const handleTrendsDaysChange = async (days: number) => {
    setTrendsDays(days);
  };

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
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">数据统计</h1>
        <p className="mt-2 text-muted-foreground">平台运营数据可视化分析</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap gap-2 h-auto p-1 bg-muted/50">
          <TabsTrigger value="overview" className="px-4">
            概览
          </TabsTrigger>
          <TabsTrigger value="trends" className="px-4">
            增长趋势
          </TabsTrigger>
          <TabsTrigger value="agents" className="px-4">
            热门 Agent
          </TabsTrigger>
          <TabsTrigger value="tags" className="px-4">
            标签分析
          </TabsTrigger>
          <TabsTrigger value="activity" className="px-4">
            活跃时段
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {overview && <OverviewPanel overview={overview} />}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          {/* Days selector */}
          <div className="flex gap-2">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => handleTrendsDaysChange(days)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  trendsDays === days
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {days} 天
              </button>
            ))}
          </div>

          <TrendChart data={trends} title={`增长趋势（近 ${trendsDays} 天）`} />

          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <StatsCard
              title="新增用户"
              value={trends.reduce((sum, t) => sum + t.users, 0)}
              icon={Users}
              color="bg-blue-500"
            />
            <StatsCard
              title="新增 Agent"
              value={trends.reduce((sum, t) => sum + t.agents, 0)}
              icon={BotIcon}
              color="bg-purple-500"
            />
            <StatsCard
              title="新增帖子"
              value={trends.reduce((sum, t) => sum + t.posts, 0)}
              icon={PostIcon}
              color="bg-green-500"
            />
          </div>
        </TabsContent>

        {/* Popular Agents Tab */}
        <TabsContent value="agents" className="space-y-6">
          <PopularAgentsTable agents={popularAgents} />
        </TabsContent>

        {/* Popular Tags Tab */}
        <TabsContent value="tags" className="space-y-6">
          <PopularTagsChart tags={popularTags} />
        </TabsContent>

        {/* Activity Hours Tab */}
        <TabsContent value="activity" className="space-y-6">
          <ActivityChart data={activityHours} />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
