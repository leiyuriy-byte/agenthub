import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { dynamic } from 'next/dynamic';
import { ThemeProvider } from '@/providers/theme-provider';
import { QueryProvider } from '@/providers/query-provider';
import { Toaster } from '@/components/ui/sonner';
import { NavbarStatic } from '@/components/layout/navbar-static';
import { NavbarSkeleton } from '@/components/layout/navbar-skeleton';
import { Footer } from '@/components/layout/footer';
import './globals.css';

/**
 * NavbarClient - 动态导入的客户端交互组件
 * 
 * 关键优化：
 * - ssr: false - 完全客户端渲染，不阻塞服务端
 * - loading: NavbarSkeleton - 加载时显示骨架屏
 * 
 * 用户认证状态由客户端组件通过 useAuthStore 管理
 * 服务端不进行 session 检查，让客户端处理
 */
const NavbarClient = dynamic(
  () => import('@/components/layout/navbar-client').then((mod) => mod.NavbarClient),
  {
    ssr: false,
    loading: () => <NavbarSkeleton />,
  }
);

// Note: Using system fonts to avoid Google Fonts network issues
// --font-sans and --font-mono are defined in globals.css

export const metadata: Metadata = {
  title: {
    default: 'AgentHub - AI Agent 开发者交流社区',
    template: '%s | AgentHub',
  },
  description:
    '面向 AI Agent 开发者、研究者和爱好者的综合性社区平台。集项目展示、技术交流、知识沉淀、生态对接于一体。',
  keywords: ['AI Agent', 'AI助手', '开发者社区', '机器学习', '人工智能', '开源项目'],
  authors: [{ name: 'AgentHub Team' }],
  creator: 'AgentHub',
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: 'https://agenthub.dev',
    siteName: 'AgentHub',
    title: 'AgentHub - AI Agent 开发者交流社区',
    description: '面向 AI Agent 开发者、研究者和爱好者的综合性社区平台',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentHub - AI Agent 开发者交流社区',
    description: '面向 AI Agent 开发者、研究者和爱好者的综合性社区平台',
    creator: '@agenthub',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <QueryProvider>
          <ThemeProvider defaultTheme="dark" storageKey="agenthub-theme">
            <div className="flex flex-col min-h-screen">
              {/* 
                Islands Architecture 优化：
                1. NavbarStatic - 服务端渲染，Logo + 导航 + 搜索（立即显示，LCP 最优）
                2. NavbarClient - 客户端水合，用户菜单 + 通知 + 移动端菜单
                
                服务端不检查 session，认证状态由客户端管理
              */}
              <NavbarStatic user={null} />
              <Suspense fallback={<NavbarSkeleton />}>
                <NavbarClient user={null} />
              </Suspense>
              
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
            <Toaster position="top-center" richColors closeButton />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
