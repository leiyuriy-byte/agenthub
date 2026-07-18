/**
 * CSS Animation Components
 * 
 * 轻量级动画组件，替代 framer-motion
 * 优势：无 JS 依赖，纯 CSS 动画，首屏加载更快
 */

import { cn } from '@/lib/utils';

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // 延迟（秒）
  duration?: number; // 动画时长（秒）
}

/**
 * 淡入动画
 * 用法: <FadeIn delay={0.1}>内容</FadeIn>
 */
export function FadeIn({ children, className, delay = 0, duration = 0.5 }: FadeInProps) {
  return (
    <div
      className={cn('animate-fade-in', className)}
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * 上滑淡入动画
 * 用法: <SlideUp delay={0.1}>内容</SlideUp>
 */
export function SlideUp({ children, className, delay = 0, duration = 0.5 }: FadeInProps) {
  return (
    <div
      className={cn('animate-slide-up', className)}
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * 缩放淡入动画
 * 用法: <ScaleIn delay={0.1}>内容</ScaleIn>
 */
export function ScaleIn({ children, className, delay = 0, duration = 0.5 }: FadeInProps) {
  return (
    <div
      className={cn('animate-scale-in', className)}
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * 交错动画容器
 * 为子元素自动添加递增延迟
 * 用法: 
 * <Stagger stagger={0.05}>
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 * </Stagger>
 */
export function Stagger({ 
  children, 
  className, 
  stagger = 0.05 
}: { 
  children: React.ReactNode; 
  className?: string;
  stagger?: number;
}) {
  return (
    <div className={cn('animate-stagger', className)} style={{ '--stagger': stagger } as React.CSSProperties}>
      {children}
    </div>
  );
}

/**
 * Hover 动画 - 上浮
 * 用法: <HoverFloat><div>内容</div></HoverFloat>
 */
export function HoverFloat({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg', className)}>
      {children}
    </div>
  );
}

/**
 * Hover 动画 - 放大
 * 用法: <HoverScale><div>内容</div></HoverScale>
 */
export function HoverScale({ children, className, scale = 1.02 }: { children: React.ReactNode; className?: string; scale?: number }) {
  return (
    <div 
      className={cn('transition-transform duration-300', className)}
      style={{ '--tw-scale-x': scale, '--tw-scale-y': scale } as React.CSSProperties}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = `scale(${scale})`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {children}
    </div>
  );
}
