'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@agenthub/ui/button';
import { Input } from '@agenthub/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@agenthub/ui/card';
import { Badge } from '@agenthub/ui/badge';
import { channelApi, Channel, postApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Send,
  MessageSquare,
  HelpCircle,
  BarChart2,
  Share2,
  X,
} from 'lucide-react';
import { MarkdownEditor } from '@/components/markdown/markdown-editor';

const postTypes: Array<{ key: 'normal' | 'question' | 'poll' | 'share'; label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = [
  { key: 'normal', label: '讨论', icon: MessageSquare, description: '发起一般性讨论' },
  { key: 'question', label: '问答', icon: HelpCircle, description: '提出问题寻求帮助' },
  { key: 'share', label: '分享', icon: Share2, description: '分享有趣的内容或资源' },
  { key: 'poll', label: '投票', icon: BarChart2, description: '发起投票收集意见' },
];

// Validation schema
const postFormSchema = z.object({
  channelId: z.string().min(1, '请选择频道'),
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200字符'),
  content: z.string().min(1, '内容不能为空'),
  type: z.enum(['normal', 'question', 'poll', 'share']).default('normal'),
  tags: z.array(z.string()).max(5).optional(),
  // Poll fields
  pollQuestion: z.string().optional(),
  pollOptions: z.array(z.string()).optional(),
  pollMultiSelect: z.boolean().optional(),
  pollAnonymous: z.boolean().optional(),
  pollEndsAt: z.string().optional(),
});

type PostFormData = z.infer<typeof postFormSchema>;

export default function NewPostPage() {
  const router = useRouter();
  const { checkAuth } = useAuthStore();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<PostFormData>({
    channelId: '',
    title: '',
    content: '',
    type: 'normal',
    tags: [],
    pollQuestion: '',
    pollOptions: ['', ''],
    pollMultiSelect: false,
    pollAnonymous: false,
    pollEndsAt: '',
  });

  // Check auth
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Fetch channels
  useEffect(() => {
    const fetchChannels = async () => {
      const response = await channelApi.list();
      if (response.success && response.data) {
        setChannels(response.data);
        // Set default channel if available
        if (response.data.length > 0) {
          const firstChannel = response.data[0];
          if (firstChannel) {
            setFormData((prev) => ({ ...prev, channelId: firstChannel.id }));
          }
        }
      }
    };
    fetchChannels();
  }, []);

  // Handle tag input
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (tag && !formData.tags?.includes(tag) && formData.tags && formData.tags.length < 5) {
        setFormData((prev) => ({
          ...prev,
          tags: [...(prev.tags || []), tag],
        }));
        setTagInput('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tagToRemove),
    }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const result = postFormSchema.safeParse(formData);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  // Submit
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('请检查表单填写');
      return;
    }

    // Additional validation for poll type
    if (formData.type === 'poll') {
      const options = formData.pollOptions?.filter(o => o.trim()) || [];
      if (!formData.pollQuestion?.trim()) {
        toast.error('请填写投票问题');
        return;
      }
      if (options.length < 2) {
        toast.error('请至少提供 2 个投票选项');
        return;
      }
    }

    setIsLoading(true);
    try {
      // Create the post first
      const postResponse = await postApi.create({
        channelId: formData.channelId,
        title: formData.title,
        content: formData.content,
        type: formData.type,
        tags: formData.tags,
      });

      if (postResponse.success && postResponse.data) {
        const postId = postResponse.data.id;

        // If it's a poll, create the poll
        if (formData.type === 'poll' && formData.pollQuestion) {
          const pollOptions = (formData.pollOptions || []).filter(o => o.trim());
          if (pollOptions.length >= 2) {
            try {
              await fetch('/api/polls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  postId,
                  question: formData.pollQuestion,
                  options: pollOptions,
                  isAnonymous: formData.pollAnonymous,
                  isMultiSelect: formData.pollMultiSelect,
                  endsAt: formData.pollEndsAt || undefined,
                }),
              });
            } catch (pollError) {
              console.error('Failed to create poll:', pollError);
              // Don't fail the whole submission if poll creation fails
            }
          }
        }

        toast.success('帖子已发布！');
        router.push(`/discussions/${postId}`);
      } else {
        toast.error(postResponse.error || '发布失败');
      }
    } catch {
      toast.error('发布失败');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/discussions" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">返回</span>
            </Link>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-lg font-semibold">发布帖子</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              发布
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Post Type */}
          <Card>
            <CardHeader>
              <CardTitle>帖子类型</CardTitle>
              <CardDescription>选择适合的帖子类型</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {postTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = formData.type === type.key;
                  return (
                    <button
                      key={type.key}
                      onClick={() => setFormData((prev) => ({ ...prev, type: type.key }))}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-lg border transition-all text-center',
                        isSelected
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'
                      )}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="font-medium text-sm">{type.label}</span>
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {type.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Channel Selection */}
          <Card>
            <CardHeader>
              <CardTitle>选择频道</CardTitle>
              <CardDescription>选择发布到的频道</CardDescription>
            </CardHeader>
            <CardContent>
              <select
                value={formData.channelId}
                onChange={(e) => setFormData((prev) => ({ ...prev, channelId: e.target.value }))}
                className={cn(
                  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                  errors.channelId && 'border-destructive'
                )}
              >
                <option value="">选择频道</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.icon} {channel.name}
                  </option>
                ))}
              </select>
              {errors.channelId && <p className="text-xs text-destructive mt-1">{errors.channelId}</p>}
            </CardContent>
          </Card>

          {/* Title */}
          <Card>
            <CardHeader>
              <CardTitle>标题</CardTitle>
              <CardDescription>简洁明了的标题能吸引更多人阅读</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                placeholder="你的帖子标题..."
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
              <p className="text-xs text-muted-foreground text-right">{formData.title.length}/200</p>
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>内容</CardTitle>
              <CardDescription>使用 Markdown 格式编写内容</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MarkdownEditor
                value={formData.content}
                onChange={(value) => setFormData((prev) => ({ ...prev, content: value }))}
                placeholder="## 背景&#10;&#10;描述一下你的问题或分享内容...&#10;&#10;## 详情&#10;&#10;..."
                minHeight="300px"
                error={!!errors.content}
              />
              {errors.content && <p className="text-xs text-destructive">{errors.content}</p>}

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-sm font-medium">标签（可选）</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 rounded-sm hover:bg-muted-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="输入标签后按回车添加"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  disabled={(formData.tags?.length || 0) >= 5}
                />
                <p className="text-xs text-muted-foreground">最多添加 5 个标签</p>
              </div>
            </CardContent>
          </Card>

          {/* Poll Configuration (only when poll type selected) */}
          {formData.type === 'poll' && (
            <Card>
              <CardHeader>
                <CardTitle>投票配置</CardTitle>
                <CardDescription>设置投票选项和规则</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Poll Question */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">投票问题</label>
                  <Input
                    placeholder="例如：你喜欢哪种开发语言？"
                    value={formData.pollQuestion || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, pollQuestion: e.target.value }))}
                    className={errors.pollQuestion ? 'border-destructive' : ''}
                  />
                  {errors.pollQuestion && <p className="text-xs text-destructive">{errors.pollQuestion}</p>}
                </div>

                {/* Poll Options */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">投票选项（2-10个）</label>
                  <div className="space-y-2">
                    {(formData.pollOptions || ['', '']).map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`选项 ${index + 1}`}
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...(formData.pollOptions || ['', ''])];
                            newOptions[index] = e.target.value;
                            setFormData((prev) => ({ ...prev, pollOptions: newOptions }));
                          }}
                          className="flex-1"
                        />
                        {(formData.pollOptions?.length || 2) > 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newOptions = (formData.pollOptions || ['', '']).filter((_, i) => i !== index);
                              setFormData((prev) => ({ ...prev, pollOptions: newOptions }));
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {(formData.pollOptions?.length || 2) < 10 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newOptions = [...(formData.pollOptions || ['', '']), ''];
                        setFormData((prev) => ({ ...prev, pollOptions: newOptions }));
                      }}
                      className="mt-2"
                    >
                      + 添加选项
                    </Button>
                  )}
                </div>

                {/* Poll Settings */}
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.pollMultiSelect || false}
                      onChange={(e) => setFormData((prev) => ({ ...prev, pollMultiSelect: e.target.checked }))}
                      className="rounded border-input"
                    />
                    <span className="text-sm">允许多选</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.pollAnonymous || false}
                      onChange={(e) => setFormData((prev) => ({ ...prev, pollAnonymous: e.target.checked }))}
                      className="rounded border-input"
                    />
                    <span className="text-sm">匿名投票</span>
                  </label>
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">截止日期（可选）</label>
                  <Input
                    type="datetime-local"
                    value={formData.pollEndsAt || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, pollEndsAt: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pb-8">
            <Button variant="outline" onClick={() => router.back()}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" />
              发布帖子
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
