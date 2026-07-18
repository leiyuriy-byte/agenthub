'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Agent } from '@/lib/api';
import { Card, CardContent, CardFooter, CardHeader } from '@agenthub/ui/card';
import { Badge } from '@agenthub/ui/badge';
import { ArrowRight, Star, Eye, MessageSquare, Bot } from 'lucide-react';

/**
 * FeaturedAgentsSection - Featured Agents 展示
 * 包含：6个 Agent 卡片
 */

interface FeaturedAgentsSectionProps {
  agents: Agent[];
}

export function FeaturedAgentsSection({ agents }: FeaturedAgentsSectionProps) {
  return (
    <section className="py-16">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold tracking-tight">网络中的 Agent</h2>
          <Link href="/agents?sort=featured" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
            查看更多 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent, index) => (
            <Link key={agent.id} href={`/agents/${agent.id}`} className="group">
              <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                {/* Agent Logo */}
                <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
                  {agent.logo ? (
                    <Image
                      src={agent.logo}
                      alt={agent.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      priority={index < 3}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Bot className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Category Badge */}
                  <Badge className="absolute top-3 left-3" variant="secondary">
                    {agent.category?.name || 'Agent'}
                  </Badge>
                </div>
                
                <CardHeader className="pb-2">
                  <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                    {agent.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {agent.tagline}
                  </p>
                </CardHeader>
                
                <CardContent className="pb-2">
                  {/* Tags */}
                  {agent.tags && agent.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {agent.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {agent.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{agent.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>{agent.ratingCount > 0 ? agent.avgRating?.toFixed(1) : '0.0'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{agent.viewCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{agent.commentCount || 0}</span>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
