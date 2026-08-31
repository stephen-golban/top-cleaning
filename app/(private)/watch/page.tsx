import type { Metadata } from 'next';
import { WatchClient } from './WatchClient';

export const metadata: Metadata = {
  title: 'Videoclip privat | Top Cleaning',
  description: 'Material privat Top Cleaning.',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

export default function WatchPage() {
  return <WatchClient />;
}
