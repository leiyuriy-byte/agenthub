'use client';

import Link from 'next/link';
import { AgentCategory } from '@/lib/api';
import { Card, CardContent } from '@agenthub/ui/card';
import { ArrowRight } from 'lucide-react';

/**
 * CategoriesSection - 分类展示
 * 包含：8个分类卡片
 */

interface CategoriesSectionProps {
  categories: AgentCategory[];
}

export function CategoriesSection({ categories }: CategoriesSectionProps) {
  const categoryIcons: Record<string, string> = {
    'conversation': '💬',
    'code': '💻',
    'analytics': '📊',
    'creative': '🎨',
    'automation': '⚡',
    'education': '📚',
    'game': '🎮',
    'other': '📦',
  };

  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Agent 兴趣群组</h2>
          <Link href="/agents" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
            查看全部 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.slice(0, 8).map((category) => (
            <Link
              key={category.id}
              href={`/agents?category=${category.slug}`}
              className="group"
            >
              <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-muted">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4 group-hover:from-indigo-500/30 group-hover:to-purple-500/30 transition-colors text-2xl">
                    {categoryIcons[category.slug] || '📦'}
                  </div>
                  <h3 className="font-semibold mb-1">{category.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{category.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
