'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';

import { clearDraft, loadDraft } from '../../../lib/draft';
import { LEGAL } from '../../../lib/legal-links';

import styles from '../auth.module.css';

/**
 * Kayıt üç alandan uzun değil (panel-brief §2.1): e-posta, şifre, kabul
 * kutusu. Şirket adı sorusu bilerek yok — org "Workspace" adıyla açılır,
 * sonra panelden değiştirilir.
 *
 * Taslak taşıma (panel-brief §2.1): builder'da başlanmış imza varsa şerit
 * çıkar ve kullanıcı ONAYLARSA hesaba taşınır. Sessizce taşınmaz — kişinin
 * başka bir hesabı olabilir.
 */
export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [carryDraft, setCarryDraft] = useState(true);

  // localStorage yalnız istemcide var; SSR ile ilk boyama aynı kalsın diye
  // şerit effect'te açılıyor.
  useEffect(() => {
    setHasDraft(loadDraft(window.localStorage, Date.now()) !== null);
  }, []);

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
        termsVersion: LEGAL.terms.version,
      }),
    });

    if (res.ok) {
      if (hasDraft && carryDraft) {
        const draft = loadDraft(window.localStorage, Date.now());
        if (draft) {
          const saved = await fetch('/api/signatures', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'My first signature', data: draft }),
          });
          // Taslak yalnız sunucuya GERÇEKTEN yazıldıysa silinir; kayıt olup
          // taşıma başarısız olursa kullanıcının emeği tarayıcıda durur.
          if (saved.ok) clearDraft(window.localStorage);
        }
      }
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

        {hasDraft && (
          <label className={styles.terms}>
            <input
              type="checkbox"
              checked={carryDraft}
              onChange={(e) => setCarryDraft(e.target.checked)}
            />
            <span>
              The signature you started in the builder is still here. Move it into your account?
            </span>
          </label>
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
              I agree to the <a href={LEGAL.terms.path}>Terms of Service</a>, the{' '}
              <a href={LEGAL.privacy.path}>Privacy Policy</a>, and the{' '}
              <a href={LEGAL.kvkk.path}>{LEGAL.kvkk.title}</a>.
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
