'use client';

import { useEffect, useState } from 'react';

/**
 * Doğrulama bekleme odası (karar 2026-08-14: e-posta doğrulanmadan panele
 * giriş YOK — kapı (app)/layout.tsx'te, burası kapının gösterdiği yer).
 *
 * "Canlı" davranış: 4 sn'de bir oturumun doğrulama durumu yoklanır;
 * kullanıcı e-postadaki linki BAŞKA sekmede tıkladığı an burası yakalar,
 * başarı durumunu gösterip panele yönlendirir. Resend mevcut uca gider
 * (sunucuda 3/15dk rate limit — flows.ts).
 */
const POLL_MS = 4000;

export function VerifyPending({ email }: { email: string }) {
  const [state, setState] = useState<'waiting' | 'verified'>('waiting');
  const [resend, setResend] = useState<'idle' | 'busy' | 'sent' | 'limited'>('idle');

  useEffect(() => {
    if (state !== 'waiting') return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/verification-status');
        if (res.status === 401) {
          // Oturum düştü (başka sekmede çıkış vb.) — login'e.
          window.location.assign('/login');
          return;
        }
        const body = (await res.json()) as { verified?: boolean };
        if (body.verified) {
          setState('verified');
          // Başarıyı bir an göster, sonra panele.
          setTimeout(() => window.location.assign('/app'), 1200);
        }
      } catch {
        /* ağ arızası — sonraki turda tekrar */
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [state]);

  const resendMail = async () => {
    setResend('busy');
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      setResend(res.status === 429 ? 'limited' : res.ok ? 'sent' : 'idle');
    } catch {
      setResend('idle');
    }
  };

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  if (state === 'verified') {
    return (
      <>
        <h4 className="mb-1">You&apos;re verified ✅</h4>
        <p className="mb-6">Taking you to your workspace…</p>
        <div className="alert alert-success mb-0" role="status">
          Your address is confirmed — exporting is open.
        </div>
      </>
    );
  }

  return (
    <>
      <h4 className="mb-1">Verify your email ✉️</h4>
      <p className="mb-6">
        We sent an activation link to <span className="fw-medium text-heading">{email}</span>.
        Click it and this page will move on by itself.
      </p>

      <div className="d-flex align-items-center gap-2 mb-6 text-body-secondary">
        <span
          className="spinner-border spinner-border-sm text-primary flex-shrink-0"
          role="status"
          aria-hidden="true"
        />
        <small>Waiting for verification — checks every few seconds.</small>
      </div>

      {resend === 'sent' && (
        <div className="alert alert-success" role="status">
          Sent — check your inbox (and the spam folder).
        </div>
      )}
      {resend === 'limited' && (
        <div className="alert alert-warning" role="status">
          Too many requests — try again in a few minutes.
        </div>
      )}

      <div className="d-grid mb-4">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void resendMail()}
          disabled={resend === 'busy'}
        >
          {resend === 'busy' ? 'Sending…' : 'Resend the email'}
        </button>
      </div>

      <p className="text-center mb-0">
        <span className="text-body-secondary">Wrong account? </span>
        <button type="button" className="btn btn-link p-0 align-baseline" onClick={() => void signOut()}>
          Sign out
        </button>
      </p>
    </>
  );
}
