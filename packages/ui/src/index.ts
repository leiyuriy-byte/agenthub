import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { cva } from 'class-variance-authority';

export * from './button';
export * from './badge';
export * from './card';
export * from './avatar';
export * from './input';
export * from './textarea';
export * from './dropdown-menu';
export * from './image-upload';
export * from './tabs';
export * from './skeleton';
