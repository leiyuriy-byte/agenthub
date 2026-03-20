'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { Button } from '@agenthub/ui/button';
import { Input } from '@agenthub/ui/input';
import { Textarea } from '@agenthub/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@agenthub/ui/card';
import { Badge } from '@agenthub/ui/badge';
import { agentApi, AgentCategory, Agent } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { slugify, cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Plus,
  X,
  ExternalLink,
  Github,
  BookOpen,
  ImageIcon,
  Eye,
  Save,
  Send,
  Trash2,
  AlertCircle,
} from 'lucide-react';

// Validation schema
const agentFormSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100, '名称不能超过100字符'),
  slug: z.string().min(1, 'slug 不能为空').max(100).regex(/^[a-z0-9-]+$/, 'slug 只能包含小写字母、数字和连字符'),
  tagline: z.string().max(200, '一句话描述不能超过200字符').optional(),
  description: z.string().optional(),
  logo: z.string().url('请输入有效的 URL').optional().or(z.literal('')),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).max(10).optional(),
  demoUrl: z.string().url('请输入有效的 URL').optional().or(z.literal('')),
  githubUrl: z.string().url('请输入有效的 URL').optional().or(z.literal('')),
  docsUrl: z.string().url('请输入有效的 URL').optional().or(z.literal('')),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

type AgentFormData = z.infer<typeof agentFormSchema>;

export default function EditAgentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { user, checkAuth } = useAuthStore();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [categories, setCategories] = useState<AgentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    status: 'draft',
  });

  // Check auth and fetch agent
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Fetch agent data
  const fetchAgent = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    const response = await agentApi.get(id);

    if (response.success && response.data) {
      const agentData = response.data;
      setAgent(agentData);
      setFormData({
        name: agentData.name || '',
        slug: agentData.slug || '',
        tagline: agentData.tagline || '',
        description: agentData.description || '',
        logo: agentData.logo || '',
        categoryId: agentData.categoryId || '',
        tags: agentData.tags || [],
        demoUrl: agentData.demoUrl || '',
        githubUrl: agentData.githubUrl || '',
        docsUrl: agentData.docsUrl || '',
        status: agentData.status as 'draft' | 'published' | 'archived' || 'draft',
      });
    } else {
      toast.error('Agent 未找到');
      router.push('/agents');
    }

    setIsLoading(false);
  }, [id, router]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

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

  // Save changes
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('请检查表单填写');
      return;
    }

    setIsSaving(true);
    try {
      const response = await agentApi.update(id, formData);

      if (response.success && response.data) {
        toast.success('保存成功');
        setAgent(response.data as Agent);
      } else {
        toast.error(response.error || '保存失败');
      }
    } catch {
      toast.error('保存失败');
    }
    setIsSaving(false);
  };

  // Publish / unpublish
  const handlePublish = async () => {
    setIsSaving(true);
    try {
      if (agent?.status === 'published') {
        // Unpublish - set to draft
        const response = await agentApi.update(id, { status: 'draft' });
        if (response.success) {
          toast.success('已设为草稿');
          setAgent((prev) => prev ? { ...prev, status: 'draft' } : null);
        }
      } else {
        // Publish
        const response = await agentApi.publish(id);
        if (response.success) {
          toast.success('已发布！');
          setAgent((prev) => prev ? { ...prev, status: 'published' } : null);
        }
      }
    } catch {
      toast.error('操作失败');
    }
    setIsSaving(false);
  };

  // Delete
  const handleDelete = async () => {
    if (!confirm('确定要删除这个 Agent 吗？此操作不可撤销。')) return;

    setIsDeleting(true);
    try {
      const response = await agentApi.delete(id);
      if (response.success) {
        toast.success('已删除');
        router.push('/agents');
      } else {
        toast.error(response.error || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
    setIsDeleting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Agent 未找到</h2>
        <Link href="/agents">
          <Button variant="outline">返回 Agent 列表</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/agents/${id}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">返回</span>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">编辑 Agent</h1>
              {agent.status === 'draft' && (
                <Badge variant="secondary" className="text-xs">草稿</Badge>
              )}
              {agent.status === 'published' && (
                <Badge variant="default" className="text-xs bg-green-500">已发布</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              保存
            </Button>
            <Button
              variant={agent.status === 'published' ? 'outline' : 'default'}
              size="sm"
              onClick={handlePublish}
              disabled={isSaving}
            >
              {agent.status === 'published' ? '设为草稿' : '发布'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              删除
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
              {/* Logo Preview */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/20">
                    {formData.logo ? (
                      <img src={formData.logo} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Logo URL</label>
                  <Input
                    placeholder="https://example.com/logo.png"
                    value={formData.logo}
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
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
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

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4" /> 预览
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {formData.logo ? (
                    <img src={formData.logo} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-primary">
                      {formData.name.charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
                </div>
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
          <div className="flex items-center justify-between pb-8">
            <Button variant="ghost" onClick={handleDelete} disabled={isDeleting} className="text-destructive hover:text-destructive">
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Trash2 className="h-4 w-4 mr-2" />
              删除 Agent
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => router.push(`/agents/${id}`)}>
                取消
              </Button>
              <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                保存修改
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
