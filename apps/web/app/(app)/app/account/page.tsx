import { redirect } from 'next/navigation';

import { PRICING } from '@mailmyra/core';
import { currentSession } from '../../../../lib/auth/current';
import { prisma } from '../../../../lib/db';
import { primaryOrgId, resolveBillingOrgId, seatSummary } from '../../../../lib/repo/senders';
import { AccountForms, DangerZone } from './AccountForms';
import styles from './account.module.css';

export const metadata = { title: 'Account — Mailmyra' };

/** entitlementState enum değerlerinin ekran metni — trial ayrı ele alınıyor (aşağıda). */
const STATE_LABEL: Record<string, string> = {
  active: 'Active',
  past_due: 'Past due',
  cancelled: 'Cancelled',
};

/**
 * Hesap ekranı (panel-brief §2.11, Faz 1+2): plan kutusu · şifre/e-posta
 * değiştir · aktif oturumlar + diğerlerini kapat · hukuk kabulleri · tehlike
 * bölgesi (hesap silme). Task 6: e-posta değiştirme ve hesap silme UI'ı
 * eklendi — uçlar zaten Task 4/5'te yayında.
 */
export default async function AccountPage() {
  // Layout korumasına GÜVENME: App Router layout ile sayfayı paralel render
  // edebiliyor; layout redirect'e karar verirken sayfa null oturumla çalışır
  // (canlıda 500 olarak görüldü, 2026-08-11).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/account');

  // Fatura org'u koltuk sayısıyla aynı ağaçtan okunuyor — senders/page.tsx'teki
  // seatSummary() çağrısıyla aynı kaynak, burada ayrıca entitlementState/trialEndsAt lazım.
  const orgId = await primaryOrgId(session.user.id);

  const [sessions, acceptances, seats, billing] = await Promise.all([
    prisma.session.findMany({
      where: { userId: session.user.id },
      orderBy: { lastSeenAt: 'desc' },
      select: { id: true, ip: true, userAgent: true, lastSeenAt: true },
    }),
    prisma.legalAcceptance.findMany({
      where: { userId: session.user.id },
      orderBy: { acceptedAt: 'desc' },
      select: { id: true, docType: true, version: true, acceptedAt: true },
    }),
    seatSummary(session.user.id),
    orgId
      ? resolveBillingOrgId(prisma, orgId).then((billingOrgId) =>
          prisma.organization.findUniqueOrThrow({
            where: { id: billingOrgId },
            select: { entitlementState: true, trialEndsAt: true },
          }),
        )
      : Promise.resolve(null),
  ]);

  const priceDisplay = (PRICING.perSeatYearCents / 100).toFixed(2);

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Account</h1>
      <p className={styles.email}>{session.user.email}</p>

      <div className={styles.planBox} role="status">
        <p className={styles.planLine}>
          <strong>
            {seats.active} / {seats.entitled}
          </strong>{' '}
          active senders
          {billing && (
            <>
              {' · '}
              {billing.entitlementState === 'trial'
                ? billing.trialEndsAt
                  ? `Trial ends ${billing.trialEndsAt.toLocaleDateString('en-GB')}`
                  : 'Trial'
                : (STATE_LABEL[billing.entitlementState] ?? billing.entitlementState)}
            </>
          )}
          {' · '}
          <strong>${priceDisplay}</strong> per active sender / year · To add seats, contact us.
        </p>
      </div>

      <AccountForms otherSessionCount={sessions.length - 1} />

      <h2 className={styles.subtitle}>Active sessions</h2>
      <ul className={styles.list}>
        {sessions.map((s) => (
          <li key={s.id} className={styles.row}>
            <span className={styles.rowName}>
              {s.id === session.id ? 'This device' : (s.userAgent?.slice(0, 60) ?? 'Unknown device')}
            </span>
            <span className={styles.rowMeta}>{s.ip ?? '—'}</span>
            <time className={styles.rowMeta} dateTime={s.lastSeenAt.toISOString()}>
              {s.lastSeenAt.toLocaleString('en-GB')}
            </time>
          </li>
        ))}
      </ul>

      <h2 className={styles.subtitle}>Legal</h2>
      <ul className={styles.list}>
        {acceptances.map((a) => (
          <li key={a.id} className={styles.row}>
            <span className={styles.rowName}>{a.docType}</span>
            <span className={styles.rowMeta}>v{a.version}</span>
            <time className={styles.rowMeta} dateTime={a.acceptedAt.toISOString()}>
              accepted {a.acceptedAt.toLocaleDateString('en-GB')}
            </time>
          </li>
        ))}
      </ul>

      <DangerZone userEmail={session.user.email} />
    </section>
  );
}
