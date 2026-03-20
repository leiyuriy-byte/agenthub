'use client';

import { useEffect } from 'react';
import { Button } from '@agenthub/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-12 pb-8">
          {/* Error Icon */}
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-destructive/10 rounded-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-2">出了点问题</h1>
          
          {/* Description */}
          <p className="text-muted-foreground mb-4">
            抱歉，应用程序遇到了一个错误。
          </p>

          {/* Error details (only in development) */}
          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-6 text-left font-mono overflow-auto max-h-32">
              {error.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="gap-2"
            >
              返回上一页
            </Button>
            <Button
              variant="default"
              onClick={reset}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              重试
            </Button>
          </div>

          {/* Home link */}
          <div className="mt-8 pt-6 border-t">
            <Link href="/">
              <Button variant="ghost" className="gap-2">
                <Home className="h-4 w-4" />
                返回首页
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
