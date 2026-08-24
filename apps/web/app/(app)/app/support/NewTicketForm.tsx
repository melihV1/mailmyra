'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useToast } from '../../ToastProvider';
import { TICKET_CATEGORIES } from './support-labels';

/**
 * Vaka açma formu — öncelik SORULMAZ ('normal' sabit, staff panelden
 * yükseltir); org + e-posta oturumdan gelir, kullanıcı yazmaz (onaylı
 * kapsam). Başarıda referans toast'ta söylenir, liste refresh'le tazelenir.
 */
export function NewTicketForm() {
  const router = useRouter();
  const toast = useToast();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<(typeof TICKET_CATEGORIES)[number]['value']>('billing');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, category, message }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Could not open the case — check the fields and try again.');
      return;
    }
    const data = (await res.json()) as { reference?: string };
    toast('success', `Case ${data.reference ?? ''} opened. We'll reply by email.`);
    setSubject('');
    setCategory('billing');
    setMessage('');
    router.refresh();
  };

  return (
    <form className="row g-4" onSubmit={submit}>
      <div className="col-12">
        <label className="form-label" htmlFor="ticketSubject">
          Subject <span className="text-danger">*</span>
        </label>
        <input
          id="ticketSubject"
          className="form-control"
          maxLength={200}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
      </div>
      <div className="col-12">
        <label className="form-label" htmlFor="ticketCategory">Category</label>
        <select
          id="ticketCategory"
          className="form-select"
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
        >
          {TICKET_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div className="col-12">
        <label className="form-label" htmlFor="ticketMessage">
          Message <span className="text-danger">*</span>
        </label>
        <textarea
          id="ticketMessage"
          className="form-control"
          rows={4}
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <small className="text-body-secondary">{message.length}/500</small>
      </div>
      {error && (
        <div className="col-12">
          <div className="alert alert-danger mb-0" role="alert">{error}</div>
        </div>
      )}
      <div className="col-12">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />}
          Open case
        </button>
      </div>
    </form>
  );
}
