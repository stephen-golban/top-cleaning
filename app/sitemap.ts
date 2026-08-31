import type { MetadataRoute } from 'next';
import { routes } from '@/lib/content';
import { publicPages } from '@/lib/pages';

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPages.map((page) => ({
    url: `https://topcleaning.md${routes[page.routeId][page.locale]}`,
    changeFrequency: page.kind === 'home' ? 'weekly' : 'monthly',
    priority: page.kind === 'home' ? 1 : page.kind === 'service' ? 0.8 : 0.7,
    alternates: {
      languages: {
        ro: `https://topcleaning.md${routes[page.routeId].ro}`,
        ru: `https://topcleaning.md${routes[page.routeId].ru}`,
      },
    },
  }));
}
