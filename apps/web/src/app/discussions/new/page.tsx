'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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

const postTypes = [
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
});

type PostFormData = z.infer<typeof postFormSchema>;

export default function NewPostPage() {
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();
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
          setFormData((prev) => ({ ...prev, channelId: response.data![0].id }));
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

    setIsLoading(true);
    try {
      const response = await postApi.create(formData);

      if (response.success && response.data) {
        toast.success('帖子已发布！');
        router.push(`/discussions/${response.data.id}`);
      } else {
        toast.error(response.error || '发布失败');
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
                      onClick={() => setFormData((prev) => ({ ...prev, type: type.key as any }))}
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
