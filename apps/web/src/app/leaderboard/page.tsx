'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@agenthub/ui/avatar';
import { Button } from '@agenthub/ui/button';
import { Card, CardContent } from '@agenthub/ui/card';
import { pointsApi, LeaderboardEntry } from '@/lib/api';
import { formatNumber, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import {
  Loader2,
  Trophy,
  Medal,
  Crown,
  Flame,
  Zap,
} from 'lucide-react';

// Level names
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

// Rank icons
const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) {
    return <Crown className="h-6 w-6 text-yellow-400" />;
  }
  if (rank === 2) {
    return <Medal className="h-6 w-6 text-gray-300" />;
  }
  if (rank === 3) {
    return <Medal className="h-6 w-6 text-amber-600" />;
  }
  return <span className="text-lg font-bold text-muted-foreground">{rank}</span>;
};

// Rank background colors
const rankBgColors: Record<number, string> = {
  1: 'bg-yellow-500/10 border-yellow-500/30',
  2: 'bg-gray-400/10 border-gray-400/30',
  3: 'bg-amber-600/10 border-amber-600/30',
};

type TabType = 'total' | 'weekly' | 'monthly';

const tabConfig: { key: TabType; label: string }[] = [
  { key: 'total', label: '总榜' },
  { key: 'weekly', label: '周榜' },
  { key: 'monthly', label: '月榜' },
];

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('total');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await pointsApi.getLeaderboard(activeTab, 50);
      if (response.success && response.data) {
        setLeaderboard(response.data);
      } else {
        setError(response.error || '加载排行榜失败');
      }
    } catch {
      setError('加载失败，请稍后重试');
    }

    setIsLoading(false);
  }, [activeTab]);

  // Fetch on mount and tab change
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Get current user rank
  const currentUserRank = leaderboard.findIndex((entry) => entry.id === user?.id) + 1;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-primary/20 via-primary/5 to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="container relative py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div class="animate-slide-up"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
              <h1 className="text-4xl font-bold mb-4">积分排行榜</h1>
              <p className="text-lg text-muted-foreground mb-6">
                看看谁是 AgentHub 最活跃的贡献者
              </p>
              
              {/* Current user rank */}
              {user && currentUserRank > 0 && (
                <Card className="inline-flex items-center gap-4 px-6 py-3 bg-card/80 backdrop-blur">
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">您的当前排名</p>
                    <p className="text-2xl font-bold">第 {currentUserRank} 名</p>
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.displayName?.charAt(0) || user.username?.charAt(0)}</AvatarFallback>
                  </Avatar>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2 mb-8">
            {tabConfig.map((tab) => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? 'default' : 'outline'}
                onClick={() => setActiveTab(tab.key)}
                className="gap-2"
              >
                {tab.key === 'weekly' && <Flame className="h-4 w-4" />}
                {tab.key === 'monthly' && <Zap className="h-4 w-4" />}
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <Card className="border-destructive/50">
              <CardContent className="py-8 text-center">
                <p className="text-destructive">{error}</p>
                <Button variant="outline" onClick={fetchLeaderboard} className="mt-4">
                  重试
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Leaderboard List */}
          {!isLoading && !error && (
            <div className="space-y-3">
              {leaderboard.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">暂无数据</p>
                  </CardContent>
                </Card>
              ) : (
                leaderboard.map((entry, index) => {
                  const rank = index + 1;
                  const isCurrentUser = entry.id === user?.id;
                  
                  return (
                    <div class="animate-slide-up"
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Link href={`/users/${entry.id}`}>
                        <Card className={cn(
                          "transition-all hover:border-primary/50 hover:shadow-md",
                          rank <= 3 && rankBgColors[rank],
                          isCurrentUser && "border-primary/50 bg-primary/5"
                        )}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              {/* Rank */}
                              <div className="w-12 flex justify-center">
                                <RankIcon rank={rank} />
                              </div>

                              {/* Avatar */}
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={entry.avatar ?? undefined} />
                                <AvatarFallback>
                                  {entry.displayName?.charAt(0) || entry.username?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>

                              {/* User Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold truncate">
                                    {entry.displayName || entry.username}
                                  </p>
                                  {isCurrentUser && (
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                      您
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded text-xs text-white font-medium",
                                    levelColors[entry.level] || levelColors[1]
                                  )}>
                                    Lv.{entry.level} {levelNames[entry.level] || '入门'}
                                  </span>
                                </div>
                              </div>

                              {/* Points */}
                              <div className="text-right">
                                <p className="text-xl font-bold">{formatNumber(entry.points)}</p>
                                <p className="text-xs text-muted-foreground">积分</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
