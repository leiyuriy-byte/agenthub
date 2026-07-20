'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

import { Button } from '@agenthub/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@agenthub/ui/card';
import { Badge } from '@agenthub/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@agenthub/ui/avatar';
import { Input } from '@agenthub/ui/input';
import { channelApi, postApi, Channel, Post } from '@/lib/api';
import { formatRelativeTime, formatNumber, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import {
  MessageSquare,
  ThumbsUp,
  Eye,
  Clock,
  Star,
  Plus,
  Loader2,
  Search,
  Pin,
  Filter,
} from 'lucide-react';

type SortOption = 'createdAt' | 'likeCount' | 'viewCount';
type SortOrder = 'asc' | 'desc';
type PostType = 'all' | 'normal' | 'question' | 'poll' | 'share';

export default function DiscussionsPage() {
  const { user } = useAuthStore();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('createdAt');
  const [sortOrder] = useState<SortOrder>('desc');
  const [postType, setPostType] = useState<PostType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Fetch channels
  useEffect(() => {
    const fetchChannels = async () => {
      const response = await channelApi.list();
      if (response.success && response.data) {
        setChannels(response.data);
      }
    };
    fetchChannels();
  }, []);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    const response = await postApi.list({
      limit,
      offset: (page - 1) * limit,
      channelId: selectedChannel || undefined,
      sortBy,
      sortOrder,
      type: postType === 'all' ? undefined : postType,
      search: searchQuery || undefined,
    });

    if (response.success && response.data) {
      setPosts(response.data.posts);
      setTotal(response.data.total);
    }
    setIsLoading(false);
  }, [page, selectedChannel, sortBy, sortOrder, postType, searchQuery]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const totalPages = Math.ceil(total / limit);

  // Get post type badge variant
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'question':
        return { variant: 'default' as const, label: '问答', className: 'bg-blue-500/20 text-blue-600' };
      case 'poll':
        return { variant: 'default' as const, label: '投票', className: 'bg-purple-500/20 text-purple-600' };
      case 'share':
        return { variant: 'default' as const, label: '分享', className: 'bg-green-500/20 text-green-600' };
      default:
        return { variant: 'secondary' as const, label: '讨论', className: '' };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <div className="flex gap-8">
          {/* Left Sidebar - Channels */}
          <aside className="w-64 shrink-0 hidden lg:block">
            <div className="sticky top-24 space-y-4">
              {/* Create Post Button */}
              {user && (
                <Link href="/discussions/new">
                  <Button className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    发布帖子
                  </Button>
                </Link>
              )}

              {/* Channel List */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    频道
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <button
                    onClick={() => { setSelectedChannel(''); setPage(1); }}
                    aria-pressed={selectedChannel === ''}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm transition-colors min-h-[44px]',
                      selectedChannel === ''
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <span>全部频道</span>
                    <span className="text-xs text-muted-foreground">全部</span>
                  </button>
                  {channels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => { setSelectedChannel(channel.id); setPage(1); }}
                      aria-pressed={selectedChannel === channel.id}
                      aria-label={`${channel.name}频道，共${channel.postCount}个帖子`}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm transition-colors min-h-[44px]',
                        selectedChannel === channel.id
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span>{channel.icon}</span>
                        <span>{channel.name}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {channel.postCount}
                      </span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Page Header */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">讨论区</h1>
              <p className="mt-1 text-muted-foreground">
                与社区成员交流、分享和讨论
              </p>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索帖子..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Sort */}
                <div className="flex items-center gap-1 border rounded-lg p-1" role="group" aria-label="排序方式">
                  <button
                    onClick={() => setSortBy('createdAt')}
                    aria-pressed={sortBy === 'createdAt'}
                    className={cn(
                      'flex items-center gap-1 px-3 py-2 rounded text-xs transition-colors min-h-[44px]',
                      sortBy === 'createdAt' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                    )}
                  >
                    <Clock className="h-3 w-3" />
                    最新
                  </button>
                  <button
                    onClick={() => setSortBy('likeCount')}
                    aria-pressed={sortBy === 'likeCount'}
                    className={cn(
                      'flex items-center gap-1 px-3 py-2 rounded text-xs transition-colors min-h-[44px]',
                      sortBy === 'likeCount' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                    )}
                  >
                    <ThumbsUp className="h-3 w-3" />
                    热门
                  </button>
                  <button
                    onClick={() => setSortBy('viewCount')}
                    aria-pressed={sortBy === 'viewCount'}
                    className={cn(
                      'flex items-center gap-1 px-3 py-2 rounded text-xs transition-colors min-h-[44px]',
                      sortBy === 'viewCount' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                    )}
                  >
                    <Eye className="h-3 w-3" />
                    浏览
                  </button>
                </div>

                {/* Type Filter */}
                <select
                  value={postType}
                  onChange={(e) => { setPostType(e.target.value as PostType); setPage(1); }}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">全部类型</option>
                  <option value="normal">讨论</option>
                  <option value="question">问答</option>
                  <option value="share">分享</option>
                  <option value="poll">投票</option>
                </select>

                {/* Mobile Create Button */}
                {user && (
                  <Link href="/discussions/new" className="lg:hidden">
                    <Button size="sm" className="gap-1">
                      <Plus className="h-4 w-4" />
                      发布
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Mobile Channel Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
              <Badge
                variant={selectedChannel === '' ? 'default' : 'outline'}
                className="cursor-pointer shrink-0"
                onClick={() => { setSelectedChannel(''); setPage(1); }}
              >
                全部
              </Badge>
              {channels.map((channel) => (
                <Badge
                  key={channel.id}
                  variant={selectedChannel === channel.id ? 'default' : 'outline'}
                  className="cursor-pointer shrink-0"
                  onClick={() => { setSelectedChannel(channel.id); setPage(1); }}
                >
                  {channel.icon} {channel.name}
                </Badge>
              ))}
            </div>

            {/* Post List */}
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : posts.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">暂无帖子</h3>
                <p className="text-muted-foreground mt-1">成为第一个发布帖子的人吧！</p>
                {user && (
                  <Link href="/discussions/new">
                    <Button className="mt-4 gap-2">
                      <Plus className="h-4 w-4" />
                      发布帖子
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post, index) => {
                  const typeBadge = getTypeBadge(post.type);
                  return (
                    <div className="animate-slide-up"
                      key={post.id}
                      
                      
                      
                    >
                      <Link href={`/discussions/${post.id}`}>
                        <Card className="transition-all hover:border-primary/50 hover:shadow-md">
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              {/* Vote Column */}
                              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                <span className="text-xs font-medium">{formatNumber(post.likeCount)}</span>
                                <ThumbsUp className="h-4 w-4" />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                {/* Pinned / Featured */}
                                {(post.isPinned || post.isFeatured) && (
                                  <div className="flex items-center gap-2 mb-1">
                                    {post.isPinned && (
                                      <Badge variant="default" className="text-xs bg-orange-500/20 text-orange-600 gap-1">
                                        <Pin className="h-3 w-3" /> 置顶
                                      </Badge>
                                    )}
                                    {post.isFeatured && (
                                      <Badge variant="default" className="text-xs bg-yellow-500/20 text-yellow-600 gap-1">
                                        <Star className="h-3 w-3" /> 精华
                                      </Badge>
                                    )}
                                  </div>
                                )}

                                {/* Title */}
                                <h3 className="font-semibold truncate hover:text-primary transition-colors">
                                  {post.title}
                                </h3>

                                {/* Meta */}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                                  {/* Channel */}
                                  {post.channel && (
                                    <span className="flex items-center gap-1">
                                      <span>{post.channel.icon}</span>
                                      {post.channel.name}
                                    </span>
                                  )}

                                  {/* Author */}
                                  <span className="flex items-center gap-1">
                                    <Avatar className="h-4 w-4">
                                      <AvatarImage src={post.author?.avatar} />
                                      <AvatarFallback className="text-[8px]">
                                        {post.author?.username?.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    {post.author?.displayName || post.author?.username}
                                  </span>

                                  {/* Time */}
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatRelativeTime(post.createdAt)}
                                  </span>

                                  {/* Views */}
                                  <span className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    {formatNumber(post.viewCount)}
                                  </span>

                                  {/* Comments */}
                                  <span className="flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {formatNumber(post.commentCount)}
                                  </span>
                                </div>

                                {/* Tags */}
                                {post.tags && post.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {post.tags.map((tag) => (
                                      <Badge key={tag} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}

                                {/* Type Badge */}
                                <div className="mt-2">
                                  <Badge variant={typeBadge.variant} className={cn('text-xs', typeBadge.className)}>
                                    {typeBadge.label}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  上一页
                </Button>
                <span className="text-sm text-muted-foreground">
                  第 {page} / {totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  下一页
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
