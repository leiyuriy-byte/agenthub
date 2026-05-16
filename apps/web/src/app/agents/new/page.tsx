'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@agenthub/ui/button';
import { Input } from '@agenthub/ui/input';
import { Textarea } from '@agenthub/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@agenthub/ui/card';
import { Badge } from '@agenthub/ui/badge';
import { ImageUpload, ScreenshotsUpload } from '@agenthub/ui/image-upload';
import { agentApi, AgentCategory } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { slugify, cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  X,
  ExternalLink,
  Github,
  BookOpen,
  Eye,
  Save,
  Send,
} from 'lucide-react';

// Validation schema
const agentFormSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100, '名称不能超过100字符'),
  slug: z.string().min(1, 'slug 不能为空').max(100).regex(/^[a-z0-9-]+$/, 'slug 只能包含小写字母、数字和连字符'),
  tagline: z.string().max(200, '一句话描述不能超过200字符').optional(),
  description: z.string().optional(),
  logo: z.string().optional().or(z.literal('')),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).max(10).optional(),
  demoUrl: z.string().url('请输入有效的 URL').optional().or(z.literal('')),
  githubUrl: z.string().url('请输入有效的 URL').optional().or(z.literal('')),
  docsUrl: z.string().url('请输入有效的 URL').optional().or(z.literal('')),
});

type AgentFormData = z.infer<typeof agentFormSchema>;

interface ScreenshotItem {
  id: string;
  url: string;
  caption?: string;
}

