/**
 * API client for communicating with the backend
 */

import { toast } from 'sonner';
export { useAuthStore } from '@/stores/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown[];
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    // Load token from localStorage on client
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('agenthub_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('agenthub_token', token);
    } else {
      localStorage.removeItem('agenthub_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
          // Clear token and redirect to login
          if (typeof window !== 'undefined') {
            this.setToken(null);
            // Only redirect if not already on login/register page
            if (!window.location.pathname.includes('/login') && 
                !window.location.pathname.includes('/register')) {
              toast.error('登录已过期，请重新登录');
              setTimeout(() => {
                window.location.href = '/login';
              }, 1000);
            }
          }
        } else if (response.status === 403) {
          if (typeof window !== 'undefined') {
            toast.error('没有权限执行此操作');
          }
        } else if (response.status === 429) {
          if (typeof window !== 'undefined') {
            toast.error('请求过于频繁，请稍后再试');
          }
        }
        
        return {
          success: false,
          error: data.error || 'Request failed',
          details: data.details,
        };
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络错误，请检查您的网络连接';
      // Show toast for network errors
      if (typeof window !== 'undefined') {
        toast.error(errorMessage);
      }
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Export singleton instance
export const api = new ApiClient();

// Auth API
export const authApi = {
  register: (data: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
  }) => api.post<{ user: User; token: string }>('/api/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<{ user: User; token: string }>('/api/auth/login', data),

  logout: () => api.post('/api/auth/logout'),

  me: () => api.get<User>('/api/auth/me'),

  forgotPassword: (email: string) =>
    api.post('/api/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/api/auth/reset-password', { token, password }),
};

// Types
export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  role: string;
  level: number;
  points: number;
  isVerified: boolean;
  createdAt: string;
  stats?: {
    agentCount: number;
    postCount: number;
    followerCount: number;
    followingCount: number;
  };
  socialLinks?: { platform: string; url: string }[];
  tags?: string[];
  badges?: string[];
}

// Agent API
export interface AgentScreenshot {
  id: string;
  url: string;
  caption?: string;
  sortOrder: number;
}

export interface AgentVersion {
  id: string;
  version: string;
  changelog?: string;
  downloadUrl?: string;
  createdAt: string;
}

export interface AgentRating {
  id: string;
  overall: number;
  functionality?: number;
  usability?: number;
  documentation?: number;
  codeQuality?: number;
  design?: number;
  comment?: string;
  createdAt: string;
}

export interface Agent {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  logo?: string;
  tagline?: string;
  description?: string;
  demoUrl?: string;
  githubUrl?: string;
  docsUrl?: string;
  categoryId?: string;
  status: string;
  isFeatured: boolean;
  version: string;
  viewCount: number;
  starCount: number;
  favoriteCount: number;
  commentCount: number;
  avgRating?: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
  owner?: User;
  category?: AgentCategory;
  tags?: string[];
  // Detail page fields
  isFavorited?: boolean;
  userRating?: AgentRating | null;
  screenshots?: AgentScreenshot[];
  versions?: AgentVersion[];
}

export interface AgentCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder: number;
}

export interface AgentListResponse {
  agents: Agent[];
  total: number;
  limit: number;
  offset: number;
}

