'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@agenthub/ui/avatar';
import { Badge } from '@agenthub/ui/badge';
import { Button } from '@agenthub/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@agenthub/ui/card';
import { Input } from '@agenthub/ui/input';
import { agentApi, Agent, AgentCategory, User, reportApi } from '@/lib/api';
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
  ChevronRight,
  ZoomIn,
  Flag,
} from 'lucide-react';
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

  // Report state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

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
      if (response.data.screenshots?.length) {
        setSelectedScreenshot(response.data.screenshots[0].url);
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

  // Report functionality
  const handleReport = async () => {
    if (!isLoggedIn) {
      window.location.href = '/login';
      return;
    }

    if (!reportReason.trim() || reportReason.length < 10) {
      toast.error('请填写至少 10 个字符的举报原因');
      return;
    }

    setIsReporting(true);

    const response = await reportApi.create({
      targetType: 'agent',
      targetId: id,
      reason: reportReason,
    });

    if (response.success) {
      setReportSuccess(true);
      setShowReportModal(false);
      setReportReason('');
      toast.success('举报已提交，感谢您的反馈');
    } else {
      toast.error(response.error || '举报提交失败');
    }

    setIsReporting(false);
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
      setLightboxIndex((prev) => 
        prev === 0 ? agent.screenshots.length - 1 : prev - 1
      );
    }
  };

  const nextScreenshot = () => {
    if (agent?.screenshots) {
      setLightboxIndex((prev) => 
        prev === agent.screenshots.length - 1 ? 0 : prev + 1
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
                    <img
                      src={agent.logo}
                      alt={agent.name}
                      className="w-full h-full object-cover"
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
                        <img
                          src={selectedScreenshot}
                          alt="Screenshot"
                          className="w-full h-full object-contain"
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
                        <img
                          src={screenshot.url}
                          alt={screenshot.caption || 'Screenshot'}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Version History */}
            {agent.versions && agent.versions.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-3">版本历史</h2>
                <div className="space-y-3">
                  {agent.versions.map((version) => (
                    <Card key={version.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">v{version.version}</span>
                              <Badge variant="outline" className="text-xs">最新</Badge>
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
                  <Button variant="outline" onClick={handleShare}>
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
                          <div className="h-14 w-14 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                            {relatedAgent.logo ? (
                              <img
                                src={relatedAgent.logo}
                                alt={relatedAgent.name}
                                className="h-full w-full object-cover"
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
            <img
              src={agent.screenshots[lightboxIndex].url}
              alt={agent.screenshots[lightboxIndex].caption || `Screenshot ${lightboxIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            {/* Caption */}
            {agent.screenshots[lightboxIndex].caption && (
              <p className="text-center text-white/80 mt-4 text-sm">
                {agent.screenshots[lightboxIndex].caption}
              </p>
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
