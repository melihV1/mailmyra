import { currentSession } from '../../../../lib/auth/current';
import { prisma } from '../../../../lib/db';
import { AccountForms } from './AccountForms';
import styles from './account.module.css';

export const metadata = { title: 'Account — Mailmyra' };

/**
 * Hesap ekranı (panel-brief §2.11, Faz 1 kesiti): şifre değiştir · aktif
 * oturumlar + diğerlerini kapat · hukuk kabulleri. E-posta değiştirme ve
 * hesap silme Faz 2'ye — ikisi de kendi doğrulama akışını istiyor.
 */
export default async function AccountPage() {
  const session = (await currentSession())!;

  const [sessions, acceptances] = await Promise.all([
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
  ]);

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Account</h1>
      <p className={styles.email}>{session.user.email}</p>

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
    </section>
  );
}