export const agentApi = {
  list: (params?: {
    limit?: number;
    offset?: number;
    categoryId?: string;
    status?: string;
    search?: string;
    sortBy?: 'createdAt' | 'viewCount' | 'starCount' | 'avgRating';
    sortOrder?: 'asc' | 'desc';
    ownerId?: string;
  }) => api.get<AgentListResponse>('/api/agents?' + new URLSearchParams(params as Record<string, string>)),

  get: (id: string) => api.get<Agent>(`/api/agents/${id}`),

  create: (data: Partial<Agent>) => api.post<Agent>('/api/agents', data),

  update: (id: string, data: Partial<Agent>) => api.put<Agent>(`/api/agents/${id}`, data),

  delete: (id: string) => api.delete(`/api/agents/${id}`),

  publish: (id: string) => api.post<Agent>(`/api/agents/${id}/publish`),

  rate: (id: string, data: { overall: number; comment?: string }) =>
    api.post(`/api/agents/${id}/rate`, data),

  favorite: (id: string) => api.post(`/api/agents/${id}/favorite`),

  unfavorite: (id: string) => api.delete(`/api/agents/${id}/favorite`),

  getCategories: () => api.get<AgentCategory[]>('/api/agents/categories'),

  getFeatured: (limit?: number) => api.get<Agent[]>(`/api/agents/featured?limit=${limit || 10}`),

  getRelated: (id: string, limit?: number) => api.get<Agent[]>(`/api/agents/${id}/related?limit=${limit || 6}`),

  getRatings: (id: string, params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>);
    return api.get<{
      stats: {
        total: number;
        average: number;
        distribution: Record<number, number>;
        dimensions: {
          functionality: number | null;
          usability: number | null;
          documentation: number | null;
          codeQuality: number | null;
          design: number | null;
        };
      };
      ratings: (AgentRating & {
        user?: User;
      })[];
    }>(`/api/agents/${id}/ratings?${query}`);
  },

  // Screenshot management
  addScreenshot: (agentId: string, data: { url: string; caption?: string }) =>
    api.post<AgentScreenshot>(`/api/agents/${agentId}/screenshots`, data),

  deleteScreenshot: (agentId: string, screenshotId: string) =>
    api.delete(`/api/agents/${agentId}/screenshots/${screenshotId}`),

  reorderScreenshots: (agentId: string, screenshotIds: string[]) =>
    api.put(`/api/agents/${agentId}/screenshots/reorder`, { screenshotIds }),
};

// Upload API
export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

