'use client';

import Link from 'next/link';
import { Button } from '@agenthub/ui/button';
import { Card } from '@agenthub/ui/card';
import { Sparkles } from 'lucide-react';

/**
 * CTASection - 行动号召区块
 * 包含：注册/发布 CTA
 */

export function CTASection() {
  return (
    <section className="py-20">
      <div className="container">
        <Card className="overflow-hidden border-0">
          <div className="relative py-16 px-8 md:px-16 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white">
            {/* 简化背景 - 提升 LCP */}
            
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                准备好展示你的 Agent 了吗？
              </h2>
              <p className="text-lg text-white/80 mb-8">
                加入社区，与全球开发者分享你的 AI Agent 项目，获得反馈和认可。
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" variant="secondary">
                  <Link href="/agents/new">
                    <Sparkles className="mr-2 h-5 w-5" />
                    发布 Agent
                  </Link>
                </Button>
                <Link
                  href="/discussions"
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 px-6 py-3 text-base font-medium transition-colors"
                >
                  加入讨论
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
