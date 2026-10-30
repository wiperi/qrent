import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/_vercel/'],
    },
    sitemap: 'https://www.qrent.rent/sitemap.xml',
  };
}
