import { isExportGated } from '../../lib/export-gate';
import { BuilderClient } from './BuilderClient';

export const metadata = { title: 'İmza Oluşturucu — Mailmyra' };

export default function BuilderPage() {
  return <BuilderClient gated={isExportGated()} />;
}
