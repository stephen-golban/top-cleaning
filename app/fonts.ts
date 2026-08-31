import { Inter, Manrope } from 'next/font/google';

export const bodyFont = Inter({
  variable: '--font-body-source',
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
});

export const displayFont = Manrope({
  variable: '--font-display-source',
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
});
