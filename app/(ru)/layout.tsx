import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { RootDocument } from '@/components/site/RootDocument';

export const metadata: Metadata = {
  metadataBase: new URL('https://topcleaning.md'),
  applicationName: 'Top Cleaning',
  icons: { icon: '/favicon.svg' },
  formatDetection: { telephone: false },
};

export default function RussianLayout({ children }: { children: ReactNode }) {
  return <RootDocument locale="ru">{children}</RootDocument>;
}
