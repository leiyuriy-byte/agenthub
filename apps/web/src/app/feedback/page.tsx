'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@agenthub/ui/card';
import { Button } from '@agenthub/ui/button';
import { Input } from '@agenthub/ui/input';
import { Textarea } from '@agenthub/ui/textarea';
import { Badge } from '@agenthub/ui/badge';
import { feedbackApi, UserFeedback } from '@/lib/api';
import { formatRelativeTime, cn } from '@/lib/utils';
import { 
  Bug, 
  Lightbulb, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Trash2,
  Send
} from 'lucide-react';
import { toast } from 'sonner';

type FeedbackType = 'bug_report' | 'feature_suggestion';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  in_progress: 'bg-blue-500',
  resolved: 'bg-green-500',
  rejected: 'bg-red-500',
};

const statusLabels: Record<string, string> = {
  pending: '待处理',
  in_progress: '处理中',
  resolved: '已解决',
  rejected: '已拒绝',
};

export default function FeedbackPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Form state
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('bug_report');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check auth
  useEffect(() => {
    const token = localStorage.getItem('agenthub_token');
    if (!token) {
      router.push('/login');
      return;
    }
    setIsLoggedIn(true);
    fetchFeedbacks();
  }, [router]);

  const fetchFeedbacks = async (append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await feedbackApi.getMy({
        limit: 10,
        offset: append ? (page - 1) * 10 : 0,
      });

      if (response.success && response.data) {
        if (append) {
          setFeedbacks((prev) => [...prev, ...response.data.feedbacks]);
        } else {
          setFeedbacks(response.data.feedbacks);
        }
        setTotal(response.data.total);
      }
    } catch (err) {
      console.error('Failed to fetch feedbacks:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error('请填写标题和描述');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await feedbackApi.create({
        type: feedbackType,
        title: title.trim(),
        description: description.trim(),
      });

      if (response.success) {
        toast.success('反馈已提交，感谢您的建议！');
        setTitle('');
        setDescription('');
        fetchFeedbacks(false);
      } else {
        toast.error(response.error || '提交失败');
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      toast.error('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这条反馈吗？')) return;

    try {
      const response = await feedbackApi.delete(id);
      if (response.success) {
        toast.success('已删除');
        fetchFeedbacks(false);
      } else {
        toast.error(response.error || '删除失败');
      }
    } catch (err) {
      console.error('Failed to delete feedback:', err);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFeedbacks(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container py-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertCircle className="h-8 w-8" />
            反馈中心
          </h1>
          <p className="text-muted-foreground mt-2">
            报告 Bug 或提交功能建议，帮助我们改进 AgentHub
          </p>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Submit Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  提交反馈
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Feedback Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">反馈类型</label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={feedbackType === 'bug_report' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFeedbackType('bug_report')}
                        className="gap-2"
                      >
                        <Bug className="h-4 w-4" />
                        Bug 报告
                      </Button>
                      <Button
                        type="button"
                        variant={feedbackType === 'feature_suggestion' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFeedbackType('feature_suggestion')}
                        className="gap-2"
                      >
                        <Lightbulb className="h-4 w-4" />
                        功能建议
                      </Button>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <label htmlFor="title" className="text-sm font-medium">
                      标题
                    </label>
                    <Input
                      id="title"
                      placeholder="简要描述问题或建议"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={200}
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label htmlFor="description" className="text-sm font-medium">
                      详细描述
                    </label>
                    <Textarea
                      id="description"
                      placeholder={`请详细描述${feedbackType === 'bug_report' ? '问题现象、复现步骤' : '您希望添加的功能和原因'}`}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-[150px]"
                      maxLength={5000}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {description.length}/5000
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting || !title.trim() || !description.trim()}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    提交反馈
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Feedback List */}
          <div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  我的反馈
                </CardTitle>
                <Badge variant="secondary">
                  共 {total} 条
                </Badge>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                        <div className="h-20 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                ) : feedbacks.length === 0 ? (
                  <div className="py-12 text-center">
                    <AlertCircle className="h-12 w-12 text-muted mx-auto mb-4" />
                    <p className="text-muted-foreground">暂无反馈记录</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {feedbacks.map((feedback) => (
                      <motion.div
                        key={feedback.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {feedback.type === 'bug_report' ? (
                                <Bug className="h-4 w-4 text-red-500" />
                              ) : (
                                <Lightbulb className="h-4 w-4 text-yellow-500" />
                              )}
                              <span className="font-medium truncate">
                                {feedback.title}
                              </span>
                              <span className={cn(
                                "w-2 h-2 rounded-full",
                                statusColors[feedback.status]
                              )} />
                              <span className="text-xs text-muted-foreground">
                                {statusLabels[feedback.status]}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {feedback.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              {feedback.status === 'resolved' && feedback.adminResponse && (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              )}
                              {formatRelativeTime(feedback.createdAt)}
                            </div>
                            {feedback.adminResponse && (
                              <div className="mt-3 p-3 rounded bg-muted/50">
                                <p className="text-xs font-medium mb-1">官方回复：</p>
                                <p className="text-sm">{feedback.adminResponse}</p>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDelete(feedback.id)}
                            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}

                    {/* Load More */}
                    {total > feedbacks.length && (
                      <div className="text-center mt-4">
                        <Button
                          variant="outline"
                          onClick={loadMore}
                          disabled={isLoadingMore}
                        >
                          {isLoadingMore ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          加载更多
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}