import type { ReactNode } from 'react';
import type { Locale } from '@/lib/content';
import { bodyFont, displayFont } from '@/app/fonts';
import '@/app/globals.css';

export function RootDocument({ children, locale }: { children: ReactNode; locale: Locale }) {
  return (
    <html lang={locale}>
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>{children}</body>
    </html>
  );
}
