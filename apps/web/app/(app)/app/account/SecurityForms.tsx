'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { account as accountDict } from '../../../../lib/i18n/dict/account';
import { useLang } from '../../../../lib/i18n/LangProvider';
import { useToast } from '../../ToastProvider';

/**
 * Security sekmesi formları: parola değiştirme + diğer oturumları kapatma.
 * Mantık eski AccountForms'tan AYNEN taşındı (2026-08-14 sekme bölünmesi);
 * yalnız görünüm tema diline geçti.
 */
export function SecurityForms({ otherSessionCount }: { otherSessionCount: number }) {
  const router = useRouter();
  const toast = useToast();
  const lang = useLang();
  const t = accountDict[lang];
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
      toast('success', t.security.forms.passwordChangedToast);
      router.refresh();
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setMsg({
      kind: 'err',
      text:
        body.error === 'wrong_password'
          ? t.security.forms.errors.wrong_password
          : t.security.forms.errors.generic,
    });
  };

  const signOutOthers = async () => {
    setBusy(true);
    const res = await fetch('/api/account/signout-others', { method: 'POST' });
    setBusy(false);
    if (res.ok) {
      toast('success', t.security.forms.othersSignedOutToast);
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
            {t.security.forms.currentPasswordLabel}
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
            {t.security.forms.newPasswordLabel}
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
          <div className="form-text">{t.security.forms.newPasswordHint}</div>
        </div>
        <div className="col-12 d-flex flex-wrap gap-2">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : <i className="icon-base ti tabler-key me-1" aria-hidden="true" />}
            {t.security.forms.changePassword}
          </button>
          {otherSessionCount > 0 && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => void signOutOthers()}
              disabled={busy}
            >
              {t.security.forms.signOutOthers(otherSessionCount)}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
