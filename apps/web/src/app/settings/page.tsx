'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { Button } from '@agenthub/ui/button';
import { Input } from '@agenthub/ui/input';
import { Textarea } from '@agenthub/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@agenthub/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@agenthub/ui/avatar';
import { Badge } from '@agenthub/ui/badge';
import { userApi, authApi, User } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  User as UserIcon,
  Mail,
  Lock,
  Globe,
  Twitter,
  Github,
  Linkedin,
  Youtube,
  ImageIcon,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

// Validation schemas
const profileSchema = z.object({
  displayName: z.string().min(1, '昵称不能为空').max(50, '昵称不能超过50字符').optional(),
  bio: z.string().max(500, '个人简介不能超过500字符').optional(),
  avatar: z.string().url('请输入有效的 URL').optional().or(z.literal('')),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码'),
  newPassword: z.string()
    .min(8, '密码至少8个字符')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码必须包含大小写字母和数字'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

const socialPlatforms = [
  { key: 'github', label: 'GitHub', icon: Github },
  { key: 'twitter', label: 'Twitter', icon: Twitter },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { key: 'youtube', label: 'YouTube', icon: Youtube },
  { key: 'website', label: 'Website', icon: Globe },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, checkAuth, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Profile form
  const [profileData, setProfileData] = useState<ProfileFormData>({
    displayName: '',
    bio: '',
    avatar: '',
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  // Password form
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // Social links
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Load user data
  useEffect(() => {
    if (user) {
      setProfileData({
        displayName: user.displayName || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
      });
      // Load social links from user data
      const links: Record<string, string> = {};
      user.socialLinks?.forEach((link) => {
        links[link.platform] = link.url;
      });
      setSocialLinks(links);
    }
  }, [user]);

  // Save profile
  const handleSaveProfile = async () => {
    const result = profileSchema.safeParse(profileData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setProfileErrors(errors);
      return;
    }
    setProfileErrors({});

    setIsLoading(true);
    try {
      const response = await userApi.updateProfile({
        displayName: profileData.displayName,
        bio: profileData.bio,
        avatar: profileData.avatar,
      });

      if (response.success && response.data) {
        // Update local auth store
        useAuthStore.setState({ user: { ...user!, ...response.data } });
        setIsSaved(true);
        toast.success('个人资料已更新');
        setTimeout(() => setIsSaved(false), 2000);
      } else {
        toast.error(response.error || '保存失败');
      }
    } catch {
      toast.error('保存失败');
    }
    setIsLoading(false);
  };

  // Save social link
  const handleSaveSocialLink = async (platform: string, url: string) => {
    if (!url) {
      toast.error('请输入链接地址');
      return;
    }

    setIsLoading(true);
    try {
      // Add social link via API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users/me/social-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('agenthub_token')}`,
        },
        body: JSON.stringify({ platform, url }),
      });

      if (response.ok) {
        setSocialLinks((prev) => ({ ...prev, [platform]: url }));
        toast.success('社交链接已添加');
      } else {
        const data = await response.json();
        toast.error(data.error || '保存失败');
      }
    } catch {
      toast.error('保存失败');
    }
    setIsLoading(false);
  };

  // Remove social link
  const handleRemoveSocialLink = async (platform: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users/me/social-links/${platform}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('agenthub_token')}`,
        },
      });

      if (response.ok) {
        setSocialLinks((prev) => {
          const newLinks = { ...prev };
          delete newLinks[platform];
        });
        toast.success('社交链接已移除');
      } else {
        toast.error('移除失败');
      }
    } catch {
      toast.error('移除失败');
    }
    setIsLoading(false);
  };

  // Change password
  const handleChangePassword = async () => {
    const result = passwordSchema.safeParse(passwordData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setPasswordErrors(errors);
      return;
    }
    setPasswordErrors({});

    setIsPasswordLoading(true);
    try {
      // TODO: Implement change password API
      toast.info('密码修改功能即将上线');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      toast.error('修改失败');
    }
    setIsPasswordLoading(false);
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    toast.success('已退出登录');
    router.push('/');
    router.refresh();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">设置</h1>
            <p className="mt-2 text-muted-foreground">管理你的账户和个人资料</p>
          </div>

          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                个人资料
              </CardTitle>
              <CardDescription>编辑你的公开个人资料信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Preview */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profileData.avatar} />
                  <AvatarFallback className="text-xl">
                    {profileData.displayName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">头像 URL</label>
                  <Input
                    placeholder="https://example.com/avatar.jpg"
                    value={profileData.avatar}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, avatar: e.target.value }))}
                    className={profileErrors.avatar ? 'border-destructive' : ''}
                  />
                  {profileErrors.avatar && (
                    <p className="text-xs text-destructive">{profileErrors.avatar}</p>
                  )}
                </div>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">昵称</label>
                <Input
                  placeholder="你的昵称"
                  value={profileData.displayName}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, displayName: e.target.value }))}
                  className={profileErrors.displayName ? 'border-destructive' : ''}
                />
                {profileErrors.displayName && (
                  <p className="text-xs text-destructive">{profileErrors.displayName}</p>
                )}
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="text-sm font-medium">个人简介</label>
                <Textarea
                  placeholder="介绍一下你自己..."
                  value={profileData.bio}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, bio: e.target.value }))}
                  className={cn('min-h-[120px]', profileErrors.bio ? 'border-destructive' : '')}
                />
                {profileErrors.bio && (
                  <p className="text-xs text-destructive">{profileErrors.bio}</p>
                )}
                <p className="text-xs text-muted-foreground text-right">
                  {profileData.bio?.length || 0}/500
                </p>
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" /> 邮箱
                </label>
                <Input value={user.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">邮箱地址不可更改</p>
              </div>

              {/* Username (read-only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">用户名</label>
                <Input value={`@${user.username}`} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">用户名不可更改</p>
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-4">
                <Button onClick={handleSaveProfile} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : isSaved ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : null}
                  {isSaved ? '已保存' : '保存更改'}
                </Button>
                {isSaved && (
                  <span className="text-sm text-green-500 flex items-center gap-1">
                    <Check className="h-4 w-4" /> 保存成功
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Social Links Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                社交链接
              </CardTitle>
              <CardDescription>添加你的社交媒体链接</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {socialPlatforms.map((platform) => {
                const Icon = platform.icon;
                const hasLink = !!socialLinks[platform.key];
                return (
                  <div key={platform.key} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{platform.label}</p>
                      {hasLink && (
                        <a
                          href={socialLinks[platform.key]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                        >
                          {socialLinks[platform.key]}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {hasLink ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveSocialLink(platform.key)}
                          disabled={isLoading}
                        >
                          移除
                        </Button>
                      ) : (
                        <Input
                          placeholder="https://..."
                          className="w-64"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const value = (e.target as HTMLInputElement).value;
                              handleSaveSocialLink(platform.key, value);
                            }
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Security Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                安全设置
              </CardTitle>
              <CardDescription>管理你的账户安全</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium">当前密码</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  className={passwordErrors.currentPassword ? 'border-destructive' : ''}
                />
                {passwordErrors.currentPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.currentPassword}</p>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium">新密码</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                  className={passwordErrors.newPassword ? 'border-destructive' : ''}
                />
                {passwordErrors.newPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.newPassword}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  至少8个字符，包含大小写字母和数字
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium">确认新密码</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  className={passwordErrors.confirmPassword ? 'border-destructive' : ''}
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.confirmPassword}</p>
                )}
              </div>

              <Button onClick={handleChangePassword} disabled={isPasswordLoading}>
                {isPasswordLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                修改密码
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                危险区域
              </CardTitle>
              <CardDescription>以下操作不可撤销</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">退出登录</p>
                  <p className="text-sm text-muted-foreground">从所有设备退出登录</p>
                </div>
                <Button variant="destructive" onClick={handleLogout}>
                  退出登录
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
