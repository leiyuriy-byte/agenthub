import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn - 合并 className 的工具函数
 * 
 * 使用 clsx 和 tailwind-merge 来智能合并 className
 * 支持 tailwind 的冲突解决
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
