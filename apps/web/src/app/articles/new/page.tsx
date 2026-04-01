'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Badge } from '@agenthub/ui/badge';
import { Button } from '@agenthub/ui/button';
import { Input } from '@agenthub/ui/input';
import { Textarea } from '@agenthub/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@agenthub/ui/card';
import { MarkdownEditor } from '@/components/markdown/markdown-editor';
import { useAuthStore } from '@/lib/api';
import { articleApi, ArticleCategory } from '@/lib/api';
import { Loader2, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function NewArticlePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  useEffect(() => {
    // Fetch categories
    articleApi.getCategories().then((res) => {
      if (res.success && res.data) {
        setCategories(res.data);
      }
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 10) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (publish: boolean = false) => {
    if (!title.trim()) {
      toast.error('请输入文章标题');
      return;
    }
    if (!content.trim()) {
      toast.error('请输入文章内容');
      return;
    }

    setIsSubmitting(true);
    const response = await articleApi.create({
      title: title.trim(),
      content: content.trim(),
      excerpt: excerpt.trim() || undefined,
      coverImage: coverImage.trim() || undefined,
      categoryId: categoryId || undefined,
      tags: tags.length > 0 ? tags : undefined,
      status: publish ? 'published' : 'draft',
    });

    if (response.success && response.data) {
      toast.success(publish ? '文章已发布' : '草稿已保存');
      router.push(`/articles/${response.data.slug}`);
    } else {
      toast.error(response.error || '发布失败');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-4xl py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">撰写文章</h1>
          <p className="mt-2 text-muted-foreground">
            分享你的技术见解和经验
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <Card>
              <CardContent className="pt-6">
                <Input
                  placeholder="文章标题"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xl font-semibold border-none px-0 focus-visible:ring-0"
                />
              </CardContent>
            </Card>

            {/* Cover Image */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">封面图片（可选）</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="输入封面图片 URL"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                />
                {coverImage && (
                  <div className="mt-4 relative h-48 w-full overflow-hidden rounded-lg">
                    <img
                      src={coverImage}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Content */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">内容</CardTitle>
              </CardHeader>
              <CardContent>
                <MarkdownEditor
                  value={content}
                  onChange={setContent}
                  placeholder="在这里编写你的文章内容..."
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Publish */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">发布</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  className="w-full"
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {status === 'published' ? '更新并发布' : '发布文章'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  保存草稿
                </Button>
              </CardContent>
            </Card>

            {/* Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">分类</CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">选择分类</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">标签</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="添加标签"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button variant="outline" size="icon" onClick={handleAddTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  最多添加 10 个标签
                </p>
              </CardContent>
            </Card>

            {/* Excerpt */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">摘要（可选）</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="输入文章摘要..."
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
