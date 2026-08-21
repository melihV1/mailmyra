import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { getPlatformTelemetry, getProductAnalyticsAdmin, NotStaffError } from '../../../../lib/repo/admin';
import type { MailDeliveryRow, JobRow, ErrorGroupRow, PlatformOperationsSnapshot, PlatformTelemetrySnapshot } from '../../platform-operations-model';
import { AdminPageHeader } from '../../ui/AdminPageHeader';
import { RefreshButton } from '../../ui/RefreshButton';

export async function PlatformPage({ path, crumb, title, support, render }: { path: string; crumb: string; title: string; support: string; render: (source: PlatformOperationsSnapshot) => ReactNode }) {
  const session = await currentSession();
  if (!session) redirect(`/login?next=${path}`);
  try {
    const [product, telemetry] = await Promise.all([
      getProductAnalyticsAdmin(session.user.id),
      // Yedi defterin tamamı gerçek kaynaktan; sağlık probu olmayan servisler
      // dürüstçe 'unknown' döner (repo yorumuna bak).
      getPlatformTelemetry(session.user.id),
    ]);
    /* DB kolonları serbest varchar, görünüm modeli katı birlik — bilinmeyen
       değer sessizce YENİ bir anlam kazanmasın diye burada daraltılır. */
    const asMailKind = (v: string): MailDeliveryRow['kind'] =>
      v === 'verification' || v === 'invitation' || v === 'support' ? v : 'notification';
    const asJobState = (v: string): JobRow['state'] =>
      v === 'running' || v === 'complete' || v === 'failed' || v === 'retrying' ? v : 'queued';
    const asSeverity = (v: string): ErrorGroupRow['severity'] =>
      v === 'critical' || v === 'warning' ? v : 'error';
    const asErrorState = (v: string): ErrorGroupRow['state'] =>
      v === 'investigating' || v === 'resolved' ? v : 'open';

    const narrowed: PlatformTelemetrySnapshot = {
      services: telemetry.services,
      mail: telemetry.mail.map((m) => ({
        ...m,
        kind: asMailKind(m.kind),
        state: m.state === 'delivered' ? 'delivered' : 'failed',
      })),
      exports: telemetry.exports,
      jobs: telemetry.jobs.map((j) => ({ ...j, state: asJobState(j.state) })),
      errors: telemetry.errors.map((e) => ({
        ...e,
        severity: asSeverity(e.severity),
        state: asErrorState(e.state),
      })),
      releases: telemetry.releases,
      flags: telemetry.flags,
    };
    const source: PlatformOperationsSnapshot = { product, telemetry: narrowed };
    return <section><AdminPageHeader crumb={crumb} title={title} support={support} right={<RefreshButton />} />{render(source)}</section>;
  } catch (error) {
    if (error instanceof NotStaffError) redirect('/app');
    throw error;
  }
}
