'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { adminApi, AdminPost } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@agenthub/ui/button';
import { Card, CardContent } from '@agenthub/ui/card';
import { Input } from '@agenthub/ui/input';
import {
  LayoutDashboard,
  Users,
  Bot,
  FileText,
  MessageSquare,
  Settings,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pin,
  LogOut,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

const navItems = [
  { label: '仪表盘', href: '/admin', icon: LayoutDashboard },
  { label: '用户管理', href: '/admin/users', icon: Users },
  { label: 'Agent 管理', href: '/admin/agents', icon: Bot },
  { label: '帖子管理', href: '/admin/posts', icon: FileText },
  { label: '评论管理', href: '/admin/comments', icon: MessageSquare },
];

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
      } catch (error) {
        console.error('Failed to fetch posts:', error);
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
    } catch (error) {
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen border-r bg-card fixed left-0 top-0">
          <div className="p-6">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Settings className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">管理后台</span>
            </Link>
          </div>

          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium">{user.displayName?.charAt(0) || user.username.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.displayName || user.username}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-64 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">帖子管理</h1>
              <p className="mt-2 text-muted-foreground">管理社区帖子</p>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索帖子..."
                  className="pl-10"
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
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          帖子
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          作者
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          频道
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          类型
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          置顶
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          浏览
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          评论
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          创建时间
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {isLoading ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-12 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          </td>
                        </tr>
                      ) : posts.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                            暂无帖子
                          </td>
                        </tr>
                      ) : (
                        posts.map((post) => (
                          <motion.tr
                            key={post.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="hover:bg-muted/50"
                          >
                            <td className="px-6 py-4">
                              <Link href={`/discussions/${post.id}`} className="hover:text-primary">
                                <p className="font-medium line-clamp-1">{post.title}</p>
                              </Link>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {post.author ? (
                                <Link
                                  href={`/users/${post.authorId}`}
                                  className="hover:text-primary"
                                >
                                  {post.author.displayName || post.author.username}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">未知</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {post.channel?.name || '未知'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-xs border rounded px-2 py-1 ${typeColors[post.type]}`}>
                                {typeLabels[post.type] || post.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {post.viewCount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {post.commentCount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {new Date(post.createdAt).toLocaleDateString('zh-CN')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
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
              <div className="mt-6 flex items-center justify-between">
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
          </div>
        </main>
      </div>
    </div>
  );
}