export default function NewAgentPage() {
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();
  const [categories, setCategories] = useState<AgentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    slug: '',
    tagline: '',
    description: '',
    logo: '',
    categoryId: '',
    tags: [],
    demoUrl: '',
    githubUrl: '',
    docsUrl: '',
  });
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDraft, setIsDraft] = useState(true);

  // Check auth
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const response = await agentApi.getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    };
    fetchCategories();
  }, []);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || slugify(name),
    }));
  };

  // Handle tag input
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (tag && !formData.tags?.includes(tag) && formData.tags && formData.tags.length < 10) {
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
    const result = agentFormSchema.safeParse(formData);
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

  // Save as draft
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const response = await agentApi.create({
        ...formData,
        status: 'draft',
      });

      if (response.success && response.data) {
        // Save screenshots if any
        if (screenshots.length > 0) {
          for (const screenshot of screenshots) {
            await agentApi.addScreenshot(response.data.id, {
              url: screenshot.url,
              caption: screenshot.caption,
            });
          }
        }
        toast.success('草稿已保存');
        router.push(`/agents/${response.data.id}`);
      } else {
        toast.error(response.error || '保存失败');
      }
    } catch {
      toast.error('保存失败');
    }
    setIsSavingDraft(false);
  };

  // Publish
  const handlePublish = async () => {
    if (!validateForm()) {
      toast.error('请检查表单填写');
      return;
    }

    setIsLoading(true);
    try {
      const createResponse = await agentApi.create({
        ...formData,
        status: 'draft',
      });

      if (!createResponse.success || !createResponse.data) {
        toast.error(createResponse.error || '创建失败');
        setIsLoading(false);
        return;
      }

      // Save screenshots if any
      if (screenshots.length > 0) {
        for (const screenshot of screenshots) {
          await agentApi.addScreenshot(createResponse.data.id, {
            url: screenshot.url,
            caption: screenshot.caption,
          });
        }
      }

      // Publish
      const publishResponse = await agentApi.publish(createResponse.data.id);

      if (publishResponse.success) {
        toast.success('Agent 已发布！');
        router.push(`/agents/${createResponse.data.id}`);
      } else {
        toast.error(publishResponse.error || '发布失败');
      }
    } catch {
      toast.error('创建失败');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/agents" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">返回</span>
            </Link>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-lg font-semibold">创建 Agent</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isLoading}
            >
              {isSavingDraft ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              保存草稿
            </Button>
            <Button size="sm" onClick={handlePublish} disabled={isLoading}>
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
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardDescription>Agent 的名称、标识和简介</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg">
                  <ImageUpload
                    value={formData.logo}
                    onChange={(url) => setFormData((prev) => ({ ...prev, logo: url }))}
                    aspectRatio="square"
                    placeholder="上传 Logo"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Logo</label>
                  <p className="text-xs text-muted-foreground">
                    推荐使用正方形图片，支持 JPG、PNG、WebP 格式，最大 2MB
                  </p>
                  <Input
                    placeholder="或者输入图片 URL"
                    value={formData.logo || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, logo: e.target.value }))}
                    className={errors.logo ? 'border-destructive' : ''}
                  />
                  {errors.logo && <p className="text-xs text-destructive">{errors.logo}</p>}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  名称 <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="我的 Agent"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  URL Slug <span className="text-destructive">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/agents/</span>
                  <Input
                    placeholder="my-agent"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }))}
                    className={cn('flex-1', errors.slug ? 'border-destructive' : '')}
                  />
                </div>
                {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
              </div>

              {/* Tagline */}
              <div className="space-y-2">
                <label className="text-sm font-medium">一句话描述</label>
                <Input
                  placeholder="简洁描述你的 Agent 是做什么的"
                  value={formData.tagline}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tagline: e.target.value }))}
                  className={errors.tagline ? 'border-destructive' : ''}
                />
                {errors.tagline && <p className="text-xs text-destructive">{errors.tagline}</p>}
                <p className="text-xs text-muted-foreground">{formData.tagline?.length || 0}/200</p>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-sm font-medium">分类</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">选择分类</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-sm font-medium">标签</label>
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
                  disabled={(formData.tags?.length || 0) >= 10}
                />
                <p className="text-xs text-muted-foreground">最多添加 10 个标签</p>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>详细介绍</CardTitle>
              <CardDescription>使用 Markdown 格式详细描述你的 Agent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="## 功能特点&#10;&#10;- 功能1&#10;- 功能2&#10;&#10;## 使用场景&#10;&#10;..."
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="min-h-[300px] font-mono text-sm"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>支持 Markdown 语法</span>
                <span>{(formData.description?.length || 0)} 字符</span>
              </div>
            </CardContent>
          </Card>

          {/* Links */}
          <Card>
            <CardHeader>
              <CardTitle>相关链接</CardTitle>
              <CardDescription>Demo、GitHub 和文档链接</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Demo URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" /> Demo 链接
                </label>
                <Input
                  placeholder="https://demo.example.com"
                  value={formData.demoUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, demoUrl: e.target.value }))}
                  className={errors.demoUrl ? 'border-destructive' : ''}
                />
                {errors.demoUrl && <p className="text-xs text-destructive">{errors.demoUrl}</p>}
              </div>

              {/* GitHub URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Github className="h-4 w-4" /> GitHub 链接
                </label>
                <Input
                  placeholder="https://github.com/username/repo"
                  value={formData.githubUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, githubUrl: e.target.value }))}
                  className={errors.githubUrl ? 'border-destructive' : ''}
                />
                {errors.githubUrl && <p className="text-xs text-destructive">{errors.githubUrl}</p>}
              </div>

              {/* Docs URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> 文档链接
                </label>
                <Input
                  placeholder="https://docs.example.com"
                  value={formData.docsUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, docsUrl: e.target.value }))}
                  className={errors.docsUrl ? 'border-destructive' : ''}
                />
                {errors.docsUrl && <p className="text-xs text-destructive">{errors.docsUrl}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Screenshots */}
          <Card>
            <CardHeader>
              <CardTitle>截图展示</CardTitle>
              <CardDescription>上传你的 Agent 界面截图（最多 5 张）</CardDescription>
            </CardHeader>
            <CardContent>
              <ScreenshotsUpload
                value={screenshots}
                onChange={setScreenshots}
                max={5}
              />
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4" /> 预览
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                {/* Logo */}
                <div className="relative h-16 w-16 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {formData.logo ? (
                    <Image src={formData.logo} alt="Logo" fill className="object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-primary">
                      {formData.name.charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{formData.name || 'Agent 名称'}</h3>
                  {formData.tagline && (
                    <p className="text-sm text-muted-foreground truncate">{formData.tagline}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {formData.categoryId && categories.find((c) => c.id === formData.categoryId) && (
                      <Badge variant="outline" className="text-xs">
                        {categories.find((c) => c.id === formData.categoryId)?.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pb-8">
            <Button variant="outline" onClick={() => router.back()}>
              取消
            </Button>
            <Button variant="outline" onClick={handleSaveDraft} disabled={isSavingDraft || isLoading}>
              {isSavingDraft && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存草稿
            </Button>
            <Button onClick={handlePublish} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" />
              发布 Agent
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
