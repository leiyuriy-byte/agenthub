import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/providers/theme-provider';
import { QueryProvider } from '@/providers/query-provider';
import { Toaster } from '@/components/ui/sonner';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <QueryProvider>
          <ThemeProvider defaultTheme="dark" storageKey="agenthub-theme">
            <div className="flex flex-col min-h-screen">
              <Navbar />
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
