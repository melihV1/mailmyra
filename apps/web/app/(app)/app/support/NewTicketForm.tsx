'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { support as supportDict } from '../../../../lib/i18n/dict/support';
import { useLang } from '../../../../lib/i18n/LangProvider';
import { useToast } from '../../ToastProvider';
import { TICKET_CATEGORIES } from './support-labels';

/**
 * Vaka açma formu — öncelik SORULMAZ ('normal' sabit, staff panelden
 * yükseltir); org + e-posta oturumdan gelir, kullanıcı yazmaz (onaylı
 * kapsam). Başarıda referans toast'ta söylenir, liste refresh'le tazelenir.
 *
 * `fetch` try/catch içinde (Dalga A minor, review bulgusu): ağ hatasında
 * (bağlantı koptu, DNS vb.) eski kod `await fetch` reddiyle sessizce
 * çökerdi — `busy` sonsuza dek true kalır, düğme kilitli takılırdı.
 * `finally` her yolda (başarı/API hatası/ağ hatası) `busy`yi sıfırlar.
 */
export function NewTicketForm() {
  const router = useRouter();
  const toast = useToast();
  const lang = useLang();
  const t = supportDict[lang].form;
  const categories = TICKET_CATEGORIES(lang);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]['value']>('billing');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, category, message }),
      });
      if (!res.ok) {
        setError(t.errors.generic);
        return;
      }
      const data = (await res.json()) as { reference?: string };
      toast('success', t.openedToast(data.reference ?? ''));
      setSubject('');
      setCategory('billing');
      setMessage('');
      router.refresh();
    } catch {
      setError(t.errors.network);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="row g-4" onSubmit={submit}>
      <div className="col-12">
        <label className="form-label" htmlFor="ticketSubject">
          {t.subjectLabel} <span className="text-danger">*</span>
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
        <label className="form-label" htmlFor="ticketCategory">{t.categoryLabel}</label>
        <select
          id="ticketCategory"
          className="form-select"
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div className="col-12">
        <label className="form-label" htmlFor="ticketMessage">
          {t.messageLabel} <span className="text-danger">*</span>
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
          {t.submit}
        </button>
      </div>
    </form>
  );
}
