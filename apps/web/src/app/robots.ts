import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://agenthub.dev';
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/settings/',
        '/messages/',
        '/notifications/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
