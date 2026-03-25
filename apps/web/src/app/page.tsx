import type { Metadata } from 'next';
import { agentApi, postApi } from '@/lib/api';
import { HomeClient } from './home-client';

// Server Component - 在服务端获取数据
export const metadata: Metadata = {
  title: 'AgentHub - AI Agent 开发者交流社区',
  description: '面向 AI Agent 开发者、研究者和爱好者的综合性社区平台',
};

// API Base URL - 服务端调用
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchApi<T>(endpoint: string): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      // 服务端请求添加超时
      signal: AbortSignal.timeout(10000),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`Failed to fetch ${endpoint}:`, error);
    return null as T;
  }
}

async function getHomeData() {
  try {
    const [featuredRes, categoriesRes, postsRes] = await Promise.all([
      fetchApi<{ success: boolean; data?: any[] }>('/api/agents/featured?limit=6'),
      fetchApi<{ success: boolean; data?: any[] }>('/api/agents/categories'),
      fetchApi<{ success: boolean; data?: { posts: any[] } }>('/api/posts?limit=4&sortBy=likeCount&sortOrder=desc'),
    ]);

    return {
      featuredAgents: featuredRes?.success ? featuredRes.data || [] : [],
      categories: categoriesRes?.success ? categoriesRes.data || [] : [],
      hotPosts: postsRes?.success ? postsRes.data?.posts || [] : [],
    };
  } catch (error) {
    console.error('Failed to fetch home data:', error);
    return {
      featuredAgents: [],
      categories: [],
      hotPosts: [],
    };
  }
}

export default async function HomePage() {
  // 在服务端获取数据
  const { featuredAgents, categories, hotPosts } = await getHomeData();

  // 传递给客户端组件
  return (
    <HomeClient 
      initialFeaturedAgents={featuredAgents}
      initialCategories={categories}
      initialHotPosts={hotPosts}
    />
  );
}
