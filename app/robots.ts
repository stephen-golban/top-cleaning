import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/watch', '/api/'] },
    ],
    sitemap: 'https://topcleaning.md/sitemap.xml',
    host: 'https://topcleaning.md',
  };
}
