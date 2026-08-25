'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { senders as sendersDict } from '../../../../lib/i18n/dict/senders';
import { useLang } from '../../../../lib/i18n/LangProvider';
import { useToast } from '../../ToastProvider';

/** Taslak ekler — koltuk yemez; sayaç yayına almada işler. */
export function AddSenderForm() {
  const router = useRouter();
  const toast = useToast();
  const lang = useLang();
  const t = sendersDict[lang];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError(null);

    const res = await fetch('/api/senders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: data.get('displayName'),
        email: data.get('email'),
        jobTitle: data.get('jobTitle'),
      }),
    });

    setBusy(false);
    if (res.ok) {
      form.reset();
      toast('success', t.addForm.addedToast);
      router.refresh();
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setError(
      body.error === 'email_taken'
        ? t.addForm.errors.email_taken
        : body.error === 'forbidden'
          ? t.addForm.errors.forbidden
          : t.addForm.errors.generic,
    );
  };

  return (
    <form onSubmit={submit} className="row g-3">
      <div className="col-sm-6 col-lg-3">
        <input
          className="form-control"
          name="displayName"
          placeholder={t.addForm.namePlaceholder}
          aria-label={t.addForm.nameAria}
          required
          maxLength={255}
        />
      </div>
      <div className="col-sm-6 col-lg-3">
        <input
          className="form-control"
          name="email"
          type="email"
          placeholder={t.addForm.emailPlaceholder}
          aria-label={t.addForm.emailAria}
          required
        />
      </div>
      <div className="col-sm-6 col-lg-3">
        <input
          className="form-control"
          name="jobTitle"
          placeholder={t.addForm.jobTitlePlaceholder}
          aria-label={t.addForm.jobTitleAria}
        />
      </div>
      <div className="col-sm-6 col-lg-3">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
              {t.addForm.adding}
            </>
          ) : (
            <>
              <i className="icon-base ti tabler-plus me-1" aria-hidden="true" />
              {t.addForm.submit}
            </>
          )}
        </button>
      </div>
      {error && (
        <div className="col-12">
          <span className="text-danger small" role="alert">
            {error}
          </span>
        </div>
      )}
    </form>
  );
}
