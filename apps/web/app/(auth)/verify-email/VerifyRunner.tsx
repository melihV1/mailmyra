'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import styles from '../auth.module.css';

/**
 * Doğrulama istemciden, tam bir kez POST edilir.
 *
 * Sunucu bileşeninde render sırasında yapmak daha kısa olurdu ama render
 * yan etkisiz kalmalı: prefetch ya da çift değerlendirme, tek kullanımlık
 * token'ı sayfayı gerçekten açmadan tüketebilirdi.
 */
export function VerifyRunner({ token }: { token: string }) {
  const [state, setState] = useState<'busy' | 'ok' | 'fail'>('busy');
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !token) {
      if (!token) setState('fail');
      return;
    }
    fired.current = true; // React Strict Mode effect'i iki kez koşturur

    void fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then(
      (res) => setState(res.ok ? 'ok' : 'fail'),
      () => setState('fail'),
    );
  }, [token]);

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <span className={styles.wordmark}>Mailmyra</span>
        <h1 className={styles.title}>Email verification</h1>

        {state === 'busy' && <p className={styles.notice}>Verifying…</p>}

        {state === 'ok' && (
          <>
            <p className={styles.notice} role="status">
              Your address is verified. Exporting is now open.
            </p>
            <p className={styles.footer}>
              <Link href="/app/signatures">Go to your signatures</Link>
            </p>
          </>
        )}

        {state === 'fail' && (
          <>
            <p className={styles.error} role="alert">
              This link has expired or was already used. Sign in and use “Resend email” in the
              banner to get a fresh one.
            </p>
            <p className={styles.footer}>
              <Link href="/login">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
