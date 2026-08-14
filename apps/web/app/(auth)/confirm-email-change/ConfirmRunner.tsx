'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

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
    <>
      <h4 className="mb-1">Confirm e-mail change ✉️</h4>
      <p className="mb-6">Finalizing the switch to your new address.</p>

      {state === 'busy' && (
        <div className="alert alert-secondary" role="status">
          Confirming…
        </div>
      )}

      {state === 'ok' && (
        <>
          <div className="alert alert-success" role="status">
            Your address is updated — sign in continues to work.
          </div>
          <p className="text-center mb-0">
            <Link href="/app/account">Go to your account</Link>
          </p>
        </>
      )}

      {state === 'fail' && (
        <>
          <div className="alert alert-danger" role="alert">
            This link is no longer valid.
          </div>
          <p className="text-center mb-0">
            <Link href="/app/account">Go to your account</Link>
          </p>
        </>
      )}
    </>
  );
}
