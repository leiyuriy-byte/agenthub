'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@agenthub/ui/button';
import { Card, CardContent } from '@agenthub/ui/card';
import { Badge } from '@agenthub/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@agenthub/ui/avatar';
import { userApi, postApi, agentApi, pointsApi, User, Post, Agent, UserPointsInfo } from '@/lib/api';
import { formatRelativeTime, formatNumber, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import {
  Loader2,
  UserPlus,
  UserMinus,
  Calendar,
  Link as LinkIcon,
  Star,
  MessageSquare,
  Users,
  Heart,
  Eye,
  Clock,
  Github,
  Twitter,
  Globe,
  Linkedin,
  Youtube,
  Bot,
  AlertCircle,
  Zap,
  Flame,
} from 'lucide-react';

// Level names based on level
const levelNames: Record<number, string> = {
  1: '入门',
  2: '新手',
  3: '进阶',
  4: '熟练',
  5: '专家',
  6: '资深',
  7: '大师',
  8: '传奇',
  9: '王者',
  10: '神话',
};

// Level colors
const levelColors: Record<number, string> = {
  1: 'bg-gray-500',
  2: 'bg-green-500',
  3: 'bg-blue-500',
  4: 'bg-purple-500',
  5: 'bg-yellow-500',
  6: 'bg-orange-500',
  7: 'bg-red-500',
  8: 'bg-pink-500',
  9: 'bg-cyan-500',
  10: 'bg-gradient-to-r from-yellow-400 via-red-500 to-purple-500',
};

type TabType = 'agents' | 'posts' | 'favorites';

const socialIcons: Record<string, React.ElementType> = {
  github: Github,
  twitter: Twitter,
  website: Globe,
  linkedin: Linkedin,
  youtube: Youtube,
};

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const usernameOrId = params?.id as string;
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('agents');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [pointsInfo, setPointsInfo] = useState<UserPointsInfo | null>(null);
  const [streak, setStreak] = useState(0);

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    if (!usernameOrId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await userApi.getProfile(usernameOrId);
      if (response.success && response.data) {
        setProfile(response.data as User);
        setFollowersCount(response.data.stats?.followerCount || 0);
        setFollowingCount(response.data.stats?.followingCount || 0);
      } else {
        setError(response.error || '用户未找到');
      }
    } catch {
      setError('加载失败');
    }

    setIsLoading(false);
  }, [usernameOrId]);

  // Fetch user points info
  const fetchPointsInfo = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const response = await pointsApi.getUserPoints(profile.id);
      if (response.success && response.data) {
        setPointsInfo(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch points info:', error);
    }
  }, [profile?.id]);

  // Fetch user streak
  const fetchStreak = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const response = await pointsApi.getUserPoints(profile.id);
      if (response.success && response.data) {
        // Streak is included in points info
      }
    } catch (error) {
      console.error('Failed to fetch streak:', error);
    }
  }, [profile?.id]);

  // Fetch user content based on tab
  const fetchContent = useCallback(async () => {
    if (!profile?.id) return;

    if (activeTab === 'agents') {
      const response = await agentApi.list({ ownerId: profile.id, status: 'published' });
      if (response.success && response.data) {
        setAgents(response.data.agents);
      }
    } else if (activeTab === 'posts') {
      const response = await postApi.list({ authorId: profile.id });
      if (response.success && response.data) {
        setPosts(response.data.posts);
      }
    }
  }, [activeTab, profile?.id]);

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Fetch points info when profile loads
  useEffect(() => {
    if (profile) {
      fetchPointsInfo();
    }
  }, [profile, fetchPointsInfo]);

  // Fetch content when tab changes
  useEffect(() => {
    if (profile) {
      fetchContent();
    }
  }, [fetchContent, profile]);

  // Check follow status
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!user || !profile?.id || user.id === profile.id) {
        setIsFollowing(false);
        return;
      }

      const response = await userApi.getFollowStatus(profile.id);
      if (response.success && response.data) {
        setIsFollowing(response.data.isFollowing);
      }
    };
    checkFollowStatus();
  }, [user, profile?.id]);

  // Handle follow/unfollow
  const handleFollow = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!profile?.id) return;

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        const response = await userApi.unfollow(profile.id);
        if (response.success) {
          setIsFollowing(false);
          setFollowersCount((prev) => prev - 1);
          toast.success('已取消关注');
        }
      } else {
        const response = await userApi.follow(profile.id);
        if (response.success) {
          setIsFollowing(true);
          setFollowersCount((prev) => prev + 1);
          toast.success('关注成功');
        } else {
          toast.error(response.error || '关注失败');
        }
      }
    } catch {
      toast.error('操作失败');
    }
    setIsFollowLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">用户未找到</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href="/">
          <Button variant="outline">返回首页</Button>
        </Link>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.id;

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Avatar */}
                  <Avatar className="h-24 w-24 sm:h-32 sm:w-32 shrink-0">
                    <AvatarImage src={profile.avatar} />
                    <AvatarFallback className="text-3xl sm:text-4xl">
                      {profile.displayName?.charAt(0).toUpperCase() || profile.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <h1 className="text-2xl font-bold">
                          {profile.displayName || profile.username}
                        </h1>
                        <p className="text-muted-foreground">@{profile.username}</p>
                      </div>

                      {/* Actions */}
                      {isOwnProfile ? (
                        <Link href="/settings">
                          <Button variant="outline" size="sm">
                            编辑资料
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          variant={isFollowing ? 'outline' : 'default'}
                          size="sm"
                          onClick={handleFollow}
                          disabled={isFollowLoading}
                          className="gap-1"
                        >
                          {isFollowLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : isFollowing ? (
                            <UserMinus className="h-4 w-4 mr-2" />
                          ) : (
                            <UserPlus className="h-4 w-4 mr-2" />
                          )}
                          {isFollowing ? '取消关注' : '关注'}
                        </Button>
                      )}
                    </div>

                    {/* Bio */}
                    {profile.bio && (
                      <p className="mt-3 text-sm text-muted-foreground">{profile.bio}</p>
                    )}

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatRelativeTime(profile.createdAt)} 加入
                      </span>
                    </div>

                    {/* Social Links */}
                    {profile.socialLinks && profile.socialLinks.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {profile.socialLinks.map((link) => {
                          const Icon = socialIcons[link.platform] || LinkIcon;
                          return (
                            <a
                              key={link.platform}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Icon className="h-4 w-4" />
                              <span className="capitalize">{link.platform}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}

                    {/* Tags */}
                    {profile.tags && profile.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {profile.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Level & Points Card */}
            {(pointsInfo || profile.points > 0) && (
              <Card className="mb-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Level Badge */}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg",
                        levelColors[profile.level] || levelColors[1]
                      )}>
                        {profile.level}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">等级</p>
                        <p className="font-semibold text-lg">
                          {levelNames[profile.level] || '入门'}
                        </p>
                      </div>
                    </div>

                    {/* Points */}
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      <div className="text-left">
                        <p className="text-sm text-muted-foreground">积分</p>
                        <p className="font-bold text-xl">{formatNumber(profile.points || 0)}</p>
                      </div>
                    </div>

                    {/* Progress to next level */}
                    {pointsInfo && pointsInfo.nextLevelPoints && (
                      <div className="flex-1 max-w-xs">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>距离下一级</span>
                          <span>{pointsInfo.nextLevelPoints - profile.points} 积分</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
                            style={{ width: `${pointsInfo.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Streak */}
                    {pointsInfo && pointsInfo.streak !== undefined && pointsInfo.streak > 0 && (
                      <div className="flex items-center gap-2">
                        <Flame className="h-5 w-5 text-orange-500" />
                        <div className="text-left">
                          <p className="text-xs text-muted-foreground">连续签到</p>
                          <p className="font-bold">{pointsInfo.streak} 天</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-4 gap-4 mb-6">
              <Card className="text-center">
                <CardContent className="p-4">
                  <Bot className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{formatNumber(profile.stats?.agentCount || 0)}</p>
                  <p className="text-xs text-muted-foreground">Agents</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-4">
                  <MessageSquare className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{formatNumber(profile.stats?.postCount || 0)}</p>
                  <p className="text-xs text-muted-foreground">帖子</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-4">
                  <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{formatNumber(followersCount)}</p>
                  <p className="text-xs text-muted-foreground">粉丝</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-4">
                  <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{formatNumber(followingCount)}</p>
                  <p className="text-xs text-muted-foreground">关注</p>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex border-b mb-6">
              {[
                { key: 'agents' as TabType, label: 'Agents', icon: Bot },
                { key: 'posts' as TabType, label: '帖子', icon: MessageSquare },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                      activeTab === tab.key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            {activeTab === 'agents' && (
              <div className="grid gap-4 sm:grid-cols-2">
                {agents.length === 0 ? (
                  <div className="col-span-2 flex h-64 flex-col items-center justify-center text-center">
                    <Bot className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">还没有发布 Agent</p>
                  </div>
                ) : (
                  agents.map((agent) => (
                    <Link key={agent.id} href={`/agents/${agent.id}`}>
                      <Card className="transition-all hover:border-primary/50 hover:shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                              {agent.logo ? (
                                <Image src={agent.logo} alt={agent.name} fill className="object-cover" sizes="48px" />
                              ) : (
                                <span className="text-xl font-bold text-primary">
                                  {agent.name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{agent.name}</h3>
                              {agent.tagline && (
                                <p className="text-sm text-muted-foreground truncate">{agent.tagline}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-yellow-500" />
                                  {formatNumber(agent.starCount || 0)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  {formatNumber(agent.viewCount || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            )}

            {activeTab === 'posts' && (
              <div className="space-y-3">
                {posts.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">还没有发布帖子</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <Link key={post.id} href={`/discussions/${post.id}`}>
                      <Card className="transition-all hover:border-primary/50 hover:shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {post.channel && (
                                  <Badge variant="secondary" className="text-xs">
                                    {post.channel.icon} {post.channel.name}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-semibold mt-1 truncate">{post.title}</h3>
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatRelativeTime(post.createdAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Heart className="h-3 w-3" />
                                  {formatNumber(post.likeCount)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  {formatNumber(post.commentCount)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
