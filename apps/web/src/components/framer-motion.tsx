'use client';

import { lazy, Suspense } from 'react';
import { Skeleton } from './ui/skeleton';

// Lazy load framer-motion components - only load when needed
// This reduces initial bundle size significantly
const MotionDiv = lazy(() =>
  import('framer-motion').then((mod) => ({ default: mod.motion.div }))
);
const MotionButton = lazy(() =>
  import('framer-motion').then((mod) => ({ default: mod.motion.button }))
);
const MotionForm = lazy(() =>
  import('framer-motion').then((mod) => ({ default: mod.motion.form }))
);
const AnimatePresence = lazy(() =>
  import('framer-motion').then((mod) => ({ default: mod.AnimatePresence }))
);

// Fallback component while loading
function MotionFallback() {
  return <Skeleton className="animate-pulse" />;
}

// Lazy motion wrapper components
interface MotionProps {
  children: React.ReactNode;
  className?: string;
  [key: string]: unknown;
}

export function LazyMotionDiv({ children, className, ...props }: MotionProps) {
  return (
    <Suspense fallback={<MotionFallback />}>
      <MotionDiv className={className} {...props}>
        {children}
      </MotionDiv>
    </Suspense>
  );
}

export function LazyMotionButton({ children, className, ...props }: MotionProps) {
  return (
    <Suspense fallback={<MotionFallback />}>
      <MotionButton className={className} {...props}>
        {children}
      </MotionButton>
    </Suspense>
  );
}

export function LazyAnimatePresence({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AnimatePresence>{children}</AnimatePresence>
    </Suspense>
  );
}

// Re-export types for convenience
export type { MotionProps };