'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { adminApi, AdminUser } from '@/lib/api';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layout/admin-layout';

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, checkAuth, logout } = useAuthStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
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

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const response = await adminApi.getUsers({
          limit,
          offset: (page - 1) * limit,
          search: search || undefined,
        });
        if (response.success && response.data) {
          setUsers(response.data.users);
          setTotal(response.data.total);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
        toast.error('加载用户失败');
      } finally {
        setIsLoading(false);
      }
    };

    const currentUser = useAuthStore.getState().user;
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator')) {
      fetchUsers();
    }
  }, [page, search, limit, user]);

  // Update role
  const handleUpdateRole = async (userId: string, role: string) => {
    setActionLoading(userId);
    try {
      const response = await adminApi.updateUserRole(userId, role);
      if (response.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
        toast.success('用户角色已更新');
      } else {
        toast.error(response.error || '更新失败');
      }
    } catch (error) {
      toast.error('更新失败');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除此用户吗？此操作不可撤销。')) return;

    setActionLoading(userId);
    try {
      const response = await adminApi.deleteUser(userId);
      if (response.success) {
        setUsers(users.filter(u => u.id !== userId));
        toast.success('用户已删除');
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
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">用户管理</h1>
        <p className="mt-2 text-muted-foreground">管理系统用户</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索用户..."
            className="pl-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b">
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    用户
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    邮箱
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    角色
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    等级
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                    注册时间
                  </th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      暂无用户
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-muted/50"
                    >
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            {u.avatar ? (
                              <Image src={u.avatar} alt="" width={40} height={40} className="rounded-full object-cover" />
                            ) : (
                              <span className="text-sm font-medium">
                                {u.displayName?.charAt(0) || u.username.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{u.displayName || u.username}</p>
                            <p className="text-sm text-muted-foreground truncate">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm text-muted-foreground truncate max-w-[150px]">
                        {u.email}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                          disabled={actionLoading === u.id || u.id === user.id}
                          className="text-sm border rounded px-2 py-1 bg-background w-full md:w-auto"
                        >
                          <option value="user">用户</option>
                          <option value="moderator">版主</option>
                          <option value="admin">管理员</option>
                        </select>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                          Lv.{u.level}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm text-muted-foreground hidden sm:table-cell">
                        {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(u.id)}
                          disabled={actionLoading === u.id || u.id === user.id}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
