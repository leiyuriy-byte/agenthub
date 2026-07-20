'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { adminApi, AdminPost } from '@/lib/api';
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
  Pin,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layout/admin-layout';

const typeLabels: Record<string, string> = {
  normal: '普通',
  question: '问答',
  poll: '投票',
  share: '分享',
};

const typeColors: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  question: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  poll: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  share: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

export default function AdminPostsPage() {
  const router = useRouter();
  const { user, checkAuth, logout } = useAuthStore();
  const [posts, setPosts] = useState<AdminPost[]>([]);
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

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const response = await adminApi.getPosts({
          limit,
          offset: (page - 1) * limit,
          search: search || undefined,
        });
        if (response.success && response.data) {
          setPosts(response.data.posts);
          setTotal(response.data.total);
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('Failed to fetch posts:', err);
        toast.error('加载帖子失败');
      } finally {
        setIsLoading(false);
      }
    };

    const currentUser = useAuthStore.getState().user;
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator')) {
      fetchPosts();
    }
  }, [page, search, limit, user]);

  // Toggle pin
  const handleTogglePin = async (postId: string, isPinned: boolean) => {
    setActionLoading(postId);
    try {
      const response = await adminApi.togglePostPin(postId, !isPinned);
      if (response.success) {
        setPosts(posts.map(p => p.id === postId ? { ...p, isPinned: !isPinned } : p));
        toast.success(isPinned ? '已取消置顶' : '已置顶');
      } else {
        toast.error(response.error || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete post
  const handleDeletePost = async (postId: string) => {
    if (!confirm('确定要删除此帖子吗？此操作不可撤销。')) return;

    setActionLoading(postId);
    try {
      const response = await adminApi.deletePost(postId);
      if (response.success) {
        setPosts(posts.filter(p => p.id !== postId));
        toast.success('帖子已删除');
      } else {
        toast.error(response.error || '删除失败');
      }
    } catch {
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
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">帖子管理</h1>
        <p className="mt-2 text-muted-foreground">管理社区帖子</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索帖子... className="
            className="pl-10 className="
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Posts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b">
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    帖子
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                    作者
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                    频道
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    置顶
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                    浏览
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
                ) : posts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      暂无帖子
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => (
                    <tr className="animate-fade-in hover:bg-muted/50"
                      key={post.id}
                    >
                      <td className="px-4 md:px-6 py-4">
                        <p className="font-medium line-clamp-1 max-w-[150px] md:max-w-none">{post.title}</p>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm hidden sm:table-cell">
                        {post.author ? (
                          <span>{post.author.displayName || post.author.username}</span>
                        ) : (
                          <span className="text-muted-foreground">未知</span>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-muted-foreground hidden md:table-cell">
                        {post.channel?.name || '未知'}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <span className={`text-xs border rounded px-2 py-1 ${typeColors[post.type]}`}>
                          {typeLabels[post.type] || post.type}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePin(post.id, post.isPinned)}
                          disabled={actionLoading === post.id}
                          className={post.isPinned ? 'text-primary' : 'text-muted-foreground'}
                        >
                          <Pin className={`h-4 w-4 ${post.isPinned ? 'fill-current' : ''}`} />
                        </Button>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-muted-foreground hidden lg:table-cell">
                        {post.viewCount.toLocaleString()}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/discussions/${post.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletePost(post.id)}
                            disabled={actionLoading === post.id}
                            className="text-destructive hover:text-destructive className="
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
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
