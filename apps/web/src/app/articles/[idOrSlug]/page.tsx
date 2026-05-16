'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown, { Components } from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { Badge } from '@agenthub/ui/badge';
import { Button } from '@agenthub/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@agenthub/ui/avatar';
import { Skeleton } from '@agenthub/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { articleApi, Article } from '@/lib/api';
import { formatRelativeTime, formatNumber } from '@/lib/utils';
import { Eye, Heart, Share2, ChevronLeft, Calendar, Clock, Edit, Trash2, Loader2, List } from 'lucide-react';
import { toast } from 'sonner';

/** Generate a slug id from heading text (matches rehype-slug behavior) */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiking, setIsLiking] = useState(false);
  const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>([]);

  const idOrSlug = params.idOrSlug as string;

  const fetchArticle = useCallback(async () => {
    setIsLoading(true);
    const response = await articleApi.get(idOrSlug);
    if (response.success && response.data) {
      setArticle(response.data);
      extractToc(response.data.content);
    } else {
      toast.error('文章不存在');
      router.push('/articles');
    }
    setIsLoading(false);
  }, [idOrSlug, router]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  // Extract headings for table of contents
  const extractToc = (content: string) => {
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const headings: { id: string; text: string; level: number }[] = [];
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1]!.length;
      const text = match[2] ?? '';
      const id = slugify(text);
      headings.push({ id, text, level });
    }
    setToc(headings);
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error('请先登录');
      router.push('/login');
      return;
    }
    if (!article || isLiking) return;

    setIsLiking(true);
    const response = await articleApi.like(article.id);
    if (response.success) {
      setArticle((prev) => prev ? { ...prev, isLiked: !prev.isLiked, likeCount: prev.isLiked ? prev.likeCount - 1 : prev.likeCount + 1 } : null);
    }
    setIsLiking(false);
  };

  const handleDelete = async () => {
    if (!article) return;
    if (!confirm('确定要删除这篇文章吗？此操作不可恢复。')) return;

    const response = await articleApi.delete(article.id);
    if (response.success) {
      toast.success('文章已删除');
      router.push('/articles');
    } else {
      toast.error('删除失败');
    }
  };

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  // Custom heading components that add IDs for TOC linking
  const headingComponents: Components = {
    h1: ({ children }) => {
      const text = String(children);
      const id = slugify(text);
      return <h1 id={id} className="scroll-mt-24">{children}</h1>;
    },
    h2: ({ children }) => {
      const text = String(children);
      const id = slugify(text);
      return <h2 id={id} className="scroll-mt-24">{children}</h2>;
    },
    h3: ({ children }) => {
      const text = String(children);
      const id = slugify(text);
      return <h3 id={id} className="scroll-mt-24">{children}</h3>;
    },
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

  if (!article) {
    return null;
  }

  const isAuthor = user?.id === article.authorId;
  const showToc = toc.length > 1; // Need at least 2 headings to justify showing TOC

  return (
    <div className="min-h-screen bg-background">
      <main className={`container py-8 ${showToc ? 'lg:grid lg:grid-cols-[1fr_240px] lg:gap-12' : 'max-w-4xl'}`}>
        {/* Main Article Content */}
        <div className={showToc ? 'min-w-0' : 'max-w-4xl'}>
          {/* Back Link */}
          <Link
            href="/articles"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            返回文章列表
          </Link>

          {/* Article Header */}
          <article>
            {/* Category */}
            {article.category && (
              <Link href={`/articles?category=${article.category.id}`}>
                <Badge variant="secondary" className="mb-4">
                  {article.category.name}
                </Badge>
              </Link>
            )}

            {/* Title */}
            <h1 className="mb-4 text-4xl font-bold tracking-tight">
              {article.title}
            </h1>

            {/* Meta */}
            <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <Link
                href={`/users/${article.authorId}`}
                className="flex items-center gap-2 hover:text-foreground"
              >
                {article.author?.avatar ? (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={article.author.avatar} />
                    <AvatarFallback>
                      {article.author.displayName?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                )}
                <span className="font-medium text-foreground">
                  {article.author?.displayName || article.author?.username}
                </span>
              </Link>

              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatRelativeTime(article.publishedAt || article.createdAt)}
              </span>

              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {formatNumber(article.viewCount)} 阅读
              </span>

              {article.readTimeMinutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {article.readTimeMinutes} 分钟阅读
                </span>
              )}
            </div>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Actions */}
            {isAuthor && (
              <div className="mb-6 flex gap-2">
                <Link href={`/articles/${article.slug}/edit`}>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Edit className="h-4 w-4" />
                    编辑
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </Button>
              </div>
            )}

            {/* Cover Image */}
            {article.coverImage && (
              <div className="mb-8 relative h-80 w-full overflow-hidden rounded-lg">
                <img
                  src={article.coverImage}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Mobile TOC - Collapsible at top (before content) */}
            {showToc && (
              <details className="lg:hidden mb-8 rounded-lg border bg-card">
                <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground select-none">
                  <List className="h-4 w-4" />
                  目录 ({toc.length} 项)
                </summary>
                <nav className="border-t px-4 py-3 space-y-1">
                  {toc.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToHeading(item.id)}
                      className="block w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors py-0.5"
                      style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                    >
                      <span className="line-clamp-2">{item.text}</span>
                    </button>
                  ))}
                </nav>
              </details>
            )}

            {/* Content */}
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <ReactMarkdown
                components={headingComponents}
                rehypePlugins={[rehypeSanitize]}
                remarkPlugins={[remarkGfm]}
              >
                {article.content}
              </ReactMarkdown>
            </div>

            {/* Like & Share */}
            <div className="mt-8 flex items-center gap-4 border-t pt-6">
              <Button
                variant={article.isLiked ? 'default' : 'outline'}
                onClick={handleLike}
                disabled={isLiking}
                className="gap-2"
              >
                {isLiking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Heart className={`h-4 w-4 ${article.isLiked ? 'fill-current' : ''}`} />
                )}
                {article.likeCount} 赞
              </Button>

              <Button variant="outline" className="gap-2">
                <Share2 className="h-4 w-4" />
                分享
              </Button>
            </div>
          </article>
        </div>

        {/* Table of Contents - Desktop Sidebar */}
        {showToc && (
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <List className="h-4 w-4" />
                目录
              </div>
              <nav className="space-y-1">
                {toc.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToHeading(item.id)}
                    className="block w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors py-0.5"
                    style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                  >
                    <span className="line-clamp-2">{item.text}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
