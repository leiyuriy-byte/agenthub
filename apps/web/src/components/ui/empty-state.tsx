'use client';

import { Button } from '@agenthub/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon, Bot, FileText, Users, Search, MessageCircle, Bell, Inbox } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm max-w-sm mb-6">{description}</p>
      )}
      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button>{action.label}</Button>
          </Link>
        ) : (
          <Button onClick={action.onClick}>{action.label}</Button>
        )
      )}
    </div>
  );
}

// Preset empty states for common scenarios
export function AgentsEmptyState({ searchQuery }: { searchQuery?: string }) {
  return (
    <EmptyState
      icon={Bot}
      title={searchQuery ? '未找到匹配的 Agent' : '暂无 Agent'}
      description={
        searchQuery
          ? `没有找到与 "${searchQuery}" 相关的 Agent，尝试其他关键词`
          : '成为第一个创建 Agent 的人吧！'
      }
      action={{
        label: searchQuery ? '清除搜索' : '创建 Agent',
        href: searchQuery ? undefined : '/agents/new',
      }}
    />
  );
}

export function PostsEmptyState({ searchQuery }: { searchQuery?: string }) {
  return (
    <EmptyState
      icon={FileText}
      title={searchQuery ? '未找到匹配的帖子' : '暂无帖子'}
      description={
        searchQuery
          ? `没有找到与 "${searchQuery}" 相关的帖子，尝试其他关键词`
          : '成为第一个发布帖子的人吧！'
      }
      action={{
        label: searchQuery ? '清除搜索' : '发布帖子',
        href: searchQuery ? undefined : '/discussions/new',
      }}
    />
  );
}

export function UsersEmptyState({ searchQuery }: { searchQuery?: string }) {
  return (
    <EmptyState
      icon={Users}
      title={searchQuery ? '未找到匹配的用户' : '暂无用户'}
      description={
        searchQuery
          ? `没有找到与 "${searchQuery}" 相关的用户`
          : '还没有用户注册'
      }
    />
  );
}

export function SearchEmptyState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={Search}
      title={`未找到 "${query}" 相关结果`}
      description="尝试使用不同的关键词或筛选类型"
      action={{
        label: '查看全部',
        href: '/agents',
      }}
    />
  );
}

export function MessagesEmptyState() {
  return (
    <EmptyState
      icon={MessageCircle}
      title="暂无私信"
      description="开始与其他人私信交流吧"
      action={{
        label: '新建对话',
        href: '/messages/new',
      }}
    />
  );
}

export function NotificationsEmptyState() {
  return (
    <EmptyState
      icon={Bell}
      title="暂无通知"
      description="当你有新的通知时，会在这里显示"
    />
  );
}

export function CommentsEmptyState() {
  return (
    <EmptyState
      icon={MessageCircle}
      title="暂无评论'
      description="成为第一个评论的人吧"
    />
  );
}

export default EmptyState;
