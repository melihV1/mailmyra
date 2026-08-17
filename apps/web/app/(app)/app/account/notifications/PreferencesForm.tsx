'use client';

import { useState, type FormEvent } from 'react';

import { NOTIFICATION_LOOKS } from '../../../notification-looks';
import { useToast } from '../../../ToastProvider';
import type { NotificationType } from '../../../../../lib/repo/notifications';

/**
 * Bildirim tercihleri — temanın `pages-account-settings-notifications`
 * tablosu (Type | In-app | E-mail), tek "Save" düğmesi. Tema üçüncü bir
 * "Browser" kanalı gösteriyor; bizde push YOK, uydurma kolon koymuyoruz.
 *
 * E-posta kutusu yalnız gerçekten mail üreten tiplerde etkin (bugün koltuk
 * uyarısı) — diğerlerinde pasif ve sebebi satırda yazıyor.
 */
export function PreferencesForm({
  initial,
  emailCapable,
}: {
  initial: ReadonlyArray<{ type: NotificationType; inApp: boolean; email: boolean }>;
  emailCapable: readonly string[];
}) {
  const toast = useToast();
  const [rows, setRows] = useState(initial.map((r) => ({ ...r })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setValue = (type: string, channel: 'inApp' | 'email', value: boolean) => {
    setRows((prev) => prev.map((r) => (r.type === type ? { ...r, [channel]: value } : r)));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/account/notification-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences: rows }),
    });
    setBusy(false);
    if (res.ok) {
      toast('success', 'Notification preferences saved.');
      return;
    }
    setError('Could not save your preferences. Please try again.');
  };

  return (
    <form onSubmit={submit}>
      <div className="table-responsive text-nowrap border-top">
        <table className="table table-borderless">
          <thead>
            <tr>
              <th className="text-nowrap">Type</th>
              <th className="text-nowrap text-center">In-app</th>
              <th className="text-nowrap text-center">E-mail</th>
            </tr>
          </thead>
          <tbody className="table-border-bottom-0">
            {rows.map((row) => {
              const look = NOTIFICATION_LOOKS[row.type];
              const canEmail = emailCapable.includes(row.type);
              return (
                <tr key={row.type}>
                  <td className="text-nowrap text-heading">
                    <span className="d-block">{look.title}</span>
                    {!canEmail && (
                      <small className="text-body-secondary">In-app only for now</small>
                    )}
                  </td>
                  <td className="text-center">
                    <div className="form-check d-flex justify-content-center mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        aria-label={`${look.title} — in-app`}
                        checked={row.inApp}
                        onChange={(e) => setValue(row.type, 'inApp', e.target.checked)}
                      />
                    </div>
                  </td>
                  <td className="text-center">
                    <div className="form-check d-flex justify-content-center mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        aria-label={`${look.title} — e-mail`}
                        checked={canEmail && row.email}
                        disabled={!canEmail}
                        onChange={(e) => setValue(row.type, 'email', e.target.checked)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card-footer d-flex align-items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy && (
            <span
              className="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            />
          )}
          Save changes
        </button>
        {error && (
          <span className="text-danger small" role="alert">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
