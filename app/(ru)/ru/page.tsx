import { PublicSite } from '@/components/site/PublicSite';
import { metadataFor, resolvePage } from '@/lib/pages';

const page = resolvePage('/ru')!;

export const metadata = metadataFor(page);

export default function RussianHomePage() {
  return <PublicSite page={page} />;
}
