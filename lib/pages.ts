import type { Metadata } from 'next';
import {
  business,
  content,
  routes,
  serviceIds,
  type Locale,
  type RouteId,
  type ServiceId,
} from './content';

export type PublicPage = {
  locale: Locale;
  routeId: RouteId;
  kind: 'home' | 'services' | 'service' | 'about' | 'contact';
  serviceId?: ServiceId;
};

const pageEntries: PublicPage[] = (['ro', 'ru'] as const).flatMap((locale) => [
  { locale, routeId: 'home', kind: 'home' },
  { locale, routeId: 'services', kind: 'services' },
  ...serviceIds.map((serviceId) => ({
    locale,
    routeId: serviceId,
    kind: 'service' as const,
    serviceId,
  })),
  { locale, routeId: 'about', kind: 'about' },
  { locale, routeId: 'contact', kind: 'contact' },
]) as PublicPage[];

export function resolvePage(pathname: string): PublicPage | undefined {
  const normalized = pathname === '/' ? '/' : `/${pathname.replace(/^\/+|\/+$/g, '')}`;
  return pageEntries.find((entry) => routes[entry.routeId][entry.locale] === normalized);
}

export function staticSlugs() {
  return pageEntries
    .filter((entry) => routes[entry.routeId][entry.locale] !== '/')
    .map((entry) => ({ slug: routes[entry.routeId][entry.locale].slice(1).split('/') }));
}

function pageSeo(page: PublicPage) {
  const localized = content[page.locale];
  if (page.kind === 'service' && page.serviceId) {
    const service = localized.services.items[page.serviceId];
    const place = page.locale === 'ro' ? 'în Chișinău' : 'в Кишинёве';
    return {
      title: `${service.name} ${place} | Top Cleaning`,
      description: service.description,
    };
  }
  if (page.kind === 'contact') return localized.seo.contact;
  if (page.kind === 'services') return localized.seo.services;
  if (page.kind === 'about') return localized.seo.about;
  return localized.seo.home;
}

export function metadataFor(page: PublicPage): Metadata {
  const seo = pageSeo(page);
  const canonicalPath = routes[page.routeId][page.locale];
  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: canonicalPath,
      languages: {
        ro: routes[page.routeId].ro,
        ru: routes[page.routeId].ru,
        'x-default': routes[page.routeId].ro,
      },
    },
    openGraph: {
      type: 'website',
      locale: page.locale === 'ro' ? 'ro_MD' : 'ru_MD',
      url: canonicalPath,
      siteName: business.name,
      title: seo.title,
      description: seo.description,
      images: [{ url: '/og-top-cleaning.jpg', width: 1200, height: 630, alt: 'Top Cleaning — curățenie profesionistă în Chișinău' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: ['/og-top-cleaning.jpg'],
    },
  };
}

export const publicPages = pageEntries;
