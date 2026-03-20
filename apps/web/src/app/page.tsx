'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { agentApi, postApi, Agent, AgentCategory, Post } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  ArrowRight,
  Star,
  Eye,
  MessageSquare,
  TrendingUp,
  Sparkles,
  Zap,
  Bot,
  Code,
  BarChart3,
  Palette,
  GraduationCap,
  Gamepad2,
  MoreHorizontal,
} from 'lucide-react';

// Icons map for categories
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'conversation': Bot,
  'code': Code,
  'analytics': BarChart3,
  'creative': Palette,
  'automation': Zap,
  'education': GraduationCap,
  'game': Gamepad2,
  'other': MoreHorizontal,
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const [featuredAgents, setFeaturedAgents] = useState<Agent[]>([]);
  const [categories, setCategories] = useState<AgentCategory[]>([]);
  const [hotPosts, setHotPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch featured agents and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [featuredRes, categoriesRes, postsRes] = await Promise.all([
          agentApi.getFeatured(6),
          agentApi.getCategories(),
          postApi.list({ limit: 4, sortBy: 'likeCount', sortOrder: 'desc' }),
        ]);

        if (featuredRes.success && featuredRes.data) {
          setFeaturedAgents(featuredRes.data);
        }
        if (categoriesRes.success && categoriesRes.data) {
          setCategories(categoriesRes.data);
        }
        if (postsRes.success && postsRes.data) {
          setHotPosts(postsRes.data.posts);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/agents?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  // Get icon for category
  const getCategoryIcon = (slug: string) => {
    return categoryIcons[slug] || MoreHorizontal;
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        {/* Enhanced Background Effects */}
        <div className="absolute inset-0 -z-10">
          {/* Main gradient orb */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-gradient-to-b from-indigo-500/30 via-purple-500/15 to-transparent rounded-full blur-3xl animate-pulse" />
          {/* Secondary gradient */}
          <div className="absolute bottom-0 right-0 w-[700px] h-[500px] bg-gradient-to-t from-pink-500/20 via-fuchsia-500/10 to-transparent rounded-full blur-3xl" />
          {/* Tertiary accent */}
          <div className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-full blur-3xl" />
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>

        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mx-auto max-w-3xl text-center"
          >
            {/* Animated Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <Badge 
                variant="secondary" 
                className="mb-6 gap-1.5 px-4 py-1.5 text-sm bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/20"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                </motion.div>
                已有 {featuredAgents.length || '100+'} 个优秀 Agent
              </Badge>
            </motion.div>
            
            {/* Animated Headline */}
            <motion.h1 
              className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                发现、创造、分享
              </span>
              <br />
              <span className="text-foreground">你的 AI Agent</span>
            </motion.h1>
            
            <motion.p 
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              面向 AI Agent 开发者、研究者和爱好者的综合性社区平台。
              在这里展示你的作品，与同行交流，共同推动 AI 时代的发展。
            </motion.p>

            {/* Enhanced Search Box */}
            <motion.form 
              onSubmit={handleSearch} 
              className="max-w-xl mx-auto mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-200" />
                <div className="relative flex items-center">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="搜索 Agent、项目或话题..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-14 pl-14 pr-36 rounded-xl border-0 bg-background/95 backdrop-blur shadow-lg focus:ring-2 focus:ring-primary/50 transition-all text-base"
                  />
                  <Button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-6"
                  >
                    搜索
                  </Button>
                </div>
              </div>
            </motion.form>

            {/* Enhanced CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <Link href="/agents/new" className="group">
                <Button 
                  size="lg" 
                  className="gap-2 text-base px-8 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300"
                >
                  <motion.div
                    whileHover={{ rotate: 15 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <Zap className="h-4 w-4" />
                  </motion.div>
                  创建你的 Agent
                  <motion.div
                    className="ml-1"
                    whileHover={{ x: 3 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </motion.div>
                </Button>
              </Link>
              <Link href="/agents" className="group">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-base px-8 h-12 border-2 hover:bg-primary/5 hover:border-primary/50 transition-all duration-300"
                >
                  探索更多
                  <motion.div
                    className="ml-2"
                    whileHover={{ x: 3 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </motion.div>
                </Button>
              </Link>
            </motion.div>

            {/* Trust indicators */}
            <motion.div 
              className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span>全天候服务</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
                <span>活跃社区</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" style={{ animationDelay: '1s' }} />
                <span>持续更新</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Featured Agents Section */}
      <section className="py-16 border-t bg-muted/30">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                精选 Agent
              </h2>
              <p className="text-muted-foreground mt-1">
                社区推荐的优质 AI Agent 项目
              </p>
            </div>
            <Link href="/agents">
              <Button variant="ghost" className="gap-1">
                查看全部
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="h-32 bg-muted" />
                  <CardContent className="pt-4">
                    <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredAgents.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {featuredAgents.map((agent) => (
                <motion.div key={agent.id} variants={itemVariants} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                  <Link href={`/agents/${agent.id}`}>
                    <Card className="h-full transition-all duration-300 hover:shadow-xl hover:border-primary/50 hover:shadow-primary/10 group">
                      <CardHeader className="flex flex-row items-start gap-4 pb-2">
                        <div className="h-14 w-14 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                          {agent.logo ? (
                            <img
                              src={agent.logo}
                              alt={agent.name}
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
                            {agent.name}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {agent.tagline || '暂无描述'}
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <div className="flex flex-wrap gap-1">
                          {agent.tags?.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            {agent.avgRating?.toFixed(1) || '0.0'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {agent.viewCount || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            {agent.commentCount || 0}
                          </span>
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">暂无精选 Agent</h3>
              <p className="text-muted-foreground mb-4">
                成为第一个发布 Agent 的开发者！
              </p>
              <Link href="/agents/new">
                <Button>创建 Agent</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">浏览分类</h2>
            <p className="text-muted-foreground">
              按照你的需求找到合适的 AI Agent
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.length > 0 ? (
              categories.slice(0, 8).map((category, index) => {
                const Icon = getCategoryIcon(category.slug);
                return (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={`/agents?categoryId=${category.id}`}>
                      <Card className="hover:border-primary/50 transition-colors group p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium group-hover:text-primary transition-colors">
                              {category.name}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {category.description || '查看全部'}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })
            ) : (
              // Default categories when API not available
              [
                { name: '对话助手', slug: 'conversation', description: '智能对话与问答' },
                { name: '代码工具', slug: 'code', description: '编程辅助与代码生成' },
                { name: '数据分析', slug: 'analytics', description: '数据处理与分析' },
                { name: '创意生成', slug: 'creative', description: '内容创作与设计' },
                { name: '自动化', slug: 'automation', description: '工作流自动化' },
                { name: '教育辅助', slug: 'education', description: '学习与教学' },
                { name: '游戏娱乐', slug: 'game', description: '游戏与娱乐' },
                { name: '其他', slug: 'other', description: '更多分类' },
              ].map((category, index) => {
                const Icon = categoryIcons[category.slug] || MoreHorizontal;
                return (
                  <motion.div
                    key={category.slug}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={`/agents?categorySlug=${category.slug}`}>
                      <Card className="hover:border-primary/50 transition-colors group p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium group-hover:text-primary transition-colors">
                              {category.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {category.description}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Hot Discussions Section */}
      <section className="py-16 border-t bg-muted/30">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                热门讨论
              </h2>
              <p className="text-muted-foreground mt-1">
                社区最活跃的讨论话题
              </p>
            </div>
            <Link href="/discussions">
              <Button variant="ghost" className="gap-1">
                查看全部
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {hotPosts.length > 0 ? (
              hotPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={`/discussions/${post.id}`}>
                    <Card className="hover:border-primary/50 transition-colors group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={post.author?.avatar} />
                            <AvatarFallback className="text-xs">
                              {(post.author?.displayName || post.author?.username || '??').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                              {post.title}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>{post.author?.displayName || post.author?.username}</span>
                              <span>·</span>
                              {post.channel && (
                                <span className="px-1.5 py-0.5 bg-muted rounded">
                                  {post.channel.icon} {post.channel.name}
                                </span>
                              )}
                              <span>·</span>
                              <span>{formatRelativeTime(post.createdAt)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5" />
                              {post.likeCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3.5 w-3.5" />
                              {post.commentCount}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))
            ) : (
              <div className="col-span-2 text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无热门讨论</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <CardContent className="relative p-8 md:p-12 text-center text-white">
              <h2 className="text-3xl font-bold mb-4">
                准备好展示你的 AI Agent 了吗？
              </h2>
              <p className="text-white/80 mb-8 max-w-xl mx-auto">
                加入 AgentHub 社区，与全球开发者交流，分享你的作品，获得反馈和建议。
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" variant="secondary" className="gap-2">
                    立即加入
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/agents">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white/10"
                  >
                    浏览社区
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
