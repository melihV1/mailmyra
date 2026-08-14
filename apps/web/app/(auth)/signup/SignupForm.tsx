'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';

import { clearDraft, loadDraft } from '../../../lib/draft';
import { LEGAL } from '../../../lib/legal-links';

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
    <>
      <h4 className="mb-1">Adventure starts here 🚀</h4>
      <p className="mb-6">One signature, every inbox — 7-day full trial, no card.</p>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {hasDraft && (
        <div className="alert alert-primary d-flex align-items-start gap-2" role="note">
          <input
            id="signup-draft"
            className="form-check-input mt-1 flex-shrink-0"
            type="checkbox"
            checked={carryDraft}
            onChange={(e) => setCarryDraft(e.target.checked)}
          />
          <label htmlFor="signup-draft" className="mb-0">
            The signature you started in the builder is still here. Move it into your account?
          </label>
        </div>
      )}

      <form onSubmit={submit} className="mb-6">
        <div className="mb-6">
          <label className="form-label" htmlFor="signup-email">
            Email
          </label>
          <input
            id="signup-email"
            className="form-control"
            type="email"
            name="email"
            autoComplete="email"
            required
          />
        </div>

        <div className="mb-6">
          <label className="form-label" htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            className="form-control"
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
          <div className="form-text">At least 10 characters. Length beats symbols.</div>
        </div>

        <div className="mb-6 form-check">
          <input id="signup-terms" className="form-check-input" type="checkbox" name="terms" required />
          <label className="form-check-label" htmlFor="signup-terms">
            I agree to the <a href={LEGAL.terms.path}>Terms of Service</a>, the{' '}
            <a href={LEGAL.privacy.path}>Privacy Policy</a>, and the{' '}
            <a href={LEGAL.kvkk.path}>{LEGAL.kvkk.title}</a>.
          </label>
        </div>

        <div className="d-grid">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </form>

      <p className="text-center mb-0">
        <span>Already have an account? </span>
        <Link href="/login">Sign in instead</Link>
      </p>
    </>
  );
}
