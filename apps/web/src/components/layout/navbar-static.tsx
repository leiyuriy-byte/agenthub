import Link from 'next/link';
import { Search } from 'lucide-react';

/**
 * NavbarStatic - 服务端渲染的导航栏静态部分
 * 
 * 关键优化：
 * - 纯静态 HTML，服务端直接渲染，无需等待 JS
 * - 无客户端 hydration 开销
 * - 立即显示（LCP 最优化）
 * - 仅包含链接和搜索框
 * 
 * 使用 Islands Architecture：
 * - 静态部分：NavbarStatic（Server Component）- Logo + 导航 + 搜索
 * - 动态部分：NavbarClient（Client Component）- 用户菜单 + 通知 + 移动端菜单
 */

interface NavbarStaticProps {
  user?: {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
    points?: number;
    level?: number;
  } | null;
}

export function NavbarStatic({ user }: NavbarStaticProps) {
  const navLinks = [
    { href: '/agents', label: '发现 Agent' },
    { href: '/discussions', label: '讨论区' },
    { href: '/articles', label: '博客' },
    { href: '/resources', label: '资源' },
    { href: '/activities', label: '活动' },
    { href: '/feedback', label: '反馈' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo Section */}
        <div className="flex items-center gap-2 shrink-0">
          <Link 
            href="/" 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="AgentHub 首页"
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">AH</span>
            </div>
            <span className="text-xl font-bold text-foreground hidden sm:block">
              AgentHub
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1" aria-label="主要导航">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors min-h-[44px] flex items-center justify-center"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Search Bar - Desktop */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <form action="/search" method="GET" className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              name="q"
              placeholder="搜索 Agent、帖子、用户..."
              className="w-full h-10 pl-10 pr-4 bg-muted/50 rounded-md border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
              aria-label="搜索"
            />
          </form>
        </div>

        {/* Right Side Placeholder - Auth-dependent content handled by NavbarClient */}
        {/* 未登录时的登录/注册按钮由 NavbarClient 处理 */}
        {/* 登录后的用户菜单由 NavbarClient 处理 */}
        <div className="flex items-center gap-2" aria-hidden="true">
          {/* 这是一个占位符，让 NavbarClient 可以正确定位 */}
          <div className="w-24 h-9 hidden sm:block" />
        </div>
      </div>

      {/* Mobile Menu Placeholder - 移动端菜单由 NavbarClient 控制 */}
      {/* NavbarClient 使用绝对定位渲染移动端菜单 */}
    </header>
  );
}

export default NavbarStatic;
