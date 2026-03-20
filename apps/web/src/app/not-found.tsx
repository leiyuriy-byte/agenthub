'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@agenthub/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileQuestion, Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-12 pb-8">
          {/* 404 Icon */}
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <FileQuestion className="h-12 w-12 text-primary" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-2">页面未找到</h1>
          
          {/* Description */}
          <p className="text-muted-foreground mb-8">
            抱歉，您访问的页面不存在或已被移除。
            <br />
            可能是链接错误或页面已过期。
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              返回上一页
            </Button>
            <Link href="/">
              <Button variant="default" className="gap-2 w-full sm:w-auto">
                <Home className="h-4 w-4" />
                返回首页
              </Button>
            </Link>
          </div>

          {/* Search suggestion */}
          <div className="mt-8 pt-6 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              您可以尝试：
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link href="/agents">
                <Button variant="secondary" size="sm">
                  浏览 Agent
                </Button>
              </Link>
              <Link href="/discussions">
                <Button variant="secondary" size="sm">
                  查看讨论区
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
