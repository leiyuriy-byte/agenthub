/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

const nextConfig = {
  basePath: '/agent-hub',
  trailingSlash: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['@agenthub/ui', '@agenthub/config', '@agenthub/validators'],
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Modular imports for better tree-shaking
  modularizeImports: {
    // Tree-shake lucide icons - only import what's used
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase name}}',
      skipDefaultConversion: true,
    },
    // Tree-shake UI components
    '@radix-ui/react-icons': {
      transform: '@radix-ui/react-icons/dist/esm/{{kebabCase name}}',
    },
  },
  
  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // Optimize Package Imports - disable framer-motion tree-shaking as it doesn't work well
    // We'll use dynamic imports instead
  },
  
  // Webpack config
  webpack: (config, { isServer }) => {
    // Alias configuration - simplified to avoid bundle bloat
    config.resolve.alias = {
      ...config.resolve.alias,
      '@agenthub/ui': path.resolve(rootDir, 'packages/ui/src'),
    };
    
    // Optimize bundle for production
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          maxSize: 200000, // Split chunks at 200KB
          cacheGroups: {
            // Separate React and related
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 40,
            },
            // Separate framer-motion - largest dependency
            framerMotion: {
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              name: 'framer-motion',
              chunks: 'async',
              priority: 30,
            },
            // Separate lucide icons
            lucide: {
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
              name: 'lucide',
              chunks: 'all',
              priority: 25,
            },
            // Separate React Query
            reactQuery: {
              test: /[\\/]node_modules[\\/]@tanstack[\\/]react-query/,
              name: 'react-query',
              chunks: 'all',
              priority: 25,
            },
            // Separate recharts
            recharts: {
              test: /[\\/]node_modules[\\/]recharts[\\/]/,
              name: 'recharts',
              chunks: 'async',
              priority: 20,
            },
            // Other vendors
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'utfs.io' },
      { protocol: 'http', hostname: 'localhost' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
    // Enable device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Headers for performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
