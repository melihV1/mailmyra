'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import styles from '../auth.module.css';

/**
 * Onay istemciden, tam bir kez POST edilir — VerifyRunner ile aynı sebep:
 * sunucu bileşeninde render sırasında yapmak render'ı yan etkili kılardı
 * (prefetch / çift değerlendirme tek kullanımlık token'ı tüketebilirdi).
 */
export function ConfirmRunner({ token }: { token: string }) {
  const [state, setState] = useState<'busy' | 'ok' | 'fail'>('busy');
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !token) {
      if (!token) setState('fail');
      return;
    }
    fired.current = true; // React Strict Mode effect'i iki kez koşturur

    void fetch('/api/account/confirm-email-change', {
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
        <h1 className={styles.title}>Confirm e-mail change</h1>

        {state === 'busy' && <p className={styles.notice}>Confirming…</p>}

        {state === 'ok' && (
          <>
            <p className={styles.notice} role="status">
              Your address is updated — sign in continues to work.
            </p>
            <p className={styles.footer}>
              <Link href="/app/account">Go to your account</Link>
            </p>
          </>
        )}

        {state === 'fail' && (
          <>
            <p className={styles.error} role="alert">
              This link is no longer valid.
            </p>
            <p className={styles.footer}>
              <Link href="/app/account">Go to your account</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
