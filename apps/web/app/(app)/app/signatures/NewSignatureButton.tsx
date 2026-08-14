'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { SignatureData } from '@mailmyra/renderer';

import { createEmptyData } from '../../../builder/reducer';

/**
 * "New signature" düz bir /builder linki DEĞİL: önce sunucuda kayıt açılır,
 * builder ?sig= ile düzenleme kipinde gelir ve otomatik kayıt hesaba yazar.
 * Link olarak bırakılsaydı builder taslak kipinde açılır, oturumlu
 * kullanıcının emeği yalnız tarayıcıda kalırdı (canlıda yaşandı, 2026-08-11).
 */
export function NewSignatureButton({
  seedData,
}: {
  /** Sunucuda `seedBrandDefaults` ile önceden bindirilmiş başlangıç verisi
   *  (T8) — orgın markası varsa kilitli + varsayılan alanlar baştan dolu
   *  gelir. Yoksa boş şablona düşülür. */
  seedData?: SignatureData;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const create = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch('/api/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Untitled signature', data: seedData ?? createEmptyData() }),
      });
      const body = (await res.json()) as { id?: string };
      if (res.ok && body.id) {
        router.push(`/builder?sig=${body.id}`);
        return;
      }
      setFailed(true);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  };

  return (
    <span className="d-inline-flex align-items-center gap-2">
      <button type="button" className="btn btn-primary" onClick={create} disabled={busy}>
        <i className="icon-base ti tabler-plus me-1" aria-hidden="true" />
        {busy ? 'Creating…' : 'New signature'}
      </button>
      {failed && <small className="text-danger">Could not create — try again.</small>}
    </span>
  );
}
