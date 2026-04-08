'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@agenthub/ui/button';
import { Textarea } from '@agenthub/ui/textarea';
import {
  Bold,
  Italic,
  Code,
  Link,
  Image,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Eye,
  Edit3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import 'highlight.js/styles/github-dark.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  error?: boolean;
}

interface ToolbarButton {
  icon: React.ElementType;
  label: string;
  action: () => void;
  shortcut?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = '使用 Markdown 格式编写内容...',
  minHeight = '300px',
  className,
  error = false,
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Insert text at cursor position
  const insertText = useCallback(
    (before: string, after: string = '', placeholder: string = '') => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end) || placeholder;

      const newText =
        value.substring(0, start) +
        before +
        selectedText +
        after +
        value.substring(end);

      onChange(newText);

      // Set cursor position after insertion
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + before.length + selectedText.length;
        textarea.setSelectionRange(
          start + before.length,
          newCursorPos
        );
      }, 0);
    },
    [value, onChange]
  );

  // Toolbar actions
  const toolbarActions: ToolbarButton[] = [
    {
      icon: Heading2,
      label: '标题',
      action: () => insertText('\n## ', '\n', '标题'),
    },
    {
      icon: Bold,
      label: '粗体',
      action: () => insertText('**', '**', '粗体文字'),
      shortcut: 'Ctrl+B',
    },
    {
      icon: Italic,
      label: '斜体',
      action: () => insertText('*', '*', '斜体文字'),
      shortcut: 'Ctrl+I',
    },
    {
      icon: Code,
      label: '行内代码',
      action: () => insertText('`', '`', '代码'),
    },
    {
      icon: Link,
      label: '链接',
      action: () => insertText('[', '](https://)', '链接文字'),
      shortcut: 'Ctrl+K',
    },
    {
      icon: Image,
      label: '图片',
      action: () => insertText('![', '](https://)', '图片描述'),
    },
    {
      icon: List,
      label: '无序列表',
      action: () => insertText('\n- ', '\n', '列表项'),
    },
    {
      icon: ListOrdered,
      label: '有序列表',
      action: () => insertText('\n1. ', '\n', '列表项'),
    },
    {
      icon: Quote,
      label: '引用',
      action: () => insertText('\n> ', '\n', '引用内容'),
    },
  ];

  // Keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          insertText('**', '**', '粗体文字');
          break;
        case 'i':
          e.preventDefault();
          insertText('*', '*', '斜体文字');
          break;
        case 'k':
          e.preventDefault();
          insertText('[', '](https://)', '链接文字');
          break;
        default:
          break;
      }
    }

    // Handle Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      insertText('  ', '', '');
    }
  };

  return (
    <div className={cn('border rounded-lg overflow-hidden', error && 'border-destructive', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-1">
          {toolbarActions.map((button) => {
            const Icon = button.icon;
            return (
              <button
                key={button.label}
                type="button"
                onClick={button.action}
                className="p-2 rounded hover:bg-muted transition-colors"
                title={`${button.label}${button.shortcut ? ` (${button.shortcut})` : ''}`}
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={showPreview ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-1"
          >
            {showPreview ? (
              <>
                <Edit3 className="h-4 w-4" />
                编辑
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                预览
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Editor / Preview */}
      {showPreview ? (
        <div className="p-4 overflow-auto bg-muted/20" style={{ minHeight }}>
          {value ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight, rehypeSanitize]}
              >
                {value}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm italic">预览为空</p>
          )}
        </div>
      ) : (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'border-0 rounded-none focus:ring-0 resize-none font-mono text-sm',
            error && 'border-destructive'
          )}
          style={{ minHeight }}
        />
      )}

      {/* Footer hint */}
      <div className="px-3 py-2 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground">
          支持 Markdown 语法 • Ctrl+B 粗体 • Ctrl+I 斜体 • Ctrl+K 链接
        </p>
      </div>
    </div>
  );
}

export default MarkdownEditor;
