'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { support as supportDict } from '../../../../../lib/i18n/dict/support';
import { useLang } from '../../../../../lib/i18n/LangProvider';
import { useToast } from '../../../ToastProvider';

/**
 * Cevap formu — `NewTicketForm` ile aynı ağ hatası deseni (Dalga A minor,
 * review bulgusu): `fetch` try/catch içinde, `finally` her yolda `busy`yi
 * sıfırlar (ağ hatasında düğme sonsuza dek kilitli kalmaz). Başarıda
 * textarea temizlenir + toast + `router.refresh()` — sunucu bileşeni
 * (`[id]/page.tsx`) iplik + durum rozetini yeniden okur, yeni balon ve
 * olası `waiting_customer→open` otomasyonu anında görünür (repo tarafı
 * zaten transaction içinde, spec §3).
 *
 * Kart başlığı ("Your reply"/"Cevabın") üstte zaten görünür durumda —
 * textarea etiketi burada `visually-hidden` (çift başlık tekrarı yok,
 * erişilebilirlik için `<label>` yine de var).
 */
export function ReplyForm({ caseId }: { caseId: string }) {
  const router = useRouter();
  const toast = useToast();
  const lang = useLang();
  const t = supportDict[lang].detail.replyForm;
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/${caseId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        setError(t.errors.generic);
        return;
      }
      toast('success', t.sentToast);
      setBody('');
      router.refresh();
    } catch {
      setError(t.errors.network);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="row g-3" onSubmit={submit}>
      <div className="col-12">
        <label className="form-label visually-hidden" htmlFor="caseReplyBody">
          {t.label}
        </label>
        <textarea
          id="caseReplyBody"
          className="form-control"
          rows={3}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <small className="text-body-secondary">{body.length}/2000</small>
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
