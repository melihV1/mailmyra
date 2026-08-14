'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

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
    <>
      <h4 className="mb-1">Email verification ✉️</h4>
      <p className="mb-6">One click and exporting opens up.</p>

      {state === 'busy' && (
        <div className="alert alert-secondary" role="status">
          Verifying…
        </div>
      )}

      {state === 'ok' && (
        <>
          <div className="alert alert-success" role="status">
            Your address is verified. Exporting is now open.
          </div>
          <p className="text-center mb-0">
            <Link href="/app/signatures">Go to your signatures</Link>
          </p>
        </>
      )}

      {state === 'fail' && (
        <>
          <div className="alert alert-danger" role="alert">
            This link has expired or was already used. Sign in and use “Resend email” in the
            banner to get a fresh one.
          </div>
          <p className="text-center mb-0">
            <Link href="/login">Sign in</Link>
          </p>
        </>
      )}
    </>
  );
}
