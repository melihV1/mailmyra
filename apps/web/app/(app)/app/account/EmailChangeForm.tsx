'use client';

import { useState, type FormEvent } from 'react';

import { account as accountDict } from '../../../../lib/i18n/dict/account';
import { useLang } from '../../../../lib/i18n/LangProvider';
import { useToast } from '../../ToastProvider';

/**
 * E-posta değiştirme — Account sekmesinde yaşar. Mantık eski
 * AccountForms'tan AYNEN (yeni adrese doğrulama maili, onaylanınca geçiş).
 */
export function EmailChangeForm() {
  const toast = useToast();
  const lang = useLang();
  const t = accountDict[lang];
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const changeEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const newEmail = String(data.get('newEmail') ?? '');
    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch('/api/account/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newEmail,
          password: data.get('password'),
        }),
      });

      if (res.ok) {
        form.reset();
        toast(
          'info',
          t.emailChange.confirmationSentBody(newEmail),
          t.emailChange.confirmationSentTitle,
        );
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setMsg({
        kind: 'err',
        text:
          body.error === 'email_taken'
            ? t.emailChange.errors.email_taken
            : body.error === 'invalid_credentials'
              ? t.emailChange.errors.invalid_credentials
              : body.error === 'rate_limited'
                ? t.emailChange.errors.rate_limited
                : t.emailChange.errors.generic, // invalid_email ve tanınmayan hata gövdesi
      });
    } catch {
      // Ağ arızası — istek panele hiç ulaşmamış olabilir.
      setMsg({ kind: 'err', text: t.emailChange.errors.network });
    } finally {
      setBusy(false);
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

      <form onSubmit={changeEmail} className="row g-3">
        <div className="col-md-6">
          <label className="form-label" htmlFor="acc-new-email">
            {t.emailChange.newAddressLabel}
          </label>
          <input
            id="acc-new-email"
            className="form-control"
            type="email"
            name="newEmail"
            autoComplete="email"
            required
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="acc-email-password">
            {t.emailChange.currentPasswordLabel}
          </label>
          <input
            id="acc-email-password"
            className="form-control"
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </div>
        <div className="col-12">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : <i className="icon-base ti tabler-mail-forward me-1" aria-hidden="true" />}
            {t.emailChange.submit}
          </button>
        </div>
      </form>
    </div>
  );
}
