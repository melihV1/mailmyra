import { redirect } from 'next/navigation';

import { can } from '@mailmyra/core';
import { currentSession } from '../../../../lib/auth/current';
import { listSenders, primaryOrgId, roleFor, seatSummary } from '../../../../lib/repo/senders';
import { AddSenderForm } from './AddSenderForm';
import { ImportCsv } from './ImportCsv';
import { SenderTable } from './SenderTable';
import styles from './senders.module.css';

export const metadata = { title: 'Senders — Mailmyra' };

/**
 * Koltuk muhasebesinin görüldüğü yer (panel-brief §2.6). Gösterge her zaman
 * üstte; %80'de uyarı tonu, %100'de yayına alma pasifleşir ve açıklanır —
 * düğme gizlenmez.
 */
export default async function SendersPage() {
  // Layout korumasına GÜVENME: App Router layout ile sayfayı paralel render
  // edebiliyor; layout redirect'e karar verirken sayfa null oturumla çalışır
  // (canlıda 500 olarak görüldü, 2026-08-11).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/senders');
  const [seats, senders] = await Promise.all([
    seatSummary(session.user.id),
    listSenders(session.user.id),
  ]);

  const orgId = await primaryOrgId(session.user.id);
  const role = orgId ? await roleFor(session.user.id, orgId) : null;
  const showExport = Boolean(role && can(role, 'signature:export'));

  const pct = seats.entitled > 0 ? Math.min(100, (seats.active / seats.entitled) * 100) : 0;
  const full = seats.active >= seats.entitled;
  const warn = !full && pct >= 80;

  return (
    <section>
      <header className={styles.head}>
        <h1 className={styles.title}>Senders</h1>
      </header>

      <div className={styles.meter} role="status">
        <span className={styles.meterText}>
          <strong>
            {seats.active} / {seats.entitled}
          </strong>{' '}
          active sender{seats.entitled === 1 ? '' : 's'}
        </span>
        <span className={styles.meterTrack} aria-hidden="true">
          <span
            className={`${styles.meterFill} ${full ? styles.meterFull : warn ? styles.meterWarn : ''}`}
            style={{ width: `${pct}%` }}
          />
        </span>
        {full && (
          <span className={styles.meterNote}>
            All seats are in use — deactivate a sender or contact us for more.
          </span>
        )}
      </div>

      <AddSenderForm />
      <ImportCsv />

      {senders.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>No senders yet</h2>
          <p className={styles.emptyBody}>
            A sender is one person whose signature goes live. Drafts are free — a seat is only
            used when you publish.
          </p>
        </div>
      ) : (
        <SenderTable
          rows={senders}
          showExport={showExport}
          activeSeats={seats.active}
          entitledSeats={seats.entitled}
        />
      )}
    </section>
  );
}
