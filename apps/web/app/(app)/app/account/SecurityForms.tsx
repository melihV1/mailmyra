'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

/**
 * Security sekmesi formları: parola değiştirme + diğer oturumları kapatma.
 * Mantık eski AccountForms'tan AYNEN taşındı (2026-08-14 sekme bölünmesi);
 * yalnız görünüm tema diline geçti.
 */
export function SecurityForms({ otherSessionCount }: { otherSessionCount: number }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setMsg(null);

    const res = await fetch('/api/account/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: data.get('current'),
        newPassword: data.get('next'),
      }),
    });

    setBusy(false);
    if (res.ok) {
      form.reset();
      setMsg({ kind: 'ok', text: 'Password changed. Every other session was signed out.' });
      router.refresh();
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setMsg({
      kind: 'err',
      text:
        body.error === 'wrong_password'
          ? 'Your current password is not right.'
          : 'New password needs at least 10 characters, and not a common one.',
    });
  };

  const signOutOthers = async () => {
    setBusy(true);
    const res = await fetch('/api/account/signout-others', { method: 'POST' });
    setBusy(false);
    if (res.ok) {
      setMsg({ kind: 'ok', text: 'Other sessions signed out.' });
      router.refresh();
    }
  };

  return (
    <div>
      {msg && (
        <div
          className={`alert ${msg.kind === 'ok' ? 'alert-success' : 'alert-danger'}`}
          role="status"
        >
          {msg.text}
        </div>
      )}

      <form onSubmit={changePassword} className="row g-3">
        <div className="col-md-6">
          <label className="form-label" htmlFor="sec-current">
            Current password
          </label>
          <input
            id="sec-current"
            className="form-control"
            type="password"
            name="current"
            autoComplete="current-password"
            required
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="sec-next">
            New password
          </label>
          <input
            id="sec-next"
            className="form-control"
            type="password"
            name="next"
            autoComplete="new-password"
            minLength={10}
            required
          />
          <div className="form-text">At least 10 characters, not a common one.</div>
        </div>
        <div className="col-12 d-flex flex-wrap gap-2">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            Change password
          </button>
          {otherSessionCount > 0 && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => void signOutOthers()}
              disabled={busy}
            >
              Sign out the {otherSessionCount} other session{otherSessionCount === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
