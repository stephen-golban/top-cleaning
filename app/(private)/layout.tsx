import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { RootDocument } from '@/components/site/RootDocument';

export const metadata: Metadata = {
  metadataBase: new URL('https://topcleaning.md'),
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
  icons: { icon: '/favicon.svg' },
};

export default function PrivateLayout({ children }: { children: ReactNode }) {
  return <RootDocument locale="ro">{children}</RootDocument>;
}
