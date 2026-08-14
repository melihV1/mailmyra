'use client';

import { useState } from 'react';

import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';

/**
 * Hesap silme — temanın "Delete Account" kartı diliyle, Account sekmesinin
 * dibinde. Onay akışı eskisiyle AYNEN: `onConfirm`i koşullu geçirme deseni
 * (e-posta birebir eşleşmeden düğme hiç render edilmez — ConfirmDialog kabuğu).
 */
export function DangerZone({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false);
  const [emailConfirm, setEmailConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; membersLink?: boolean } | null>(null);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setEmailConfirm('');
    setPassword('');
    setError(null);
  };

  // Case-insensitive: e-posta sistemde zaten öyle ele alınıyor (bkz.
  // senders.ts createSender — `.trim().toLowerCase()`), kullanıcıyı büyük/
  // küçük harf farkıyla kilitli bırakmanın anlamı yok.
  const emailMatches = emailConfirm.trim().toLowerCase() === userEmail.trim().toLowerCase();

  const confirmDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailConfirm, password }),
      });

      if (res.ok) {
        // Çerez sunucuda temizlendi — geri dönülecek bir panel kalmadı.
        window.location.href = 'https://mailmyra.com';
        return;
      }

      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(
        body.error === 'invalid_credentials'
          ? { text: 'Wrong password.' }
          : body.error === 'email_mismatch'
            ? { text: 'That does not match your account e-mail.' }
            : body.error === 'workspace_has_members'
              ? {
                  text: 'Your workspace still has other members — remove them or transfer ownership first.',
                  membersLink: true,
                }
              : { text: 'Something went wrong — try again.' }, // 500/401/tanınmayan gövde
      );
    } catch {
      // Ağ arızası — istek panele hiç ulaşmamış olabilir.
      setError({ text: 'Something went wrong — try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="card border-danger">
        <div className="card-header">
          <h5 className="card-title mb-0 text-danger">Delete account</h5>
        </div>
        <div className="card-body">
          <p className="mb-3 text-body-secondary">
            Permanently deletes your workspace: senders, signatures and all uploaded images.
            Signatures already pasted into e-mail clients will show broken images.
          </p>
          <button type="button" className="btn btn-danger" onClick={() => setOpen(true)}>
            <i className="icon-base ti tabler-alert-triangle me-1" aria-hidden="true" />
            Delete account
          </button>
        </div>
      </div>

      {open && (
        <ConfirmDialog
          title="Delete your account"
          onCancel={close}
          onConfirm={emailMatches ? confirmDelete : undefined}
          confirmLabel="Delete forever"
          tone="danger"
          busy={busy}
        >
          <p>
            This permanently deletes your workspace: senders, signatures and{' '}
            <strong>all uploaded images</strong>. Signatures already pasted into e-mail clients{' '}
            <strong>will show broken images</strong>. This cannot be undone.
          </p>
          <div className="mb-3">
            <label className="form-label" htmlFor="del-email">
              Type your e-mail to confirm
            </label>
            <input
              id="del-email"
              className="form-control"
              type="email"
              value={emailConfirm}
              onChange={(e) => setEmailConfirm(e.target.value)}
              autoComplete="off"
              disabled={busy}
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="del-password">
              Your password
            </label>
            <input
              id="del-password"
              className="form-control"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={busy}
            />
          </div>
          {error && (
            <p className="text-danger mb-0" role="alert">
              {error.text}
              {error.membersLink && (
                <>
                  {' '}
                  <a href="/app/members">Go to Members</a>
                </>
              )}
            </p>
          )}
        </ConfirmDialog>
      )}
    </>
  );
}
