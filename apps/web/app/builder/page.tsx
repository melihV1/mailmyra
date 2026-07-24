import { isExportGated } from '../../lib/export-gate';
import { BuilderClient } from './BuilderClient';

export const metadata = { title: 'İmza Oluşturucu — Mailmyra' };
// isExportGated() build zamanında değil, HER İSTEKTE değerlendirilmeli:
// `next build` bu sayfayı statik olarak öndeğerlendirirse, build makinesinin
// ortam değişkeni (EXPORT_REQUIRES_AUTH) build çıktısına gömülür ve sunucu
// ortamındaki gerçek değer hiç okunmaz.
export const dynamic = 'force-dynamic';

export default function BuilderPage() {
  return <BuilderClient gated={isExportGated()} />;
}
