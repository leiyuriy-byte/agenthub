'use client';

import Link from 'next/link';
import { Post } from '@/lib/api';
import { Card, CardContent } from '@agenthub/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@agenthub/ui/avatar';
import { formatRelativeTime } from '@/lib/utils';
import { ArrowRight, Star, Eye, MessageSquare } from 'lucide-react';

/**
 * HotPostsSection - 热门帖子展示
 * 包含：4个热门帖子卡片
 */

interface HotPostsSectionProps {
  posts: Post[];
}

export function HotPostsSection({ posts }: HotPostsSectionProps) {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold tracking-tight">热门讨论</h2>
          <Link href="/discussions" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
            查看更多 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          {posts.map((post) => (
            <Link key={post.id} href={`/discussions/${post.id}`}>
              <Card className="transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={post.author?.avatar} />
                      <AvatarFallback>
                        {post.author?.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{post.author?.username}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(post.createdAt)}
                        </span>
                      </div>
                      <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span>{post.likeCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{post.commentCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          <span>{post.viewCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
