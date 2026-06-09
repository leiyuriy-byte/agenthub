'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@agenthub/ui/avatar';
import { Badge } from '@agenthub/ui/badge';
import { Button } from '@agenthub/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@agenthub/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@agenthub/ui/card';
import { Input } from '@agenthub/ui/input';
import { agentApi, Agent, agentCommentApi, AgentComment } from '@/lib/api';
import { formatRelativeTime, formatNumber, cn } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  Star,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  Github,
  BookOpen,
  Loader2,
  ChevronRight,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Bot,
  X,
  ChevronLeft,
  ChevronDown,
  ZoomIn,
  GitCompare,
  ThumbsUp,
} from 'lucide-react';
import { Textarea } from '@agenthub/ui/textarea';
import { toast } from 'sonner';

// Extended types for agent detail
interface AgentScreenshot {
  id: string;
  url: string;
  caption?: string;
  sortOrder: number;
}

interface AgentVersion {
  id: string;
  version: string;
  changelog?: string;
  downloadUrl?: string;
  features?: string; // JSON array of features for version comparison
  createdAt: string;
}

interface AgentDetail extends Agent {
  isFavorited?: boolean;
  userRating?: {
    id: string;
    overall: number;
    functionality?: number;
    usability?: number;
    documentation?: number;
    codeQuality?: number;
    design?: number;
    comment?: string;
    createdAt: string;
  } | null;
  screenshots?: AgentScreenshot[];
  versions?: AgentVersion[];
}

