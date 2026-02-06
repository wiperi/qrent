import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/app-mobile/', '/_next/', '/_vercel/', '/favicon.ico'],
    },
    sitemap: 'https://qrent.rent/sitemap.xml',
  };
}
