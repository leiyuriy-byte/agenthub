import { Search, Plus } from 'lucide-react';

/**
 * NavbarSkeleton - 纯静态骨架屏，无需 JS 即可渲染
 * 解决 LCP 阻塞问题 - 首次绘制无需等待 JS 加载
 */
export function NavbarSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-[#4338ca] flex items-center justify-center">
            <span className="text-white font-bold text-sm">AH</span>
          </div>
          <span className="text-xl font-bold text-foreground hidden sm:block">
            AgentHub
          </span>
        </div>

        {/* Desktop Navigation - Static Links */}
        <nav className="hidden md:flex items-center gap-1 h-11" aria-label="主要导航">
          {['发现 Agent', '讨论区', '博客', '资源', '活动', '反馈'].map((label) => (
            <div
              key={label}
              className="px-4 py-2 text-sm font-medium rounded-lg text-muted-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              {label}
            </div>
          ))}
        </nav>

        {/* Search Bar - Desktop (Static) */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <div className="w-full h-10 pl-10 pr-4 bg-muted/50 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Right Side Actions (Static placeholders) */}
        <div className="flex items-center gap-2">
          {/* Search Button - Mobile */}
          <div className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <div className="h-5 w-5 bg-muted rounded animate-pulse" />
          </div>

          {/* Create Button placeholder */}
          <div className="hidden sm:inline-flex gap-1 h-9 w-16 bg-primary/80 rounded-md animate-pulse" />

          {/* Notification placeholder */}
          <div className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <div className="h-5 w-5 bg-muted rounded animate-pulse" />
          </div>

          {/* Messages placeholder */}
          <div className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <div className="h-5 w-5 bg-muted rounded animate-pulse" />
          </div>

          {/* User placeholder */}
          <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />

          {/* Mobile Menu Toggle */}
          <div className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <div className="h-5 w-5 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    </header>
  );
}

export default NavbarSkeleton;
