'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { Button } from '@agenthub/ui/button';
import { Input } from '@agenthub/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@agenthub/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

const registerSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  username: z
    .string()
    .min(3, '用户名至少 3 个字符')
    .max(20, '用户名最多 20 个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  password: z
    .string()
    .min(8, '密码至少 8 个字符')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码必须包含大写字母、小写字母和数字'),
  confirmPassword: z.string(),
  displayName: z.string().max(50, '显示名称最多 50 个字符').optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationErrors({});

    // Validate form
    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setValidationErrors(errors);
      return;
    }

    // Submit
    const success = await register({
      email: formData.email,
      username: formData.username,
      password: formData.password,
      displayName: formData.displayName || undefined,
    });

    if (success) {
      toast.success('注册成功！欢迎加入 AgentHub');
      router.push('/');
      router.refresh();
    } else {
      toast.error(error || '注册失败');
    }
  };

  const handleChange = (field: keyof RegisterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="text-center">
            <Link href="/" className="flex items-center justify-center gap-2 mb-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60" />
            </Link>
            <CardTitle className="text-2xl font-bold">创建账户</CardTitle>
            <CardDescription>加入 AgentHub 开发者社区</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  邮箱
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  disabled={isLoading}
                  className={validationErrors.email ? 'border-destructive' : ''}
                />
                {validationErrors.email && (
                  <p className="text-xs text-destructive">{validationErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">
                  用户名
                </label>
                <Input
                  id="username"
                  type="text"
                  placeholder="your_username"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value.toLowerCase())}
                  disabled={isLoading}
                  className={validationErrors.username ? 'border-destructive' : ''}
                />
                {validationErrors.username && (
                  <p className="text-xs text-destructive">{validationErrors.username}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="displayName" className="text-sm font-medium">
                  显示名称（可选）
                </label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="你的名字"
                  value={formData.displayName}
                  onChange={(e) => handleChange('displayName', e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  密码
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  disabled={isLoading}
                  className={validationErrors.password ? 'border-destructive' : ''}
                />
                {validationErrors.password && (
                  <p className="text-xs text-destructive">{validationErrors.password}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  至少 8 个字符，包含大写字母、小写字母和数字
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  确认密码
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  disabled={isLoading}
                  className={validationErrors.confirmPassword ? 'border-destructive' : ''}
                />
                {validationErrors.confirmPassword && (
                  <p className="text-xs text-destructive">{validationErrors.confirmPassword}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '注册中...' : '注册'}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                注册即表示同意我们的{' '}
                <Link href="/terms" className="underline hover:text-primary">
                  服务条款
                </Link>{' '}
                和{' '}
                <Link href="/privacy" className="underline hover:text-primary">
                  隐私政策
                </Link>
              </p>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">已有账户？</span>{' '}
              <Link
                href="/login"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                立即登录
              </Link>
            </div>

            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">或</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button variant="outline" type="button" disabled>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                    />
                  </svg>
                  GitHub
                </Button>
                <Button variant="outline" type="button" disabled>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
