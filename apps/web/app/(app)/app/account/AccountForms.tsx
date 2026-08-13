'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import styles from './account.module.css';

export function AccountForms({ otherSessionCount }: { otherSessionCount: number }) {
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
        setMsg({ kind: 'ok', text: `Check ${newEmail} — the switch happens when you confirm.` });
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setMsg({
        kind: 'err',
        text:
          body.error === 'email_taken'
            ? 'That address already has an account.'
            : body.error === 'invalid_credentials'
              ? 'Wrong password.'
              : body.error === 'rate_limited'
                ? 'Too many attempts — try again later.'
                : 'Enter a valid address (or it is already yours).', // invalid_email ve tanınmayan hata gövdesi
      });
    } catch {
      // Ağ arızası — istek panele hiç ulaşmamış olabilir.
      setMsg({ kind: 'err', text: 'Something went wrong — try again.' });
    } finally {
      setBusy(false);
    }
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
    <div className={styles.forms}>
      {msg && (
        <p className={msg.kind === 'ok' ? styles.notice : styles.error} role="status">
          {msg.text}
        </p>
      )}

      <h2 className={styles.subtitle}>Change password</h2>
      <form onSubmit={changePassword} className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>Current password</span>
          <input
            className={styles.input}
            type="password"
            name="current"
            autoComplete="current-password"
            required
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>New password</span>
          <input
            className={styles.input}
            type="password"
            name="next"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </label>
        <button className={styles.submit} type="submit" disabled={busy}>
          Change password
        </button>
      </form>

      {otherSessionCount > 0 && (
        <button type="button" className={styles.secondary} onClick={signOutOthers} disabled={busy}>
          Sign out the {otherSessionCount} other session{otherSessionCount === 1 ? '' : 's'}
        </button>
      )}

      <h2 className={styles.subtitle}>Change e-mail</h2>
      <form onSubmit={changeEmail} className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>New address</span>
          <input className={styles.input} type="email" name="newEmail" autoComplete="email" required />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Current password</span>
          <input
            className={styles.input}
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button className={styles.submit} type="submit" disabled={busy}>
          Change e-mail
        </button>
      </form>
    </div>
  );
}

/**
 * Tehlike bölgesi — sayfa dibinde, ayrı bir bileşen olarak (page.tsx onu
 * Legal listesinden sonra render ediyor). Onay `ConfirmDialog`'un
 * `onConfirm`i koşullu geçirme deseniyle kilitli: SenderTable'daki
 * `onConfirm={plan.fileCount > 0 ? download : undefined}` AYNEN — e-posta
 * birebir eşleşmeden `onConfirm` `undefined` kalır, buton görünür ama işlevsiz
 * kalmak yerine hiç render edilmez (ConfirmDialog'un kendi kabuğu böyle).
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
      <section className={styles.dangerZone}>
        <h2 className={styles.dangerTitle}>Danger zone</h2>
        <button type="button" className={styles.dangerButton} onClick={() => setOpen(true)}>
          Delete account
        </button>
      </section>

      {open && (
        <ConfirmDialog
          title="Delete your account"
          onCancel={close}
          onConfirm={emailMatches ? confirmDelete : undefined}
          confirmLabel="Delete forever"
          busy={busy}
        >
          <p>
            This permanently deletes your workspace: senders, signatures and{' '}
            <strong>all uploaded images</strong>. Signatures already pasted into e-mail clients{' '}
            <strong>will show broken images</strong>. This cannot be undone.
          </p>
          <label className={styles.field}>
            <span className={styles.label}>Type your e-mail to confirm</span>
            <input
              className={styles.input}
              type="email"
              value={emailConfirm}
              onChange={(e) => setEmailConfirm(e.target.value)}
              autoComplete="off"
              disabled={busy}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Your password</span>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={busy}
            />
          </label>
          {error && (
            <p className={styles.error} role="alert">
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
