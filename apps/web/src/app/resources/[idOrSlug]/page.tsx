'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@agenthub/ui/badge';
import { Button } from '@agenthub/ui/button';
import { Skeleton } from '@agenthub/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { resourceApi, Resource } from '@/lib/api';
import { formatRelativeTime, formatNumber } from '@/lib/utils';
import { ExternalLink, Heart, Share2, ChevronLeft, Eye, Wrench, Database, Code, GraduationCap, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const typeIcons: Record<string, React.ReactNode> = {
  tool: <Wrench className="h-5 w-5" />,
  dataset: <Database className="h-5 w-5" />,
  api: <Code className="h-5 w-5" />,
  learning: <GraduationCap className="h-5 w-5" />,
};

const typeLabels: Record<string, string> = {
  tool: '工具',
  dataset: '数据集',
  api: 'API',
  learning: '学习资源',
};

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [resource, setResource] = useState<Resource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiking, setIsLiking] = useState(false);

  const idOrSlug = params.idOrSlug as string;

  const fetchResource = useCallback(async () => {
    setIsLoading(true);
    const response = await resourceApi.get(idOrSlug);
    if (response.success && response.data) {
      setResource(response.data);
    } else {
      toast.error('资源不存在');
      router.push('/resources');
    }
    setIsLoading(false);
  }, [idOrSlug, router]);

  useEffect(() => {
    fetchResource();
  }, [fetchResource]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error('请先登录');
      router.push('/login');
      return;
    }
    if (!resource || isLiking) return;

    setIsLiking(true);
    const response = await resourceApi.like(resource.id);
    if (response.success) {
      setResource((prev) => prev ? { ...prev, isLiked: !prev.isLiked, likeCount: prev.isLiked ? prev.likeCount - 1 : prev.likeCount + 1 } : null);
    }
    setIsLiking(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container max-w-4xl py-8">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-12 w-3/4 mb-2" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  if (!resource) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-4xl py-8">
        {/* Back Link */}
        <Link
          href="/resources"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          返回资源列表
        </Link>

        {/* Resource Header */}
        <div className="mb-8">
          {/* Type & Category */}
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1.5">
              {typeIcons[resource.type]}
              {typeLabels[resource.type]}
            </Badge>
            {resource.isFree && <Badge variant="secondary">免费</Badge>}
            {resource.category && (
              <Badge variant="secondary">{resource.category.name}</Badge>
            )}
          </div>

          {/* Title */}
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            {resource.name}
          </h1>

          {/* Description */}
          <p className="mb-6 text-lg text-muted-foreground">
            {resource.description}
          </p>

          {/* Tags */}
          {resource.tags && resource.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {resource.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-4">
            {resource.url && (
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <Button className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  访问资源
                </Button>
              </a>
            )}

            <Button
              variant={resource.isLiked ? 'default' : 'outline'}
              onClick={handleLike}
              disabled={isLiking}
              className="gap-2"
            >
              {isLiking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className={`h-4 w-4 ${resource.isLiked ? 'fill-current' : ''}`} />
              )}
              {resource.likeCount} 赞
            </Button>

            <Button variant="outline" className="gap-2">
              <Share2 className="h-4 w-4" />
              分享
            </Button>
          </div>
        </div>

        {/* Cover Image */}
        {resource.coverImage && (
          <div className="mb-8 relative h-80 w-full overflow-hidden rounded-lg">
            <img
              src={resource.coverImage}
              alt={resource.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground border-t pt-6">
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {formatNumber(resource.viewCount)} 次浏览
          </span>
          <span>分享者：{resource.submitter?.displayName || resource.submitter?.username}</span>
          <span>{formatRelativeTime(resource.createdAt)}</span>
        </div>

        {/* Submit New */}
        <div className="mt-12 p-6 bg-muted rounded-lg">
          <h3 className="text-lg font-semibold mb-2">有好的资源分享？</h3>
          <p className="text-muted-foreground mb-4">
            发现有趣的 AI Agent 开发工具、数据集或 API？分享给大家吧！
          </p>
          <Link href="/resources/new">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              分享资源
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
