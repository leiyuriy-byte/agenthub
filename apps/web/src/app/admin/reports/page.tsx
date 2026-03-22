'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@agenthub/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@agenthub/ui/card';
import { Badge } from '@agenthub/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@agenthub/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@agenthub/ui/tabs';
import { reportApi, Report, reportApi as reportApiModule } from '@/lib/api';
import { formatRelativeTime, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import {
  Flag,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Trash2,
  Ban,
  MessageSquare,
  Bot,
  User,
  FileText,
  Loader2,
  ExternalLink,
  Filter,
  RefreshCw,
  Shield,
  AlertCircle,
} from 'lucide-react';

interface ReportWithDetails extends Report {
  reporter?: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
  reviewer?: {
    id: string;
    username: string;
    displayName: string | null;
  };
  targetDetails?: {
    type: string;
    title: string;
    author?: string;
    status?: string;
    url: string;
  };
}

type ResolutionType = 'ignored' | 'warning' | 'deleted' | 'banned';

const statusConfig = {
  pending: { label: '待处理', icon: Clock, className: 'text-yellow-600 bg-yellow-500/20' },
  resolved: { label: '已处理', icon: CheckCircle, className: 'text-green-600 bg-green-500/20' },
  rejected: { label: '已驳回', icon: XCircle, className: 'text-gray-600 bg-gray-500/20' },
};

const targetTypeIcons = {
  agent: Bot,
  post: FileText,
  comment: MessageSquare,
  user: User,
};

export default function AdminReportsPage() {
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved' | 'rejected'>('pending');
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 20;

  // Check auth
  useEffect(() => {
    const token = localStorage.getItem('agenthub_token');
    if (!token) {
      router.push('/login');
      return;
    }
    checkAuth();
  }, [checkAuth, router]);

  // Fetch reports
  const fetchReports = useCallback(async (reset = false) => {
    if (reset) {
      setIsLoading(true);
      setPage(0);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const status = activeTab === 'pending' ? 'pending' : activeTab === 'resolved' ? 'resolved' : 'rejected';
      const response = await reportApi.list({
        limit,
        offset: reset ? 0 : page * limit,
        status,
      });

      if (response.success && response.data) {
        if (reset) {
          setReports(response.data.reports);
        } else {
          setReports((prev) => [...prev, ...response.data.reports]);
        }
        setTotal(response.data.total);
      } else {
        setError(response.error || '获取举报列表失败');
      }
    } catch {
      setError('获取举报列表失败');
    }

    setIsLoading(false);
    setIsLoadingMore(false);
  }, [activeTab, page]);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'moderator') {
      fetchReports(true);
    }
  }, [user, activeTab, fetchReports]);

  // Handle resolve
  const handleResolve = async (report: ReportWithDetails, resolution: ResolutionType) => {
    setIsProcessing(true);
    try {
      const response = await reportApi.resolve(report.id, { resolution });
      if (response.success) {
        toast.success(`已${resolution === 'ignored' ? '忽略' : resolution === 'warning' ? '发送警告' : resolution === 'deleted' ? '删除内容' : '封禁用户'}`);
        setSelectedReport(null);
        fetchReports(true);
      } else {
        toast.error(response.error || '处理失败');
      }
    } catch {
      toast.error('处理失败');
    }
    setIsProcessing(false);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge className={cn('gap-1', config.className)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Get target type icon
  const getTargetIcon = (type: string) => {
    const Icon = targetTypeIcons[type as keyof typeof targetTypeIcons] || Flag;
    return <Icon className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== 'admin' && user?.role !== 'moderator') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Shield className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">权限不足</h2>
        <p className="text-muted-foreground mb-4">您没有权限访问此页面</p>
        <Link href="/">
          <Button>返回首页</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flag className="h-6 w-6 text-red-500" />
            内容举报管理
          </h1>
          <p className="text-muted-foreground mt-1">
            共 {total} 条举报（{activeTab === 'pending' ? '待处理' : activeTab === 'resolved' ? '已处理' : '已驳回'}）
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchReports(true)}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          刷新
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            待处理
          </TabsTrigger>
          <TabsTrigger value="resolved" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            已处理
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="h-4 w-4" />
            已驳回
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Report List */}
      {error ? (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">太棒了！</h3>
            <p className="text-muted-foreground">
              {activeTab === 'pending' ? '暂无待处理的举报' : activeTab === 'resolved' ? '暂无已处理的举报' : '暂无已驳回的举报'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card
              key={report.id}
              className={cn(
                'transition-all hover:shadow-md',
                selectedReport?.id === report.id && 'ring-2 ring-primary'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Target Type Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    {getTargetIcon(report.targetType)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Target Info */}
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {report.targetType.toUpperCase()}
                          </Badge>
                          {getStatusBadge(report.status)}
                        </div>

                        {/* Target Title */}
                        {report.targetDetails && (
                          <Link
                            href={report.targetDetails.url}
                            target="_blank"
                            className="font-medium hover:text-primary transition-colors flex items-center gap-1"
                          >
                            {report.targetDetails.title}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}

                        {/* Report Reason */}
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {report.reason}
                        </p>

                        {/* Meta */}
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          {/* Reporter */}
                          {report.reporter && (
                            <div className="flex items-center gap-1">
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={report.reporter.avatar} />
                                <AvatarFallback className="text-[8px]">
                                  {report.reporter.username?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{report.reporter.displayName || report.reporter.username}</span>
                            </div>
                          )}
                          <span>举报于 {formatRelativeTime(report.createdAt)}</span>
                          {report.resolution && (
                            <span className="text-primary">
                              处理：{report.resolution}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {report.status === 'pending' && (
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedReport(report)}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            查看
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Load More */}
          {reports.length < total && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={isLoadingMore}
                className="gap-2"
              >
                {isLoadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  '加载更多'
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Process Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background rounded-xl shadow-xl max-w-lg w-full mx-4"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">处理举报</h3>

              {/* Report Details */}
              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">举报类型</p>
                  <p className="font-medium flex items-center gap-2">
                    {getTargetIcon(selectedReport.targetType)}
                    {selectedReport.targetType.toUpperCase()}
                  </p>
                </div>

                {selectedReport.targetDetails && (
                  <div>
                    <p className="text-sm text-muted-foreground">被举报内容</p>
                    <Link
                      href={selectedReport.targetDetails.url}
                      target="_blank"
                      className="font-medium hover:text-primary flex items-center gap-1"
                    >
                      {selectedReport.targetDetails.title}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">举报原因</p>
                  <p className="bg-muted p-3 rounded-lg text-sm">
                    {selectedReport.reason}
                  </p>
                </div>

                {selectedReport.reporter && (
                  <div>
                    <p className="text-sm text-muted-foreground">举报人</p>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={selectedReport.reporter.avatar} />
                        <AvatarFallback className="text-xs">
                          {selectedReport.reporter.username?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{selectedReport.reporter.displayName || selectedReport.reporter.username}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleResolve(selectedReport, 'ignored')}
                  disabled={isProcessing}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  忽略
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleResolve(selectedReport, 'warning')}
                  disabled={isProcessing}
                  className="gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  发送警告
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleResolve(selectedReport, 'deleted')}
                  disabled={isProcessing}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  删除内容
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleResolve(selectedReport, 'banned')}
                  disabled={isProcessing}
                  className="gap-2"
                >
                  <Ban className="h-4 w-4" />
                  封禁用户
                </Button>
              </div>

              {/* Cancel */}
              <Button
                variant="ghost"
                className="w-full mt-3"
                onClick={() => setSelectedReport(null)}
              >
                取消
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
