import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { listSenders, seatSummary } from '../../../../lib/repo/senders';
import { AddSenderForm } from './AddSenderForm';
import { ImportCsv } from './ImportCsv';
import { SenderActions } from './SenderActions';
import styles from './senders.module.css';

export const metadata = { title: 'Senders — Mailmyra' };

const BADGE: Record<string, { label: string; cls: 'draft' | 'active' | 'inactive' }> = {
  draft: { label: 'Draft', cls: 'draft' },
  active: { label: 'Live', cls: 'active' },
  inactive: { label: 'Inactive', cls: 'inactive' },
};

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
        <ul className={styles.list}>
          {senders.map((s) => {
            const badge = BADGE[s.status]!;
            return (
              <li key={s.id} className={styles.row}>
                <span className={styles.rowName}>{s.displayName}</span>
                <span className={styles.rowMeta}>{s.email}</span>
                {s.jobTitle && <span className={styles.rowMeta}>{s.jobTitle}</span>}
                <span className={`${styles.badge} ${styles[badge.cls]}`}>{badge.label}</span>
                <span className={styles.rowMeta}>
                  {s.signatureNames.length > 0 ? s.signatureNames.join(', ') : '—'}
                </span>
                <SenderActions
                  id={s.id}
                  name={s.displayName}
                  status={s.status}
                  activeSeats={seats.active}
                  entitledSeats={seats.entitled}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