export const uploadApi = {
  uploadImage: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = api.getToken();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/upload/image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }
    return data.data;
  },

  uploadAvatar: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = api.getToken();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/upload/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }
    return data.data;
  },

  deleteImage: async (filename: string): Promise<void> => {
    const token = api.getToken();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/upload/image`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Delete failed');
    }
  },
};

// Channel API
export interface Channel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  type: string;
  isDefault: boolean;
  sortOrder: number;
  postCount?: number;
  createdAt: string;
}

export const channelApi = {
  list: () => api.get<Channel[]>('/api/channels'),

  get: (id: string) => api.get<Channel>(`/api/channels/${id}`),
};

// Post API
export interface Post {
  id: string;
  authorId: string;
  channelId: string;
  title: string;
  content: string;
  type: 'normal' | 'question' | 'poll' | 'share';
  isPinned: boolean;
  isFeatured: boolean;
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  author?: User;
  channel?: Channel;
  tags?: string[];
  userVote?: number;
  isFavorited?: boolean;
}

export interface PostListResponse {
  posts: Post[];
  total: number;
  limit: number;
  offset: number;
}

export const postApi = {
  list: (params?: {
    limit?: number;
    offset?: number;
    channelId?: string;
    authorId?: string;
    search?: string;
    sortBy?: 'createdAt' | 'likeCount' | 'viewCount' | 'commentCount';
    sortOrder?: 'asc' | 'desc';
    type?: 'normal' | 'question' | 'poll' | 'share';
  }) => {
    const query = new URLSearchParams(params as Record<string, string>);
    return api.get<PostListResponse>(`/api/posts?${query}`);
  },

  get: (id: string) => api.get<Post>(`/api/posts/${id}`),

  create: (data: {
    channelId: string;
    title: string;
    content: string;
    type?: 'normal' | 'question' | 'poll' | 'share';
    tags?: string[];
  }) => api.post<Post>('/api/posts', data),

  update: (id: string, data: { title?: string; content?: string; tags?: string[] }) =>
    api.put<Post>(`/api/posts/${id}`, data),

  delete: (id: string) => api.delete(`/api/posts/${id}`),

  like: (id: string) => api.post(`/api/posts/${id}/like`),

  dislike: (id: string) => api.post(`/api/posts/${id}/dislike`),

  favorite: (id: string) => api.post(`/api/posts/${id}/favorite`),

  unfavorite: (id: string) => api.delete(`/api/posts/${id}/favorite`),

  getRecent: (limit?: number) => api.get<Post[]>(`/api/posts/recent?limit=${limit || 10}`),

  getSimilar: (id: string, limit?: number) => 
    api.get<Post[]>(`/api/posts/${id}/similar?limit=${limit || 5}`),
};

// Comment API
export interface Comment {
  id: string;
  postId: string;
  parentId?: string;
  authorId: string;
  content: string;
  isAccepted: boolean;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  author?: User;
  parent?: { id: string; authorId: string };
  children?: Comment[];
  userVote?: number;
}

export interface CommentListResponse {
  comments: Comment[];
  total: number;
  limit: number;
  offset: number;
}

export const commentApi = {
  list: (postId: string, params?: {
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'likeCount';
    sortOrder?: 'asc' | 'desc';
  }) => {
    const query = new URLSearchParams({ postId, ...params } as Record<string, string>);
    return api.get<CommentListResponse>(`/api/comments?${query}`);
  },

  get: (id: string) => api.get<Comment>(`/api/comments/${id}`),

  create: (data: {
    postId: string;
    content: string;
    parentId?: string;
  }) => api.post<Comment>('/api/comments', data),

  update: (id: string, data: { content: string }) =>
    api.put<Comment>(`/api/comments/${id}`, data),

  delete: (id: string) => api.delete(`/api/comments/${id}`),

  like: (id: string) => api.post(`/api/comments/${id}/like`),

  accept: (id: string) => api.post<Comment>(`/api/comments/${id}/accept`),
};

// User API
export const userApi = {
  get: (id: string) => api.get<User>(`/api/users/${id}`),

  getProfile: (id: string) => api.get<User>(`/api/users/${id}`),

  updateProfile: (data: { displayName?: string; bio?: string; avatar?: string }) =>
    api.put<User>('/api/users/me', data),

  getFollowers: (id: string, params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>);
    return api.get<User[]>(`/api/users/${id}/followers?${query}`);
  },

  getFollowing: (id: string, params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>);
    return api.get<User[]>(`/api/users/${id}/following?${query}`);
  },

  follow: (id: string) => api.post(`/api/users/${id}/follow`),

  unfollow: (id: string) => api.delete(`/api/users/${id}/follow`),

  getFollowStatus: (id: string) => api.get<{ isFollowing: boolean }>(`/api/users/${id}/follow-status`),
};

// Notification API
export interface Notification {
  id: string;
  userId: string;
  type: 'comment' | 'reply' | 'like' | 'follow' | 'system' | 'mention';
  title: string;
  content?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  limit: number;
  offset: number;
}

export const notificationApi = {
  list: (params?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }) => {
    const query = new URLSearchParams(params as Record<string, string>);
    return api.get<NotificationListResponse>(`/api/notifications?${query}`);
  },

  getUnreadCount: () => api.get<{ count: number }>('/api/notifications/unread-count'),

  get: (id: string) => api.get<Notification>(`/api/notifications/${id}`),

  markAsRead: (id: string) => api.put<Notification>(`/api/notifications/${id}/read`),

  markAllAsRead: () => api.put('/api/notifications/read-all'),

  delete: (id: string) => api.delete(`/api/notifications/${id}`),
};

// Message/Conversation API
export interface ConversationParticipant {
  id: string;
  userId: string;
  lastReadAt: string | null;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
}

export interface Conversation {
  id: string;
  createdAt: string;
  participants: ConversationParticipant[];
  lastMessage?: {
    id: string;
    content: string;
    type: string;
    senderId: string;
    createdAt: string;
  };
  unreadCount?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  metadata: string | null;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
}

export interface ConversationListResponse {
  conversations: Conversation[];
}

export interface MessageListResponse {
  messages: Message[];
}

export const messageApi = {
  // Conversation endpoints
  getConversations: () => api.get<ConversationListResponse>('/api/messages/conversations'),

  getConversation: (id: string) => api.get<{ conversation: Conversation }>(`/api/messages/conversations/${id}`),

  createConversation: (participantIds: string[]) =>
    api.post<{ id: string }>('/api/messages/conversations', { participantIds }),

  createDm: (userId: string) =>
    api.post<{ id: string }>(`/api/messages/dm/${userId}`),

  deleteConversation: (id: string) => api.delete(`/api/messages/conversations/${id}`),

  // Message endpoints
  getMessages: (conversationId: string, params?: { limit?: number; beforeId?: string }) => {
    const query = new URLSearchParams({ conversationId, ...params } as Record<string, string>);
    return api.get<MessageListResponse>(`/api/messages?${query}`);
  },

  sendMessage: (data: {
    conversationId: string;
    content: string;
    type?: 'text' | 'image' | 'file';
    metadata?: string;
  }) => api.post<{ id: string }>('/api/messages', data),

  markAsRead: (conversationId: string) =>
    api.post(`/api/messages/${conversationId}/read`),

  searchMessages: (query: string, limit?: number) =>
    api.get<MessageListResponse>(`/api/messages/search?q=${encodeURIComponent(query)}&limit=${limit || 20}`),

  getUnreadCount: () => api.get<{ count: number }>('/api/messages/unread/count'),
};

// Admin API
export interface AdminStats {
  totalUsers: number;
  totalAgents: number;
  totalPosts: number;
  totalComments: number;
  todayUsers: number;
  todayAgents: number;
  todayPosts: number;
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  role: string;
  level: number;
  points: number;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminAgent {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  tagline: string | null;
  status: string;
  isFeatured: boolean;
  viewCount: number;
  starCount: number;
  avgRating: number | null;
  createdAt: string;
  ownerId: string;
  owner?: {
    username: string;
    displayName: string | null;
  };
}

export interface AdminPost {
  id: string;
  title: string;
  type: string;
  isPinned: boolean;
  isFeatured: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  authorId: string;
  channelId: string;
  author?: {
    username: string;
    displayName: string | null;
  };
  channel?: {
    name: string;
    slug: string;
  };
}

export interface AdminComment {
  id: string;
  content: string;
  isAccepted: boolean;
  likeCount: number;
  createdAt: string;
  postId: string;
  authorId: string;
  author?: {
    username: string;
    displayName: string | null;
  };
  post?: {
    title: string;
  };
}

export interface AdminChannel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  type: string;
  isDefault: boolean;
  sortOrder: number;
}

// Admin Stats Types
export interface TrendData {
  date: string;
  users: number;
  agents: number;
  posts: number;
}

export interface TrendsResponse {
  trends: TrendData[];
  summary: {
    totalUsers: number;
    totalAgents: number;
    totalPosts: number;
  };
}

export interface PopularAgent {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  tagline: string | null;
  viewCount: number;
  starCount: number;
  avgRating: number | null;
  ratingCount: number;
  createdAt: string;
  ownerId: string;
  owner?: {
    username: string;
    displayName: string | null;
  };
}

export interface PopularTag {
  name: string;
  count: number;
}

export interface ActivityHour {
  hour: number;
  posts: number;
  comments: number;
  agents: number;
}

export interface OverviewStats {
  totals: {
    users: number;
    agents: number;
    posts: number;
    comments: number;
  };
  agents: {
    published: number;
    draft: number;
  };
  last30Days: {
    users: number;
    posts: number;
    comments: number;
  };
  averageRating: number;
}

// Feed API
export interface FeedItem {
  id: string;
  type: 'agent' | 'post' | 'comment';
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
  };
  data: {
    // Agent data
    agentId?: string;
    agentName?: string;
    agentTagline?: string;
    agentLogo?: string;
    // Post data
    postId?: string;
    postTitle?: string;
    postExcerpt?: string;
    channelName?: string;
    channelIcon?: string;
    // Comment data
    commentId?: string;
    commentContent?: string;
    targetType?: 'agent' | 'post';
    targetId?: string;
    targetTitle?: string;
  };
}

export interface FeedResponse {
  feed: FeedItem[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export const feedApi = {
  getFeed: (params?: {
    limit?: number;
    offset?: number;
    type?: 'following' | 'global';
  }) => {
    const query = new URLSearchParams(params as Record<string, string>);
    return api.get<FeedResponse>(`/api/feed?${query}`);
  },
};

export const adminApi = {
  // Dashboard
  getStats: () => api.get<AdminStats>('/api/admin/stats'),

  // Users
  getUsers: (params?: { limit?: number; offset?: number; search?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>);
    return api.get<{ users: AdminUser[]; total: number }>(`/api/admin/users?${query}`);
  },

  updateUserRole: (userId: string, role: string) =>
    api.put<AdminUser>(`/api/admin/users/${userId}/role`, { role }),

  deleteUser: (userId: string) => api.delete(`/api/admin/users/${userId}`),

  // Agents
  getAgents: (params?: { limit?: number; offset?: number; search?: string; status?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>);
    return api.get<{ agents: AdminAgent[]; total: number }>(`/api/admin/agents?${query}`);
  },

  updateAgentStatus: (agentId: string, status: string) =>
    api.put<AdminAgent>(`/api/admin/agents/${agentId}/status`, { status }),

  toggleAgentFeatured: (agentId: string, isFeatured: boolean) =>
    api.put<AdminAgent>(`/api/admin/agents/${agentId}/featured`, { isFeatured }),

  deleteAgent: (agentId: string) => api.delete(`/api/admin/agents/${agentId}`),

  // Posts
  getPosts: (params?: { limit?: number; offset?: number; search?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>);
    return api.get<{ posts: AdminPost[]; total: number }>(`/api/admin/posts?${query}`);
  },

  togglePostPin: (postId: string, isPinned: boolean) =>
    api.put<AdminPost>(`/api/admin/posts/${postId}/pin`, { isPinned }),

  deletePost: (postId: string) => api.delete(`/api/admin/posts/${postId}`),

  // Comments
  getComments: (params?: { limit?: number; offset?: number; search?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>);
    return api.get<{ comments: AdminComment[]; total: number }>(`/api/admin/comments?${query}`);
  },

  deleteComment: (commentId: string) => api.delete(`/api/admin/comments/${commentId}`),

  // Channels
  getChannels: () => api.get<AdminChannel[]>('/api/admin/channels'),

  // Stats - Trends
  getTrends: (days?: number) => api.get<TrendsResponse>(`/api/admin/stats/trends?days=${days || 30}`),

  // Stats - Popular Agents
  getPopularAgents: (limit?: number, sortBy?: 'views' | 'stars' | 'rating') => 
    api.get<PopularAgent[]>(`/api/admin/stats/popular-agents?limit=${limit || 10}&sortBy=${sortBy || 'views'}`),

  // Stats - Popular Tags
  getPopularTags: (limit?: number) => api.get<PopularTag[]>(`/api/admin/stats/popular-tags?limit=${limit || 20}`),

  // Stats - Activity Hours
  getActivityHours: () => api.get<ActivityHour[]>('/api/admin/stats/activity-hours'),

  // Stats - Overview
  getOverview: () => api.get<OverviewStats>('/api/admin/stats/overview'),
};

// Search API
export interface SearchAgent {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  tagline: string | null;
  status: string;
  avgRating: number | null;
  starCount: number;
  viewCount: number;
  createdAt: string;
  owner: {
    username: string;
    displayName: string | null;
  } | null;
}

export interface SearchPost {
  id: string;
  title: string;
  content: string;
  type: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  author: {
    username: string;
    displayName: string | null;
  } | null;
  channel: {
    name: string;
    slug: string;
  } | null;
}

export interface SearchUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  role: string;
  level: number;
  isVerified: boolean;
  createdAt: string;
}

export interface SearchResult {
  agents: SearchAgent[];
  posts: SearchPost[];
  users: SearchUser[];
  total: {
    agents: number;
    posts: number;
    users: number;
  };
}

export interface QuickSearchResult {
  agents: { id: string; name: string; slug: string; logo: string | null }[];
  posts: { id: string; title: string }[];
  users: { id: string; username: string; displayName: string | null; avatar: string | null }[];
}

export const searchApi = {
  search: (params: {
    q: string;
    type?: 'agents' | 'posts' | 'users' | 'all';
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams(params as Record<string, string>);
    return api.get<SearchResult>(`/api/search?${query}`);
  },

  quickSearch: (q: string, limit?: number) => {
    return api.get<QuickSearchResult>(`/api/search/quick?q=${encodeURIComponent(q)}&limit=${limit || 5}`);
  },
};

// Points & Level API
export interface UserPointsInfo {
  points: number;
  level: number;
  levelName: string;
  nextLevelPoints: number | null;
  progress: number;
  checkedInToday?: boolean;
  streak?: number;
}

export interface PointTransaction {
  id: string;
  points: number;
  reason: string;
  referenceId: string | null;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  points: number;
  level: number;
  levelName: string;
}

export interface CheckinResult {
  success: boolean;
  points?: number;
  checkedIn: boolean;
  message?: string;
  streak?: number;
}

export const pointsApi = {
  // Get current user's points info
  getMyPoints: () => api.get<UserPointsInfo>('/api/points/me'),

  // Get another user's points info
  getUserPoints: (userId: string) => api.get<UserPointsInfo>(`/api/points/users/${userId}`),

  // Daily check-in
  checkin: () => api.post<CheckinResult>('/api/points/checkin'),

  // Check if user has checked in today
  hasCheckedIn: () => api.get<{ checkedIn: boolean }>('/api/points/checked-in'),

  // Get point transaction history
  getHistory: (limit?: number, offset?: number) => {
    const query = new URLSearchParams({ limit: String(limit || 20), offset: String(offset || 0) });
    return api.get<{ transactions: PointTransaction[]; total: number }>(`/api/points/history?${query}`);
  },

  // Get leaderboard
  getLeaderboard: (type: 'total' | 'weekly' | 'monthly' = 'total', limit?: number) => {
    const query = new URLSearchParams({ type, limit: String(limit || 50) });
    return api.get<LeaderboardEntry[]>(`/api/points/leaderboard?${query}`);
  },

  // Get user's check-in streak
  getStreak: () => api.get<{ streak: number }>('/api/points/streak'),
};

// Report API
export interface Report {
  id: string;
  reporterId: string;
  reporter?: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
  targetType: 'agent' | 'post' | 'comment' | 'user';
  targetId: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected';
  reviewerId?: string | null;
  reviewer?: {
    id: string;
    username: string;
    displayName: string | null;
  };
  resolution?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  targetDetails?: {
    type: string;
    title: string;
    author?: string;
    status?: string;
    url: string;
  };
}

export interface ReportListResult {
  reports: Report[];
  total: number;
}

export const reportApi = {
  // Create a new report
  create: (data: {
    targetType: 'agent' | 'post' | 'comment' | 'user';
    targetId: string;
    reason: string;
  }) => {
    return api.post<Report>('/api/reports', data);
  },

  // Get pending report count (admin)
  getPendingCount: () => {
    return api.get<{ count: number }>('/api/reports/pending-count');
  },

  // List reports (admin)
  list: (params?: {
    limit?: number;
    offset?: number;
    status?: 'pending' | 'reviewed' | 'resolved' | 'rejected';
    targetType?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.status) query.set('status', params.status);
    if (params?.targetType) query.set('targetType', params.targetType);
    return api.get<ReportListResult>(`/api/reports?${query}`);
  },

  // Get report by ID (admin)
  getById: (id: string) => {
    return api.get<Report>(`/api/reports/${id}`);
  },

  // Resolve a report (admin)
  resolve: (id: string, data: {
    resolution: 'ignored' | 'warning' | 'deleted' | 'banned';
    targetAction?: string;
  }) => {
    return api.put<Report>(`/api/reports/${id}/resolve`, data);
  },

  // Reject a report (admin)
  reject: (id: string) => {
    return api.put<Report>(`/api/reports/${id}/reject`);
  },
};

export default api;
