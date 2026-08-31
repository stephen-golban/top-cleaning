import { notFound } from 'next/navigation';
import { PublicSite } from '@/components/site/PublicSite';
import { metadataFor, publicPages, resolvePage } from '@/lib/pages';
import { routes } from '@/lib/content';

export function generateStaticParams() {
  return publicPages
    .filter((page) => page.locale === 'ru' && routes[page.routeId].ru !== '/ru')
    .map((page) => ({ slug: routes[page.routeId].ru.replace(/^\/ru\/?/, '').split('/') }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const page = resolvePage(`/ru/${slug.join('/')}`);
  return page ? metadataFor(page) : {};
}

export default async function RussianPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const page = resolvePage(`/ru/${slug.join('/')}`);
  if (!page || page.locale !== 'ru') notFound();
  return <PublicSite page={page} />;
}
