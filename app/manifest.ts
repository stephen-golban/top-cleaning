import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Top Cleaning',
    short_name: 'Top Cleaning',
    description: 'Servicii profesionale de curățenie în Chișinău.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#007aff',
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
