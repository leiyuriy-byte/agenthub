'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@agenthub/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@agenthub/ui/avatar';
import { Textarea } from '@agenthub/ui/textarea';
import { Comment } from '@/lib/api';
import { formatRelativeTime, formatNumber, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import {
  ThumbsUp,
  MessageSquare,
  Trash2,
  Check,
  Loader2,
  Reply,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

interface CommentItemProps {
  comment: Comment;
  postAuthorId: string;
  onReply: (commentId: string | null, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onLike: (commentId: string) => Promise<void>;
  onAccept?: (commentId: string) => Promise<void>;
  isPostAuthor: boolean;
  isSubmitting: boolean;
}

function CommentItem({
  comment,
  postAuthorId,
  onReply,
  onDelete,
  onLike,
  onAccept,
  isPostAuthor,
  isSubmitting,
}: CommentItemProps) {
  const { user } = useAuthStore();
  const isOwner = user?.id === comment.authorId;
  const [isLiking, setIsLiking] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleLike = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    setIsLiking(true);
    try {
      await onLike(comment.id);
    } finally {
      setIsLiking(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative rounded-lg border p-4',
        comment.parentId && 'ml-8 border-l-2 border-muted pl-4',
        comment.isAccepted && 'border-green-500/30 bg-green-500/5'
      )}
    >
      {/* Accepted Answer Badge */}
      {comment.isAccepted && (
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm mb-2 font-medium">
          <Check className="h-4 w-4 fill-green-500" />
          <span>已采纳答案</span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <Link
          href={`/users/${comment.authorId}`}
          className="shrink-0"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.author?.avatar} />
            <AvatarFallback className="text-xs">
              {comment.author?.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/users/${comment.authorId}`}
              className="font-medium text-sm hover:text-primary"
            >
              {comment.author?.displayName || comment.author?.username}
            </Link>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(comment.createdAt)}
            </span>
            {comment.authorId === postAuthorId && (
              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                作者
              </span>
            )}
          </div>

          {/* Content */}
          <div className="mt-1.5 text-sm prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{comment.content}</ReactMarkdown>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            {/* Like */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground gap-1"
              onClick={handleLike}
              disabled={isLiking || isSubmitting}
            >
              {isLiking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ThumbsUp
                  className={cn(
                    'h-3.5 w-3.5',
                    comment.userVote === 1 && 'fill-current text-primary'
                  )}
                />
              )}
              {comment.likeCount > 0 && (
                <span className="text-xs">{formatNumber(comment.likeCount)}</span>
              )}
            </Button>

            {/* Reply */}
            {user && !comment.parentId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground hover:text-foreground gap-1"
                onClick={() => setShowReplyInput(!showReplyInput)}
              >
                <Reply className="h-3.5 w-3.5" />
                <span className="text-xs">回复</span>
              </Button>
            )}

            {/* Accept Answer (for Q&A, post author only) */}
            {onAccept && isPostAuthor && !comment.isAccepted && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground hover:text-green-600 gap-1"
                onClick={() => onAccept(comment.id)}
              >
                <Check className="h-3.5 w-3.5" />
                <span className="text-xs">采纳</span>
              </Button>
            )}

            {/* Delete (owner only) */}
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground hover:text-destructive gap-1"
                onClick={() => onDelete(comment.id)}
                disabled={isSubmitting}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Reply Input */}
          <AnimatePresence>
            {showReplyInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3"
              >
                <Textarea
                  placeholder={`回复 @${comment.author?.username}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="min-h-[60px] text-sm"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowReplyInput(false);
                      setReplyText('');
                    }}
                  >
                    取消
                  </Button>
                  <Button size="sm" onClick={handleReply}>
                    回复
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nested Replies */}
      {comment.children && comment.children.length > 0 && (
        <div className="mt-4 space-y-4">
          {comment.children.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postAuthorId={postAuthorId}
              onReply={onReply}
              onDelete={onDelete}
              onLike={onLike}
              onAccept={onAccept}
              isPostAuthor={isPostAuthor}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

interface CommentListProps {
  comments: Comment[];
  postAuthorId: string;
  isPostAuthor: boolean;
  isQuestion: boolean;
  onReply: (commentId: string | null, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onLike: (commentId: string) => Promise<void>;
  onAccept?: (commentId: string) => Promise<void>;
  isSubmitting: boolean;
}

export function CommentList({
  comments,
  postAuthorId,
  isPostAuthor,
  isQuestion,
  onReply,
  onDelete,
  onLike,
  onAccept,
  isSubmitting,
}: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">暂无评论，快来抢沙发吧！</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {comments.map((comment) => (
         <CommentItem
          key={comment.id}
          comment={comment}
          postAuthorId={postAuthorId}
          onReply={onReply}
          onDelete={onDelete}
          onLike={onLike}
          onAccept={isQuestion ? onAccept : undefined}
          isPostAuthor={isPostAuthor}
          isSubmitting={isSubmitting}
        />
      ))}
    </div>
  );
}

interface CommentFormProps {
  postId: string;
  parentId?: string;
  placeholder?: string;
  onSubmit: (content: string, parentId?: string) => Promise<void>;
  onCancel?: () => void;
  isSubmitting: boolean;
}

export function CommentForm({
  postId: _postId,
  parentId,
  placeholder = '写下你的评论...',
  onSubmit,
  onCancel,
  isSubmitting,
}: CommentFormProps) {
  const { user } = useAuthStore();
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await onSubmit(content, parentId);
    setContent('');
    onCancel?.();
  };

  if (!user) {
    return (
      <div className="text-center py-4 bg-muted/30 rounded-lg">
        <p className="text-muted-foreground text-sm mb-2">登录后参与评论</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Textarea
        placeholder={placeholder}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[80px]"
        disabled={isSubmitting}
      />
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          支持 Markdown 语法
        </p>
        <div className="flex gap-2">
          {onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              取消
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : null}
            {parentId ? '回复' : '发布评论'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CommentList;
