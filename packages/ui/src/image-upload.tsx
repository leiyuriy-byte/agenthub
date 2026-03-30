'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, GripVertical } from 'lucide-react';
import { cn } from './index';

interface ImageUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'auto';
}

interface ScreenshotItem {
  id: string;
  url: string;
  caption?: string;
}

interface ScreenshotsUploadProps {
  value?: ScreenshotItem[];
  onChange?: (screenshots: ScreenshotItem[]) => void;
  max?: number;
  disabled?: boolean;
  className?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Single image upload component with drag & drop
 */
export function ImageUpload({
  value,
  onChange,
  disabled = false,
  placeholder = '点击或拖拽上传图片',
  className,
  aspectRatio = 'square',
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('agenthub_token');
  };

  const uploadFile = async (file: File): Promise<string> => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('只支持 JPG、PNG、WebP、GIF 格式');
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('文件大小不能超过 2MB');
    }

    const formData = new FormData();
    formData.append('file', file);

    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/upload/image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '上传失败');
    }

    return data.data.url;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (!file) return;

    await handleFile(file);
  }, [disabled]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFile(file);
  };

  const handleFile = async (file: File) => {
    setError(null);
    setIsUploading(true);

    try {
      const url = await uploadFile(file);
      onChange?.(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      inputRef.current?.click();
    }
  };

  const handleRemove = () => {
    if (!disabled) {
      onChange?.('');
    }
  };

  const aspectRatioClass = {
    square: 'aspect-square',
    video: 'aspect-video',
    auto: '',
  }[aspectRatio];

  return (
    <div className={cn('space-y-2', className)}>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg transition-all cursor-pointer',
          aspectRatioClass,
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          disabled && 'opacity-50 cursor-not-allowed',
          !value && 'flex items-center justify-center min-h-[120px]'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">上传中...</span>
          </div>
        ) : value ? (
          <div className="relative w-full h-full">
            <img
              src={value}
              alt="Uploaded"
              className="w-full h-full object-cover rounded-lg"
            />
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground p-4">
            <Upload className="h-8 w-8" />
            <span className="text-sm text-center">{placeholder}</span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

/**
 * Multiple screenshots upload component
 */
export function ScreenshotsUpload({
  value = [],
  onChange,
  max = 5,
  disabled = false,
  className,
}: ScreenshotsUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('agenthub_token');
  };

  const uploadFile = async (file: File): Promise<string> => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('只支持 JPG、PNG、WebP、GIF 格式');
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new Error('文件大小不能超过 2MB');
    }

    const formData = new FormData();
    formData.append('file', file);

    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/upload/image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '上传失败');
    }

    return data.data.url;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && value.length < max) {
      setIsDragging(true);
    }
  }, [disabled, value.length, max]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || value.length >= max) return;

    const files = Array.from(e.dataTransfer.files).slice(0, max - value.length);
    await handleFiles(files);
  }, [disabled, value.length, max]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, max - value.length);
    await handleFiles(files);
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setError(null);
    setIsUploading(true);

    try {
      const newScreenshots: ScreenshotItem[] = [];

      for (let i = 0; i < files.length; i++) {
        setUploadingIndex(value.length + i);
        const file = files[i] as File; // Safe: index bounds checked by for loop
        const url = await uploadFile(file);
        newScreenshots.push({
          id: `temp_${Date.now()}_${i}`,
          url,
        });
      }

      onChange?.([...value, ...newScreenshots]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setIsUploading(false);
      setUploadingIndex(null);
    }
  };

  const handleRemove = (index: number) => {
    if (disabled) return;
    const newScreenshots = value.filter((_, i) => i !== index);
    onChange?.(newScreenshots);
  };

  const canAddMore = value.length < max && !disabled;

  return (
    <div className={cn('space-y-4', className)}>
      <div
        onClick={() => canAddMore && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg transition-all cursor-pointer p-4',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          (!canAddMore || isUploading) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFileSelect}
          disabled={!canAddMore || isUploading}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">上传中...</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8" />
              <span className="text-sm">
                {value.length >= max
                  ? `已达最大数量 (${max}张)`
                  : `点击或拖拽上传截图 (${value.length}/${max})`}
              </span>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Screenshot grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {value.map((screenshot, index) => (
            <div
              key={screenshot.id}
              className="relative group aspect-video rounded-lg overflow-hidden border bg-muted"
            >
              <img
                src={screenshot.url}
                alt={`Screenshot ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="p-2 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 text-xs text-white">
                    {index + 1}
                  </div>
                </>
              )}
              {isUploading && uploadingIndex === index && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
