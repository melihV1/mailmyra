import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { currentSession } from '../../lib/auth/current';
import { SignOutButton } from './SignOutButton';
import { VerifyBanner } from './VerifyBanner';
import styles from './shell.module.css';

/**
 * Panel kabuğu. Bu grubun altındaki HER rota oturum ister — kontrol tek
 * yerde, sayfalar "kim bu?" diye sormaz.
 *
 * Koruma middleware'de değil çünkü oturum doğrulaması Prisma istiyor ve
 * middleware edge çalışma zamanında Prisma yok. Sunucu bileşeni bizim
 * kurulumda aynı işi görüyor.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/signatures');

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/app/signatures" className={styles.wordmark}>
          Mailmyra
        </Link>
        <nav className={styles.nav} aria-label="Panel">
          <Link href="/app/signatures" className={styles.navLink}>
            Signatures
          </Link>
          <Link href="/app/senders" className={styles.navLink}>
            Senders
          </Link>
          <Link href="/app/account" className={styles.navLink}>
            Account
          </Link>
        </nav>
        <div className={styles.session}>
          <span className={styles.email}>{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>

      {/* Doğrulanmamış adresle koltuk açılmasın: export doğrulanana kadar
          kapalı, şerit bunu söylüyor ve kalıcı (panel-brief §2.2). */}
      {!session.user.emailVerifiedAt && <VerifyBanner />}

      <main className={styles.main}>{children}</main>
    </div>
  );
}