export default function AgentDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [isRatingLoading, setIsRatingLoading] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [relatedAgents, setRelatedAgents] = useState<Agent[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Version selector state
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  // Version tab state ('detail' | 'compare')
  const [versionTab, setVersionTab] = useState<'detail' | 'compare'>('detail');



  // Comments state
  const [comments, setComments] = useState<AgentComment[]>([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentSortBy, setCommentSortBy] = useState<'newest' | 'popular'>('newest');
  const [commentPage, setCommentPage] = useState(1);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyToComment, setReplyToComment] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const userId = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('agenthub_user') || '{}')?.id : null;

  // Check auth status
  useEffect(() => {
    const token = localStorage.getItem('agenthub_token');
    setIsLoggedIn(!!token);
  }, []);

  // Fetch agent detail
  const fetchAgent = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    const response = await agentApi.get(id);

    if (response.success && response.data) {
      setAgent(response.data as AgentDetail);
      if (response.data.screenshots && response.data.screenshots[0]) {
        setSelectedScreenshot(response.data.screenshots[0].url);
      }
      // Set default selected version to latest
      if (response.data.versions && response.data.versions[0]) {
        setSelectedVersion(response.data.versions[0].version);
      }
    } else {
      setError(response.error || 'Failed to load agent');
    }

    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  // Fetch related agents when agent is loaded
  useEffect(() => {
    if (agent?.id) {
      const fetchRelated = async () => {
        setIsLoadingRelated(true);
        try {
          const res = await agentApi.getRelated(agent.id, 6);
          if (res.success && res.data) {
            setRelatedAgents(res.data);
          }
        } catch (err) {
          console.error('Failed to fetch related agents:', err);
        } finally {
          setIsLoadingRelated(false);
        }
      };
      fetchRelated();
    }
  }, [agent?.id]);

  // Fetch comments
  const fetchComments = useCallback(async (page = 1, append = false) => {
    if (!id) return;

    if (append) {
      setIsLoadingMoreComments(true);
    } else {
      setIsLoadingComments(true);
    }

    try {
      const response = await agentCommentApi.getByAgent(id, {
        limit: 10,
        offset: (page - 1) * 10,
        sortBy: commentSortBy,
      });

      if (response.success && response.data) {
        const comments = response.data.comments ?? [];
        const total = response.data.total ?? 0;
        if (append) {
          setComments((prev) => [...prev, ...comments]);
        } else {
          setComments(comments);
        }
        setCommentsTotal(total);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setIsLoadingComments(false);
      setIsLoadingMoreComments(false);
    }
  }, [id, commentSortBy]);

  useEffect(() => {
    if (id) {
      fetchComments(1, false);
    }
  }, [id, commentSortBy]);

  // Load more comments
  const loadMoreComments = () => {
    const nextPage = commentPage + 1;
    setCommentPage(nextPage);
    fetchComments(nextPage, true);
  };

  // Submit new comment
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !id) return;

    setIsSubmittingComment(true);
    try {
      const response = await agentCommentApi.create(id, {
        content: newComment,
      });

      if (response.success) {
        setNewComment('');
        toast.success('评论已发表');
        fetchComments(1, false); // Refresh comments
      } else {
        toast.error(response.error || 'Failed to post comment');
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
      toast.error('Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Like a comment
  const handleLikeComment = async (commentId: string) => {
    if (!isLoggedIn) {
      window.location.href = '/login';
      return;
    }

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    try {
      if (comment.isLiked) {
        await agentCommentApi.unlike(commentId);
        setComments(prev => prev.map(c => 
          c.id === commentId 
            ? { ...c, isLiked: false, likeCount: (c.likeCount || 0) - 1 }
            : c
        ));
      } else {
        await agentCommentApi.like(commentId);
        setComments(prev => prev.map(c => 
          c.id === commentId 
            ? { ...c, isLiked: true, likeCount: (c.likeCount || 0) + 1 }
            : c
        ));
      }
    } catch (err) {
      console.error('Failed to like comment:', err);
    }
  };

  // Submit reply
  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim() || !id) return;

    setIsSubmittingReply(true);
    try {
      const response = await agentCommentApi.create(id, {
        parentId,
        content: replyContent,
      });

      if (response.success) {
        setReplyContent('');
        setReplyToComment(null);
        toast.success('回复已发表');
        fetchComments(1, false);
      } else {
        toast.error(response.error || 'Failed to post reply');
      }
    } catch (err) {
      console.error('Failed to post reply:', err);
      toast.error('Failed to post reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('确定删除这条评论吗？')) return;

    try {
      const response = await agentCommentApi.delete(commentId);
      if (response.success) {
        toast.success('评论已删除');
        fetchComments(1, false);
      } else {
        toast.error(response.error || 'Failed to delete comment');
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  // Handle favorite toggle
  const handleFavorite = async () => {
    if (!isLoggedIn) {
      // Redirect to login
      window.location.href = '/login';
      return;
    }

    setIsFavoriteLoading(true);

    if (agent?.isFavorited) {
      const response = await agentApi.unfavorite(id);
      if (response.success) {
        setAgent((prev) =>
          prev
            ? {
                ...prev,
                isFavorited: false,
                favoriteCount: (prev.favoriteCount || 0) - 1,
              }
            : null
        );
      }
    } else {
      const response = await agentApi.favorite(id);
      if (response.success) {
        setAgent((prev) =>
          prev
            ? {
                ...prev,
                isFavorited: true,
                favoriteCount: (prev.favoriteCount || 0) + 1,
              }
            : null
        );
      }
    }

    setIsFavoriteLoading(false);
  };

  // Handle rating submit
  const handleRating = async () => {
    if (!isLoggedIn) {
      window.location.href = '/login';
      return;
    }

    setIsRatingLoading(true);

    const response = await agentApi.rate(id, {
      overall: ratingValue,
      comment: ratingComment || undefined,
    });

    if (response.success) {
      setRatingSuccess(true);
      setShowRatingForm(false);
      // Refresh agent to get updated rating
      await fetchAgent();
      setTimeout(() => setRatingSuccess(false), 3000);
    }

    setIsRatingLoading(false);
  };

  // Share functionality
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: agent?.name,
          text: agent?.tagline,
          url: window.location.href,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // Could show toast here
    }
  };

  // Lightbox functions
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const prevScreenshot = () => {
    if (agent?.screenshots) {
      const len = agent.screenshots.length;
      setLightboxIndex((prev) => 
        prev === 0 ? len - 1 : prev - 1
      );
    }
  };

  const nextScreenshot = () => {
    if (agent?.screenshots) {
      const len = agent.screenshots.length;
      setLightboxIndex((prev) => 
        prev === len - 1 ? 0 : prev + 1
      );
    }
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevScreenshot();
      if (e.key === 'ArrowRight') nextScreenshot();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">加载失败</h2>
        <p className="text-muted-foreground mb-4">{error || 'Agent not found'}</p>
        <Link href="/agents">
          <Button variant="outline">返回 Agent 列表</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60" />
            <span className="text-xl font-bold">AgentHub</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/agents" className="text-sm font-medium text-primary">
              发现 Agent
            </Link>
            <Link href="/discuss" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              讨论区
            </Link>
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              文档
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link href="/profile">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={agent.owner?.avatar} />
                  <AvatarFallback>
                    {agent.owner?.username?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="border-b">
        <div className="container py-3">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/agents" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              发现 Agent
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            {agent.category && (
              <>
                <Link
                  href={`/agents?categoryId=${agent.category.id}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {agent.category.name}
                </Link>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </>
            )}
            <span className="text-foreground font-medium truncate max-w-[200px]">{agent.name}</span>
          </nav>
        </div>
      </div>

      <main className="container py-8">
        {/* Agent Header */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: Main Info */}
          <div className="lg:col-span-2">
            {/* Hero Section */}
            <div className="flex flex-col sm:flex-row gap-6 mb-8">
              {/* Logo */}
              <div className="flex-shrink-0">
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  {agent.logo ? (
                    <Image
                      src={agent.logo}
                      alt={agent.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 96px, 128px"
                      priority
                    />
                  ) : (
                    <span className="text-4xl sm:text-5xl font-bold text-primary">
                      {agent.name.charAt(0)}
                    </span>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{agent.name}</h1>
                    {agent.tagline && (
                      <p className="mt-1 text-lg text-muted-foreground">{agent.tagline}</p>
                    )}
                  </div>

                  {/* Featured Badge */}
                  {agent.isFeatured && (
                    <Badge variant="default" className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 shrink-0">
                      <Star className="h-3 w-3 mr-1 fill-yellow-500" />
                      精选
                    </Badge>
                  )}
                </div>

                {/* Author */}
                {agent.owner && (
                  <Link
                    href={`/users/${agent.owner.username}`}
                    className="flex items-center gap-2 mt-3 hover:opacity-80 transition-opacity"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={agent.owner.avatar} />
                      <AvatarFallback className="text-xs">
                        {agent.owner.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{agent.owner.displayName || agent.owner.username}</span>
                  </Link>
                )}

                {/* Tags */}
                {agent.tags && agent.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {agent.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-4 mb-8 pb-6 border-b">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold">{agent.avgRating?.toFixed(1) || 'N/A'}</span>
                <span className="text-sm text-muted-foreground">
                  ({formatNumber(agent.ratingCount || 0)} ratings)
                </span>
              </div>

              <div className="w-px h-6 bg-border hidden sm:block" />

              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <span>{formatNumber(agent.viewCount || 0)} views</span>
              </div>

              <div className="w-px h-6 bg-border hidden sm:block" />

              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-muted-foreground" />
                <span>{formatNumber(agent.favoriteCount || 0)} favorites</span>
              </div>

              <div className="w-px h-6 bg-border hidden sm:block" />

              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
                <span>{formatNumber(agent.commentCount || 0)} comments</span>
              </div>

              <div className="w-px h-6 bg-border hidden sm:block" />

              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span>{formatRelativeTime(agent.createdAt)}</span>
              </div>
            </div>

            {/* Description */}
            {agent.description && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-3">关于</h2>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{agent.description}</p>
                </div>
              </div>
            )}

            {/* Screenshots */}
            {agent.screenshots && agent.screenshots.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-3">截图</h2>
                <div className="space-y-4">
                  {/* Main screenshot - clickable */}
                  <div 
                    className="aspect-video rounded-lg overflow-hidden bg-muted cursor-zoom-in group relative"
                    onClick={() => openLightbox(0)}
                  >
                    {selectedScreenshot && (
                      <>
                        <Image
                          src={selectedScreenshot}
                          alt="Screenshot"
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, 800px"
                          priority
                        />
                        {/* Zoom overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                        </div>
                      </>
                    )}
                  </div>
                  {/* Thumbnail strip */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {agent.screenshots.map((screenshot, index) => (
                      <button
                        key={screenshot.id}
                        onClick={() => {
                          setSelectedScreenshot(screenshot.url);
                          openLightbox(index);
                        }}
                        className={cn(
                          'flex-shrink-0 w-24 h-16 rounded-md overflow-hidden border-2 transition-all',
                          selectedScreenshot === screenshot.url
                            ? 'border-primary'
                            : 'border-transparent hover:border-muted-foreground/30'
                        )}
                      >
                        <Image
                          src={screenshot.url}
                          alt={screenshot.caption || 'Screenshot'}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Version History with Tab Switching */}
            {agent.versions && agent.versions.length > 1 && (
              <div className="mb-8">
                <Tabs value={versionTab} onValueChange={(v) => setVersionTab(v as 'detail' | 'compare')}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">版本历史</h2>
                    <TabsList>
                      <TabsTrigger value="detail">版本详情</TabsTrigger>
                      <TabsTrigger value="compare">
                        <GitCompare className="h-3.5 w-3.5 mr-1" />
                        版本对比
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Version Detail Tab */}
                  <TabsContent value="detail" className="mt-4">
                    <div className="space-y-3">
                      {agent.versions.map((version, index) => (
                        <Card key={version.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">v{version.version}</span>
                                  {index === 0 && (
                                    <Badge variant="outline" className="text-xs">最新</Badge>
                                  )}
                                </div>
                                {version.changelog && (
                                  <p className="text-sm text-muted-foreground mt-1">{version.changelog}</p>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatRelativeTime(version.createdAt)}
                              </div>
                            </div>
                            {version.downloadUrl && (
                              <Button variant="outline" size="sm" className="mt-3">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                下载
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Version Compare Tab */}
                  <TabsContent value="compare" className="mt-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr>
                                <th className="text-left p-3 border-b font-semibold w-1/4">功能</th>
                                {agent.versions.map((version) => (
                                  <th
                                    key={version.id}
                                    className="text-center p-3 border-b font-semibold bg-primary/5"
                                  >
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-lg">v{version.version}</span>
                                      {agent.versions?.[0]?.id === version.id && (
                                        <Badge variant="outline" className="text-xs">最新</Badge>
                                      )}
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {/* Collect all unique features */}
                              {(() => {
                                const allFeatures: Record<string, Record<string, boolean>> = {};

                                agent.versions.forEach((version) => {
                                  allFeatures[version.id] ??= {};
                                  if (version.features) {
                                    try {
                                      const features = JSON.parse(version.features);
                                      features.forEach((feature: string) => {
                                        allFeatures[version.id]![feature] = true;
                                      });
                                    } catch {
                                      allFeatures[version.id]![version.features] = true;
                                    }
                                  }
                                });

                                const featureSet = new Set<string>();
                                agent.versions.forEach((version) => {
                                  if (version.features) {
                                    try {
                                      const features = JSON.parse(version.features);
                                      features.forEach((f: string) => featureSet.add(f));
                                    } catch {
                                      featureSet.add(version.features);
                                    }
                                  }
                                });

                                const features = Array.from(featureSet);

                                if (features.length === 0) {
                                  return (
                                    <>
                                      <tr>
                                        <td className="p-3 border-b font-medium">版本号</td>
                                        {agent.versions.map((version) => (
                                          <td key={version.id} className="text-center p-3 border-b">
                                            v{version.version}
                                          </td>
                                        ))}
                                      </tr>
                                      <tr>
                                        <td className="p-3 border-b font-medium">发布日期</td>
                                        {agent.versions.map((version) => (
                                          <td key={version.id} className="text-center p-3 border-b text-muted-foreground">
                                            {formatRelativeTime(version.createdAt)}
                                          </td>
                                        ))}
                                      </tr>
                                      <tr>
                                        <td className="p-3 border-b font-medium">更新日志</td>
                                        {agent.versions.map((version) => (
                                          <td key={version.id} className="text-center p-3 border-b">
                                            <span className="text-sm text-muted-foreground">
                                              {version.changelog || '暂无'}
                                            </span>
                                          </td>
                                        ))}
                                      </tr>
                                      <tr>
                                        <td className="p-3 font-medium">下载</td>
                                        {agent.versions.map((version) => (
                                          <td key={version.id} className="text-center p-3">
                                            {version.downloadUrl ? (
                                              <a
                                                href={version.downloadUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                              >
                                                <ExternalLink className="h-3 w-3" />
                                                下载
                                              </a>
                                            ) : (
                                              <span className="text-muted-foreground">-</span>
                                            )}
                                          </td>
                                        ))}
                                      </tr>
                                    </>
                                  );
                                }

                                return features.map((feature) => (
                                  <tr key={feature}>
                                    <td className="p-3 border-b font-medium">{feature}</td>
                                    {(agent.versions ?? []).map((version) => {
                                      const hasFeature = allFeatures[version.id]?.[feature];
                                      return (
                                        <td key={version.id} className="text-center p-3 border-b">
                                          {hasFeature ? (
                                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                                          ) : (
                                            <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
                        </div>

                        {/* Version switch buttons */}
                        <div className="mt-6 pt-4 border-t">
                          <h3 className="text-sm font-medium text-muted-foreground mb-3">
                            切换到指定版本
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {agent.versions.map((version) => (
                              <Button
                                key={version.id}
                                variant={selectedVersion === version.version ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => {
                                  setSelectedVersion(version.version);
                                }}
                              >
                                v{version.version}
                                {agent.versions?.[0]?.id === version.id && ' (最新)'}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-6">
            {/* Action Buttons */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant={agent.isFavorited ? 'default' : 'outline'}
                    onClick={handleFavorite}
                    disabled={isFavoriteLoading}
                  >
                    {isFavoriteLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Heart
                        className={cn(
                          'h-4 w-4 mr-2',
                          agent.isFavorited && 'fill-current'
                        )}
                      />
                    )}
                    {agent.isFavorited ? '已收藏' : '收藏'}
                  </Button>
                  <Button variant="outline" onClick={handleShare} aria-label="分享">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* External Links */}
                <div className="grid grid-cols-1 gap-2 pt-2">
                  {agent.demoUrl && (
                    <a
                      href={agent.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      体验 Demo
                    </a>
                  )}
                  {agent.githubUrl && (
                    <a
                      href={agent.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent transition-colors"
                    >
                      <Github className="h-4 w-4" />
                      GitHub
                    </a>
                  )}
                  {agent.docsUrl && (
                    <a
                      href={agent.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent transition-colors"
                    >
                      <BookOpen className="h-4 w-4" />
                      文档
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Rating Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  评分
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ratingSuccess ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 py-4">
                    <CheckCircle className="h-5 w-5" />
                    <span>评分成功！感谢您的反馈</span>
                  </div>
                ) : agent.userRating ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">您的评分</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              'h-4 w-4',
                              star <= agent.userRating!.overall
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-muted'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    {agent.userRating.comment && (
                      <p className="text-sm bg-muted p-3 rounded-md">{agent.userRating.comment}</p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowRatingForm(!showRatingForm)}
                    >
                      {showRatingForm ? '取消' : '修改评分'}
                    </Button>
                  </div>
                ) : showRatingForm ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">评分</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRatingValue(star)}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={cn(
                                'h-6 w-6 transition-colors',
                                star <= ratingValue
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-muted hover:text-yellow-400'
                              )}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">评论（可选）</label>
                      <Input
                        placeholder="分享您的使用体验..."
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleRating}
                      disabled={isRatingLoading}
                    >
                      {isRatingLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      提交评分
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      if (!isLoggedIn) {
                        window.location.href = '/login';
                      } else {
                        setShowRatingForm(true);
                      }
                    }}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    评价此 Agent
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Developer Card */}
            {agent.owner && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    开发者
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link
                    href={`/users/${agent.owner.username}`}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={agent.owner.avatar} />
                      <AvatarFallback>
                        {agent.owner.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {agent.owner.displayName || agent.owner.username}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        @{agent.owner.username}
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Version Selector */}
            {agent.versions && agent.versions.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    版本历史
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Version Dropdown */}
                  <div className="relative">
                    <select
                      value={selectedVersion || ''}
                      onChange={(e) => setSelectedVersion(e.target.value)}
                      className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm"
                    >
                      {agent.versions.map((v) => (
                        <option key={v.id} value={v.version}>
                          v{v.version}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  
                  {/* Selected Version Changelog */}
                  {selectedVersion && (
                    <>
                      {(() => {
                        const ver = agent.versions.find((v) => v.version === selectedVersion);
                        return ver ? (
                          <div className="text-xs text-muted-foreground">
                            <p className="font-medium text-foreground mb-1">更新日志:</p>
                            <p className="leading-relaxed">{ver.changelog || '暂无更新日志'}</p>
                            <p className="mt-2 text-muted-foreground/70">
                              {formatRelativeTime(ver.createdAt)}
                            </p>
                          </div>
                        ) : null;
                      })()}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Category */}
            {agent.category && (
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-2">分类</div>
                  <Link
                    href={`/agents?categoryId=${agent.category.id}`}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
                  >
                    {agent.category.name}
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Agent Comments Section */}
        <div className="mt-8 pt-8 border-t">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
            <MessageCircle className="h-5 w-5" />
            用户讨论 ({comments.length > 0 ? commentsTotal : 0})
          </h2>
          
          {/* Comment Form */}
          {isLoggedIn ? (
            <Card className="mb-6">
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <Textarea
                    placeholder="分享您的使用体验、问题或建议..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      支持 Markdown 格式
                    </span>
                    <Button 
                      onClick={handleSubmitComment} 
                      disabled={!newComment.trim() || isSubmittingComment}
                    >
                      {isSubmittingComment ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      发表
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-6">
              <CardContent className="py-6 text-center">
                <p className="text-muted-foreground mb-3">
                  登录后可参与讨论
                </p>
                <Button variant="outline" onClick={() => window.location.href = '/login'}>
                  登录
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Sort Options */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={commentSortBy === 'newest' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCommentSortBy('newest')}
            >
              最新
            </Button>
            <Button
              variant={commentSortBy === 'popular' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCommentSortBy('popular')}
            >
              最热
            </Button>
          </div>

          {/* Comments List */}
          {isLoadingComments ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-4">
                    <div className="flex gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-muted rounded w-1/4" />
                        <div className="h-16 bg-muted rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageCircle className="h-12 w-12 text-muted mx-auto mb-4" />
                <p className="text-muted-foreground">暂无讨论，快来发表第一条评论吧！</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {comments.map((comment: AgentComment) => (
                <Card key={comment.id}>
                  <CardContent className="pt-4">
                    <div className="flex gap-3">
                      <Link href={`/users/${comment.author?.username}`}>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={comment.author?.avatar} />
                          <AvatarFallback>
                            {comment.author?.username?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/users/${comment.author?.username}`}
                            className="font-medium hover:underline"
                          >
                            {comment.author?.displayName || comment.author?.username}
                          </Link>
                          {comment.author?.level && (
                            <Badge variant="outline" className="text-xs">
                              L{comment.author.level}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {comment.content}
                        </div>
                        {comment.screenshotUrl && (
                          <div className="mt-2">
                            <Image
                              src={comment.screenshotUrl}
                              alt="Comment screenshot"
                              width={300}
                              height={200}
                              className="rounded-md object-cover max-h-40"
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-4 pt-2">
                          <button
                            onClick={() => handleLikeComment(comment.id)}
                            disabled={!isLoggedIn}
                            className={cn(
                              "flex items-center gap-1 text-sm transition-colors",
                              comment.isLiked ? "text-primary" : "text-muted-foreground hover:text-primary",
                              !isLoggedIn && "cursor-not-allowed opacity-50"
                            )}
                          >
                            <ThumbsUp className="h-4 w-4" />
                            {comment.likeCount || 0}
                          </button>
                          {isLoggedIn && (
                            <button
                              onClick={() => setReplyToComment(comment.id)}
                              className="text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                              回复
                            </button>
                          )}
                          {comment.authorId === userId && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                            >
                              删除
                            </button>
                          )}
                        </div>

                        {/* Reply Form */}
                        {replyToComment === comment.id && (
                          <div className="mt-3 pl-4 border-l-2">
                            <Textarea
                              placeholder="写下你的回复..."
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              className="min-h-[80px] mb-2"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSubmitReply(comment.id)}
                                disabled={!replyContent.trim() || isSubmittingReply}
                              >
                                {isSubmittingReply ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : null}
                                发送
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setReplyToComment(null);
                                  setReplyContent('');
                                }}
                              >
                                取消
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Nested Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-4 space-y-3 pl-4 border-l-2">
                            {comment.replies.map((reply: AgentComment) => (
                              <div key={reply.id} className="flex gap-2">
                                <Link href={`/users/${reply.author?.username}`}>
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={reply.author?.avatar} />
                                    <AvatarFallback className="text-xs">
                                      {reply.author?.username?.charAt(0).toUpperCase() || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                </Link>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Link 
                                      href={`/users/${reply.author?.username}`}
                                      className="font-medium text-sm hover:underline"
                                    >
                                      {reply.author?.displayName || reply.author?.username}
                                    </Link>
                                    <span className="text-xs text-muted-foreground">
                                      {formatRelativeTime(reply.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-sm mt-1">{reply.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Load More */}
              {commentsTotal > comments.length && (
                <div className="text-center mt-4">
                  <Button
                    variant="outline"
                    onClick={loadMoreComments}
                    disabled={isLoadingMoreComments}
                  >
                    {isLoadingMoreComments ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    加载更多
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Related Agents Section */}
        {(relatedAgents.length > 0 || isLoadingRelated) && (
          <div className="mt-12 pt-8 border-t">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                相关 Agent 推荐
              </h2>
              <Link href="/agents">
                <Button variant="ghost" size="sm" className="gap-1">
                  查看全部
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {isLoadingRelated ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="h-32 bg-muted" />
                    <CardContent className="pt-4">
                      <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedAgents.slice(0, 6).map((relatedAgent) => (
                  <motion.div
                    key={relatedAgent.id}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link href={`/agents/${relatedAgent.id}`}>
                      <Card className="h-full transition-all duration-300 hover:shadow-xl hover:border-primary/50 group">
                        <CardHeader className="flex flex-row items-start gap-4 pb-2">
                          <div className="h-14 w-14 rounded-xl overflow-hidden bg-muted flex-shrink-0 relative">
                            {relatedAgent.logo ? (
                              <Image
                                src={relatedAgent.logo}
                                alt={relatedAgent.name}
                                fill
                                className="object-cover"
                                sizes="56px"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                                <Bot className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                              {relatedAgent.name}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {relatedAgent.tagline || '暂无描述'}
                            </p>
                          </div>
                        </CardHeader>
                        <CardFooter className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              {relatedAgent.avgRating?.toFixed(1) || '0.0'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              {relatedAgent.viewCount || 0}
                            </span>
                          </div>
                        </CardFooter>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Lightbox Modal */}
      {lightboxOpen && agent?.screenshots && agent.screenshots.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
          >
            <X className="h-6 w-6 text-white" />
          </button>

          {/* Navigation arrows */}
          {agent.screenshots.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevScreenshot();
                }}
                className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-6 w-6 text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextScreenshot();
                }}
                className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-6 w-6 text-white" />
              </button>
            </>
          )}

          {/* Main image */}
          <motion.div
            key={lightboxIndex}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {agent.screenshots[lightboxIndex] && (
              <>
                <Image
                  src={agent.screenshots[lightboxIndex].url}
                  alt={agent.screenshots[lightboxIndex].caption || `Screenshot ${lightboxIndex + 1}`}
                  width={1200}
                  height={800}
                  className="max-w-full max-h-[90vh] object-contain rounded-lg"
                  priority
                />
                {/* Caption */}
                {agent.screenshots[lightboxIndex].caption && (
                  <p className="text-center text-white/80 mt-4 text-sm">
                    {agent.screenshots[lightboxIndex].caption}
                  </p>
                )}
              </>
            )}
            {/* Counter */}
            <p className="text-center text-white/60 mt-2 text-sm">
              {lightboxIndex + 1} / {agent.screenshots.length}
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-gradient-to-br from-primary to-primary/60" />
              <span className="font-semibold">AgentHub</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 AgentHub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
