'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { feedApi, FeedItem } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

import { formatRelativeTime } from '@/lib/utils';
import { Button } from '@agenthub/ui/button';
import { Card, CardContent } from '@agenthub/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@agenthub/ui/avatar';
import { Badge } from '@agenthub/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@agenthub/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bot,
  FileText,
  MessageSquare,
  Star,
  Eye,
  Loader2,
  UserPlus,
  PenLine,
  Sparkles,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Get icon and color for feed type
const getFeedTypeInfo = (type: FeedItem['type']) => {
  switch (type) {
    case 'agent':
      return { icon: Bot, color: 'text-purple-500', bg: 'bg-purple-500/10' };
    case 'post':
      return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' };
    case 'comment':
      return { icon: MessageSquare, color: 'text-green-500', bg: 'bg-green-500/10' };
  }
};

// Get action text for feed type
const getFeedActionText = (type: FeedItem['type']) => {
  switch (type) {
    case 'agent':
      return '发布了新 Agent';
    case 'post':
      return '发布了新帖子';
    case 'comment':
      return '发表了评论';
  }
};

export default function FeedPage() {
  const { user, isAuthenticated } = useAuth();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedType, setFeedType] = useState<'following' | 'global'>('global');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const limit = 20;

  // Fetch feed
  const fetchFeed = async (type: 'following' | 'global', reset = false) => {
    const currentOffset = reset ? 0 : offset;
    
    try {
      if (reset) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const response = await feedApi.getFeed({
        limit,
        offset: currentOffset,
        type,
      });

      if (response.success && response.data) {
        const feedData = response.data;
        if (reset) {
          setFeed(feedData.feed ?? []);
        } else {
          setFeed(prev => [...prev, ...(feedData.feed ?? [])]);
        }
        setHasMore(feedData.pagination?.hasMore ?? false);
        setOffset(currentOffset + limit);
      }
    } catch (error) {
      console.error('Failed to fetch feed:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchFeed(feedType, true);
  }, [feedType]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    const newType = value as 'following' | 'global';
    setFeedType(newType);
    setOffset(0);
    setHasMore(true);
  };

  // Load more
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchFeed(feedType, false);
    }
  };

  // Get link for feed item
  const getFeedItemLink = (item: FeedItem) => {
    switch (item.type) {
      case 'agent':
        return `/agents/${item.data.agentId}`;
      case 'post':
        return `/discussions/${item.data.postId}`;
      case 'comment':
        if (item.data.targetType === 'agent') {
          return `/agents/${item.data.targetId}`;
        }
        return `/discussions/${item.data.targetId}`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <Sparkles className="h-6 w-6 text-primary" />
              AgentHub
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link href="/agents/new">
                <Button size="sm">创建 Agent</Button>
              </Link>
            ) : (
              <Link href="/register">
                <Button size="sm">加入社区</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="mx-auto max-w-3xl">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">动态</h1>
            <p className="text-muted-foreground mt-1">
              关注用户最新动态，发现社区热门内容
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={feedType} onValueChange={handleTabChange} className="mb-8">
            <TabsList>
              <TabsTrigger value="global">发现</TabsTrigger>
              <TabsTrigger value="following" disabled={!isAuthenticated}>
                关注动态
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Feed List */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : feed.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">暂无动态</h3>
              <p className="text-muted-foreground mb-6">
                {feedType === 'following' 
                  ? '关注一些用户来查看他们的最新动态'
                  : '还没有任何动态内容'}
              </p>
              {feedType === 'following' && (
                <Link href="/agents">
                  <Button>发现更多 Agent</Button>
                </Link>
              )}
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {feed.map((item) => {
                const TypeInfo = getFeedTypeInfo(item.type);
                const Icon = TypeInfo.icon;
                const link = getFeedItemLink(item);

                return (
                  <motion.div key={item.id} variants={itemVariants}>
                    <Link href={link}>
                      <Card className="hover:border-primary/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* User Avatar */}
                            <Link href={`/users/${item.user.username}`} onClick={(e) => e.stopPropagation()}>
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={item.user.avatar || undefined} />
                                <AvatarFallback>
                                  {item.user.displayName?.charAt(0).toUpperCase() || item.user.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </Link>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              {/* Header */}
                              <div className="flex items-center gap-2 mb-1">
                                <Link 
                                  href={`/users/${item.user.username}`} 
                                  className="font-medium hover:text-primary"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {item.user.displayName || item.user.username}
                                </Link>
                                <span className="text-muted-foreground text-sm">
                                  {getFeedActionText(item.type)}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  · {formatRelativeTime(item.createdAt)}
                                </span>
                              </div>

                              {/* Type Badge */}
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary" className={`${TypeInfo.bg} ${TypeInfo.color} border-0`}>
                                  <Icon className="h-3 w-3 mr-1" />
                                  {item.type === 'agent' && 'Agent'}
                                  {item.type === 'post' && '帖子'}
                                  {item.type === 'comment' && '评论'}
                                </Badge>
                              </div>

                              {/* Content Preview */}
                              {item.type === 'agent' && item.data.agentName && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                  <div className="h-12 w-12 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                                    {item.data.agentLogo ? (
                                      <Image 
                                        src={item.data.agentLogo} 
                                        alt={item.data.agentName}
                                        width={48}
                                        height={48}
                                        className="object-cover"
                                      />
                                    ) : (
                                      <Bot className="h-6 w-6 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium truncate">{item.data.agentName}</h4>
                                    {item.data.agentTagline && (
                                      <p className="text-sm text-muted-foreground truncate">
                                        {item.data.agentTagline}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {item.type === 'post' && item.data.postTitle && (
                                <div className="space-y-1">
                                  <h4 className="font-medium truncate">{item.data.postTitle}</h4>
                                  {item.data.postExcerpt && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {item.data.postExcerpt}
                                    </p>
                                  )}
                                  {item.data.channelName && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge variant="outline" className="text-xs">
                                        {item.data.channelIcon} {item.data.channelName}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              )}

                              {item.type === 'comment' && item.data.commentContent && (
                                <div className="space-y-1">
                                  {item.data.targetTitle && (
                                    <p className="text-sm text-muted-foreground">
                                      评论了: <span className="text-foreground">{item.data.targetTitle}</span>
                                    </p>
                                  )}
                                  <p className="text-sm line-clamp-2">{item.data.commentContent}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center py-4">
                  <Button 
                    variant="outline" 
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        加载中...
                      </>
                    ) : (
                      '加载更多'
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
