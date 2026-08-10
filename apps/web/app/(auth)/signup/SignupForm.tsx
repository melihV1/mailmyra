'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import styles from '../auth.module.css';
import { PRIVACY_URL, TERMS_URL, TERMS_VERSION } from '../legal-links';

/**
 * Kayıt üç alandan uzun değil (panel-brief §2.1): e-posta, şifre, kabul
 * kutusu. Şirket adı sorusu bilerek yok — org "Workspace" adıyla açılır,
 * sonra panelden değiştirilir.
 *
 * Taslak taşıma şeridi (`mailmyra:draft:v1`) adım 7'de: imzayı sunucuya
 * kaydeden uç olmadan taşınacak yer yok.
 */
export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
        termsVersion: TERMS_VERSION,
      }),
    });

    if (res.ok) {
      window.location.assign('/app/signatures');
      return;
    }

    setBusy(false);
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    // Kayıt formunda adresin dolu olduğunu söylemek sızdırma değil —
    // kullanıcı kendi adresini zaten biliyor (panel-brief §2.1).
    if (body.error === 'email_taken') {
      setError('This address already has an account. Try signing in instead.');
    } else if (body.error === 'weak_password') {
      setError('Password needs at least 10 characters, and not a common one.');
    } else if (body.error === 'invalid_email') {
      setError('That email address does not look right.');
    } else {
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <Link href="/" className={styles.wordmark}>
          Mailmyra
        </Link>
        <h1 className={styles.title}>Create your account</h1>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <form onSubmit={submit}>
          <label className={styles.field}>
            <span className={styles.label}>Email</span>
            <input
              className={styles.input}
              type="email"
              name="email"
              autoComplete="email"
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Password</span>
            <input
              className={styles.input}
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={10}
              required
            />
            <span className={styles.hint}>At least 10 characters. Length beats symbols.</span>
          </label>

          <label className={styles.terms}>
            <input type="checkbox" name="terms" required />
            <span>
              I agree to the <a href={TERMS_URL}>Terms of Service</a> and the{' '}
              <a href={PRIVACY_URL}>Privacy Policy</a>.
            </span>
          </label>

          <button className={styles.submit} type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
