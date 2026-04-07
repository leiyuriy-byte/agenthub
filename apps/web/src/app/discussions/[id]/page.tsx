'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@agenthub/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@agenthub/ui/card';
import { Badge } from '@agenthub/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@agenthub/ui/avatar';
import { Textarea } from '@agenthub/ui/textarea';
import { postApi, Post, channelApi, Channel, commentApi, Comment, reportApi } from '@/lib/api';
import { formatRelativeTime, formatNumber, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Clock,
  MessageSquare,
  Share2,
  Bookmark,
  Loader2,
  ChevronRight,
  Edit,
  Trash2,
  Pin,
  Star,
  AlertCircle,
  X as XIcon,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Flag,
  CheckCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import 'highlight.js/styles/github-dark.css';
import { CommentList, CommentForm } from '@/components/comment/comment-list';
import { PollComponent } from '@/components/poll/poll-component';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user } = useAuthStore();
  const [post, setPost] = useState<Post | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [similarPosts, setSimilarPosts] = useState<Post[]>([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);

  // Report state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Fetch post
  const fetchPost = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    const response = await postApi.get(id);

    if (response.success && response.data) {
      setPost(response.data as Post);
    } else {
      setError(response.error || '帖子未找到');
    }

    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  // Fetch channels for sidebar
  useEffect(() => {
    const fetchChannels = async () => {
      const response = await channelApi.list();
      if (response.success && response.data) {
        setChannels(response.data);
      }
    };
    fetchChannels();
  }, []);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!post) return;

    setIsLoadingComments(true);
    try {
      const response = await commentApi.list(post.id, {
        sortBy: post.type === 'question' ? 'likeCount' : 'createdAt',
        sortOrder: 'desc',
      });

      if (response.success && response.data) {
        // For questions, sort accepted answer to top
        if (post.type === 'question') {
          const comments = response.data!.comments;
          const sorted = [...comments].sort((a, b) => {
            // Accepted answer always first
            if (a.isAccepted && !b.isAccepted) return -1;
            if (!a.isAccepted && b.isAccepted) return 1;
            // Then by like count
            return b.likeCount - a.likeCount;
          });
          setComments(sorted);
        } else {
          setComments(response.data!.comments);
        }
      }
    } catch {
      toast.error('获取评论失败');
    }
    setIsLoadingComments(false);
  }, [post]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Fetch similar posts for questions
  const fetchSimilarPosts = useCallback(async () => {
    if (!post || post.type !== 'question') return;

    try {
      const response = await postApi.getSimilar(post.id, 5);
      if (response.success && response.data) {
        setSimilarPosts(response.data);
      }
    } catch {
      // Silently fail for similar posts
    }
  }, [post]);

  useEffect(() => {
    fetchSimilarPosts();
  }, [fetchSimilarPosts]);

  // Handle vote
  const handleVote = async (type: 'like' | 'dislike') => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!post) return;

    setIsVoting(true);
    try {
      if (type === 'like') {
        const response = await postApi.like(post.id);
        if (response.success && response.data) {
          setPost((prev) => prev ? {
            ...prev,
            likeCount: response.data!.liked
              ? prev.likeCount + 1
              : prev.likeCount - 1,
            dislikeCount: prev.userVote === -1 ? prev.dislikeCount - 1 : prev.dislikeCount,
            userVote: response.data!.liked ? 1 : 0,
          } : null);
        }
      } else {
        const response = await postApi.dislike(post.id);
        if (response.success && response.data) {
          setPost((prev) => prev ? {
            ...prev,
            dislikeCount: response.data!.disliked
              ? prev.dislikeCount + 1
              : prev.dislikeCount - 1,
            likeCount: prev.userVote === 1 ? prev.likeCount - 1 : prev.likeCount,
            userVote: response.data!.disliked ? -1 : 0,
          } : null);
        }
      }
    } catch {
      toast.error('操作失败');
    }
    setIsVoting(false);
  };

  // Handle favorite
  const handleFavorite = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!post) return;

    setIsFavoriting(true);
    try {
      if (post.isFavorited) {
        const response = await postApi.unfavorite(post.id);
        if (response.success) {
          setPost((prev) => prev ? { ...prev, isFavorited: false } : null);
          toast.success('已取消收藏');
        }
      } else {
        const response = await postApi.favorite(post.id);
        if (response.success) {
          setPost((prev) => prev ? { ...prev, isFavorited: true } : null);
          toast.success('已收藏');
        }
      }
    } catch {
      toast.error('操作失败');
    }
    setIsFavoriting(false);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!confirm('确定要删除这个帖子吗？此操作不可撤销。')) return;

    setIsDeleting(true);
    try {
      const response = await postApi.delete(id);
      if (response.success) {
        toast.success('帖子已删除');
        router.push('/discussions');
      } else {
        toast.error(response.error || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
    setIsDeleting(false);
  };

  // Handle share
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          text: post?.content?.slice(0, 100),
          url: window.location.href,
        });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('链接已复制');
    }
  };

  // Handle report
  const handleReport = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!reportReason.trim() || reportReason.length < 10) {
      toast.error('请填写至少 10 个字符的举报原因');
      return;
    }

    setIsReporting(true);
    try {
      const response = await reportApi.create({
        targetType: 'post',
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
    } catch {
      toast.error('举报提交失败');
    }
    setIsReporting(false);
  };

  // Handle comment submit
  const handleCommentSubmit = async (content: string, parentId?: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!post || !content.trim()) return;

    setIsSubmittingComment(true);
    try {
      const response = await commentApi.create({
        postId: post.id,
        content,
        parentId,
      });

      if (response.success && response.data) {
        toast.success(parentId ? '回复成功' : '评论成功');
        setCommentContent('');
        setReplyingTo(null);
        // Refresh comments
        fetchComments();
        // Update comment count
        setPost((prev) => prev ? { ...prev, commentCount: prev.commentCount + 1 } : null);
      } else {
        toast.error(response.error || '评论失败');
      }
    } catch {
      toast.error('评论失败');
    }
    setIsSubmittingComment(false);
  };

  // Handle delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return;

    try {
      const response = await commentApi.delete(commentId);
      if (response.success) {
        toast.success('评论已删除');
        // Refresh comments
        fetchComments();
        // Update comment count
        setPost((prev) => prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : null);
      } else {
        toast.error(response.error || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  // Handle like comment
  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const response = await commentApi.like(commentId);
      if (response.success) {
        // Refresh comments to get updated like counts
        fetchComments();
      }
    } catch {
      toast.error('操作失败');
    }
  };

  // Handle accept answer
  const handleAcceptComment = async (commentId: string) => {
    if (!user || !post) return;

    try {
      const response = await commentApi.accept(commentId);
      if (response.success) {
        toast.success('已采纳该答案');
        // Refresh comments
        fetchComments();
      } else {
        toast.error(response.error || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  };

  // Get type badge
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'question':
        return { label: '问答', className: 'bg-blue-500/20 text-blue-600' };
      case 'poll':
        return { label: '投票', className: 'bg-purple-500/20 text-purple-600' };
      case 'share':
        return { label: '分享', className: 'bg-green-500/20 text-green-600' };
      default:
        return { label: '讨论', className: '' };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">帖子未找到</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href="/discussions">
          <Button variant="outline">返回讨论区</Button>
        </Link>
      </div>
    );
  }

  const typeBadge = getTypeBadge(post.type);
  const isOwner = user?.id === post.authorId;
  const isQuestion = post.type === 'question';

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0 max-w-4xl">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm mb-6">
              <Link href="/discussions" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                返回
              </Link>
              {post.channel && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <Link
                    href={`/discussions?channelId=${post.channelId}`}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <span>{post.channel.icon}</span>
                    {post.channel.name}
                  </Link>
                </>
              )}
            </nav>

            {/* Post Header */}
            <article>
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {(post.isPinned || post.isFeatured) && (
                  <>
                    {post.isPinned && (
                      <Badge className="bg-orange-500/20 text-orange-600 gap-1">
                        <Pin className="h-3 w-3" /> 置顶
                      </Badge>
                    )}
                    {post.isFeatured && (
                      <Badge className="bg-yellow-500/20 text-yellow-600 gap-1">
                        <Star className="h-3 w-3" /> 精华
                      </Badge>
                    )}
                  </>
                )}
                <Badge className={cn('text-xs', typeBadge.className)}>
                  {typeBadge.label}
                </Badge>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{post.title}</h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm text-muted-foreground">
                {/* Author */}
                <Link
                  href={`/users/${post.authorId}`}
                  className="flex items-center gap-2 hover:text-foreground"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={post.author?.avatar} />
                    <AvatarFallback className="text-xs">
                      {post.author?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">
                    {post.author?.displayName || post.author?.username}
                  </span>
                </Link>

                {/* Time */}
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatRelativeTime(post.createdAt)}
                </span>

                {/* Views */}
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {formatNumber(post.viewCount)} 浏览
                </span>

                {/* Comments */}
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {formatNumber(post.commentCount)} 评论
                </span>
              </div>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Content */}
              <div className="mt-8 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight, rehypeSanitize]}
                >
                  {post.content}
                </ReactMarkdown>
              </div>

              {/* Poll Section */}
              {post.type === 'poll' && (
                <div className="mt-8 p-6 bg-muted/30 rounded-lg border">
                  <PollComponent postId={id} />
                </div>
              )}

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 mt-8 pt-6 border-t">
                <div className="flex items-center gap-2">
                  {/* Like */}
                  <Button
                    variant={post.userVote === 1 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleVote('like')}
                    disabled={isVoting}
                    className="gap-1"
                  >
                    <ThumbsUp className={cn('h-4 w-4', post.userVote === 1 && 'fill-current')} />
                    {formatNumber(post.likeCount)}
                  </Button>

                  {/* Dislike */}
                  <Button
                    variant={post.userVote === -1 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleVote('dislike')}
                    disabled={isVoting}
                    className="gap-1"
                  >
                    <ThumbsDown className={cn('h-4 w-4', post.userVote === -1 && 'fill-current')} />
                    {formatNumber(post.dislikeCount)}
                  </Button>

                  {/* Favorite */}
                  <Button
                    variant={post.isFavorited ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleFavorite}
                    disabled={isFavoriting}
                    className="gap-1"
                  >
                    <Bookmark className={cn('h-4 w-4', post.isFavorited && 'fill-current')} />
                    收藏
                  </Button>

                  {/* Share */}
                  <Button variant="outline" size="sm" onClick={handleShare} className="gap-1">
                    <Share2 className="h-4 w-4" />
                    分享
                  </Button>

                  {/* Report */}
                  {!isOwner && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!user) {
                          router.push('/login');
                          return;
                        }
                        setShowReportModal(true);
                      }}
                      className="gap-1 text-muted-foreground hover:text-red-500"
                    >
                      <Flag className="h-4 w-4" />
                      举报
                    </Button>
                  )}
                </div>

                {/* Owner Actions */}
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <Link href={`/discussions/${id}/edit`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Edit className="h-4 w-4" />
                        编辑
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="text-destructive hover:text-destructive gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      删除
                    </Button>
                  </div>
                )}
              </div>
            </article>

            {/* Comments Section */}
            <section className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    评论 ({post.commentCount})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Comment Input */}
                  {user ? (
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>
                          {user.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <Textarea
                          placeholder="写下你的评论..."
                          value={commentContent}
                          onChange={(e) => setCommentContent(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <div className="flex justify-end">
                          <Button 
                            size="sm" 
                            onClick={() => handleCommentSubmit(commentContent)}
                            disabled={isSubmittingComment || !commentContent.trim()}
                          >
                            {isSubmittingComment && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                            发布评论
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground mb-2">登录后参与评论</p>
                      <Link href="/login">
                        <Button variant="outline" size="sm">登录</Button>
                      </Link>
                    </div>
                  )}

                  {/* Comments List */}
                  {isLoadingComments ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <CommentList
                      comments={comments}
                      postAuthorId={post.authorId}
                      isPostAuthor={isOwner}
                      isQuestion={isQuestion}
                      onReply={handleCommentSubmit}
                      onDelete={handleDeleteComment}
                      onLike={handleLikeComment}
                      onAccept={isQuestion ? handleAcceptComment : undefined}
                      isSubmitting={isSubmittingComment}
                    />
                  )}
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Right Sidebar */}
          <aside className="w-64 shrink-0 hidden lg:block">
            <div className="sticky top-24 space-y-4">
              {/* Channel Info */}
              {post.channel && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>{post.channel.icon}</span>
                      {post.channel.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {post.channel.description && (
                      <p className="text-sm text-muted-foreground">
                        {post.channel.description}
                      </p>
                    )}
                    <Link href={`/discussions?channelId=${post.channelId}`}>
                      <Button variant="outline" size="sm" className="w-full mt-3">
                        查看更多
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Author Card */}
              {post.author && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">发布者</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link
                      href={`/users/${post.authorId}`}
                      className="flex items-center gap-3 hover:opacity-80"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={post.author.avatar} />
                        <AvatarFallback>
                          {post.author.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {post.author.displayName || post.author.username}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @{post.author.username}
                        </p>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Popular Channels */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">热门频道</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {channels.slice(0, 5).map((channel) => (
                    <Link
                      key={channel.id}
                      href={`/discussions?channelId=${channel.id}`}
                      className="flex items-center justify-between py-1 text-sm hover:text-primary"
                    >
                      <span className="flex items-center gap-2">
                        <span>{channel.icon}</span>
                        {channel.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {channel.postCount} 帖
                      </span>
                    </Link>
                  ))}
                </CardContent>
              </Card>

              {/* Similar Questions (only for questions) */}
              {isQuestion && similarPosts.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-blue-500" />
                      相似问题
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {similarPosts.slice(0, 5).map((sp) => (
                      <Link
                        key={sp.id}
                        href={`/discussions/${sp.id}`}
                        className="block py-1 text-sm hover:text-primary"
                      >
                        <span className="line-clamp-2">{sp.title}</span>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          <span>{sp.commentCount || 0}</span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {sp.likeCount || 0}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background rounded-xl shadow-xl max-w-md w-full mx-4"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Flag className="h-5 w-5 text-red-500" />
                  举报帖子
                </h2>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-1 hover:bg-muted rounded"
                  aria-label="关闭举报弹窗"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>

              {reportSuccess ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">举报已提交</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    感谢您的反馈，我们会尽快处理
                  </p>
                  <Button onClick={() => setShowReportModal(false)}>
                    关闭
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    请选择举报原因（至少 10 个字符）
                  </p>

                  {/* Quick select reasons */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['垃圾信息', '不当内容', '抄袭', '其他'].map((reason) => (
                      <button
                        key={reason}
                        onClick={() => setReportReason(reason)}
                        className={cn(
                          'px-3 py-1.5 text-sm rounded-full border transition-colors',
                          reportReason === reason
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-input hover:bg-muted'
                        )}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>

                  <Textarea
                    placeholder="请详细描述举报原因..."
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="mb-4 min-h-[100px]"
                  />

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowReportModal(false)}>
                      取消
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleReport}
                      disabled={isReporting || reportReason.length < 10}
                    >
                      {isReporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      提交举报
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
