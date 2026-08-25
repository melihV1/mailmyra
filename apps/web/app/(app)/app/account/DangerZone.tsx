'use client';

import { useState } from 'react';

import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { account as accountDict } from '../../../../lib/i18n/dict/account';
import { common } from '../../../../lib/i18n/dict/common';
import { useLang } from '../../../../lib/i18n/LangProvider';

/**
 * Hesap silme — temanın "Delete Account" kartı diliyle, Account sekmesinin
 * dibinde. Onay akışı eskisiyle AYNEN: `onConfirm`i koşullu geçirme deseni
 * (e-posta birebir eşleşmeden düğme hiç render edilmez — ConfirmDialog kabuğu).
 *
 * Onay SABİT bir kelime değil, kullanıcının KENDİ e-postasını ister —
 * eşleştirme mantığı (`emailMatches`) DOKUNULMADI, yalnız çevredeki
 * etiket/açıklama metinleri çevrildi (bkz. görev raporu).
 */
export function DangerZone({ userEmail }: { userEmail: string }) {
  const lang = useLang();
  const t = accountDict[lang];
  const c = common[lang];
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
          ? { text: t.dangerZone.errors.invalid_credentials }
          : body.error === 'email_mismatch'
            ? { text: t.dangerZone.errors.email_mismatch }
            : body.error === 'workspace_has_members'
              ? {
                  text: t.dangerZone.errors.workspace_has_members,
                  membersLink: true,
                }
              : { text: t.dangerZone.errors.generic }, // 500/401/tanınmayan gövde
      );
    } catch {
      // Ağ arızası — istek panele hiç ulaşmamış olabilir.
      setError({ text: t.dangerZone.errors.generic });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="card border-danger">
        <div className="card-header">
          <h5 className="card-title mb-0 text-danger">{t.dangerZone.cardTitle}</h5>
        </div>
        <div className="card-body">
          <p className="mb-3 text-body-secondary">{t.dangerZone.cardBody}</p>
          <button type="button" className="btn btn-danger" onClick={() => setOpen(true)}>
            <i className="icon-base ti tabler-alert-triangle me-1" aria-hidden="true" />
            {t.dangerZone.deleteButton}
          </button>
        </div>
      </div>

      {open && (
        <ConfirmDialog
          title={t.dangerZone.dialogTitle}
          onCancel={close}
          onConfirm={emailMatches ? confirmDelete : undefined}
          confirmLabel={t.dangerZone.confirmForever}
          cancelLabel={c.cancel}
          tone="danger"
          busy={busy}
        >
          <p>
            {t.dangerZone.bodyLead}
            <strong>{t.dangerZone.bodyStrongImages}</strong>
            {t.dangerZone.bodyMid}
            <strong>{t.dangerZone.bodyStrongBroken}</strong>
            {t.dangerZone.bodyTrail}
          </p>
          <div className="mb-3">
            <label className="form-label" htmlFor="del-email">
              {t.dangerZone.emailConfirmLabel}
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
              {t.dangerZone.passwordLabel}
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
                  <a href="/app/members">{t.dangerZone.goToMembers}</a>
                </>
              )}
            </p>
          )}
        </ConfirmDialog>
      )}
    </>
  );
}
