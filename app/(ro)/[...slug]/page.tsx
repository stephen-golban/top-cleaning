import { notFound } from 'next/navigation';
import { PublicSite } from '@/components/site/PublicSite';
import { metadataFor, resolvePage, staticSlugs } from '@/lib/pages';

export function generateStaticParams() {
  return staticSlugs().filter(({ slug }) => slug[0] !== 'ru');
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const page = resolvePage(`/${slug.join('/')}`);
  return page ? metadataFor(page) : {};
}

export default async function RomanianPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const page = resolvePage(`/${slug.join('/')}`);
  if (!page || page.locale !== 'ro') notFound();
  return <PublicSite page={page} />;
}
