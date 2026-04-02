'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { adminApi, AdminAgent } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@agenthub/ui/button';
import { Card, CardContent } from '@agenthub/ui/card';
import { Input } from '@agenthub/ui/input';
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Star,
  Eye,
  Bot,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layout/admin-layout';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  archived: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export default function AdminAgentsPage() {
  const router = useRouter();
  const { user, checkAuth, logout } = useAuthStore();
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check auth
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

  // Fetch agents
  useEffect(() => {
    const fetchAgents = async () => {
      setIsLoading(true);
      try {
        const response = await adminApi.getAgents({
          limit,
          offset: (page - 1) * limit,
          search: search || undefined,
          status: statusFilter || undefined,
        });
        if (response.success && response.data) {
          setAgents(response.data.agents);
          setTotal(response.data.total);
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error);
        toast.error('加载 Agent 失败');
      } finally {
        setIsLoading(false);
      }
    };

    const currentUser = useAuthStore.getState().user;
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator')) {
      fetchAgents();
    }
  }, [page, search, statusFilter, limit, user]);

  // Update status
  const handleUpdateStatus = async (agentId: string, status: string) => {
    setActionLoading(agentId);
    try {
      const response = await adminApi.updateAgentStatus(agentId, status);
      if (response.success) {
        setAgents(agents.map(a => a.id === agentId ? { ...a, status } : a));
        toast.success('状态已更新');
      } else {
        toast.error(response.error || '更新失败');
      }
    } catch (error) {
      toast.error('更新失败');
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle featured
  const handleToggleFeatured = async (agentId: string, isFeatured: boolean) => {
    setActionLoading(agentId);
    try {
      const response = await adminApi.toggleAgentFeatured(agentId, isFeatured);
      if (response.success) {
        setAgents(agents.map(a => a.id === agentId ? { ...a, isFeatured } : a));
        toast.success(isFeatured ? '已设为精选' : '已取消精选');
      } else {
        toast.error(response.error || '操作失败');
      }
    } catch (error) {
      toast.error('操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete agent
  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('确定要删除此 Agent 吗？此操作不可撤销。')) return;

    setActionLoading(agentId);
    try {
      const response = await adminApi.deleteAgent(agentId);
      if (response.success) {
        setAgents(agents.filter(a => a.id !== agentId));
        toast.success('Agent 已删除');
      } else {
        toast.error(response.error || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const totalPages = Math.ceil(total / limit);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <AdminLayout onLogout={handleLogout}>
      {/* Page Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Agent 管理</h1>
        <p className="mt-2 text-muted-foreground">管理 Agent 项目</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative max-w-md flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索 Agent..."
            className="pl-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="border rounded-lg px-3 py-2 bg-background text-sm w-full sm:w-auto"
        >
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="archived">已归档</option>
        </select>
      </div>

      {/* Agents Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b">
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                    开发者
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    精选
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                    浏览
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                    评分
                  </th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : agents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      暂无 Agent
                    </td>
                  </tr>
                ) : (
                  agents.map((agent) => (
                    <motion.tr
                      key={agent.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-muted/50"
                    >
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                            {agent.logo ? (
                              <Image src={agent.logo} alt="" width={40} height={40} className="object-cover" />
                            ) : (
                              <Bot className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[120px] md:max-w-[200px]">{agent.name}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1 hidden sm:block">
                              {agent.tagline || '暂无描述'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm hidden sm:table-cell">
                        {agent.owner ? (
                          <span>{agent.owner.displayName || agent.owner.username}</span>
                        ) : (
                          <span className="text-muted-foreground">未知</span>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <select
                          value={agent.status}
                          onChange={(e) => handleUpdateStatus(agent.id, e.target.value)}
                          disabled={actionLoading === agent.id}
                          className={`text-xs border rounded px-2 py-1 ${statusColors[agent.status]} w-full sm:w-auto`}
                        >
                          <option value="draft">草稿</option>
                          <option value="published">已发布</option>
                          <option value="archived">已归档</option>
                        </select>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleFeatured(agent.id, !agent.isFeatured)}
                          disabled={actionLoading === agent.id}
                          className={agent.isFeatured ? 'text-yellow-500' : 'text-muted-foreground'}
                        >
                          {agent.isFeatured ? (
                            <Star className="h-4 w-4 fill-current" />
                          ) : (
                            <Star className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">
                        {agent.viewCount.toLocaleString()}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm hidden lg:table-cell">
                        {agent.avgRating ? (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {agent.avgRating.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/agents/${agent.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAgent(agent.id)}
                            disabled={actionLoading === agent.id}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            共 {total} 条记录，第 {page}/{totalPages} 页
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
