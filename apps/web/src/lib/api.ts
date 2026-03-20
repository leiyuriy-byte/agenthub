/**
 * API client for communicating with the backend
 */

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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
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

export default api;
