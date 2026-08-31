import { PublicSite } from '@/components/site/PublicSite';
import { metadataFor, resolvePage } from '@/lib/pages';

const page = resolvePage('/')!;

export const metadata = metadataFor(page);

export default function RomanianHomePage() {
  return <PublicSite page={page} />;
}
