'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createEmptyData } from '../../../builder/reducer';
import styles from './signatures.module.css';

/**
 * "New signature" düz bir /builder linki DEĞİL: önce sunucuda kayıt açılır,
 * builder ?sig= ile düzenleme kipinde gelir ve otomatik kayıt hesaba yazar.
 * Link olarak bırakılsaydı builder taslak kipinde açılır, oturumlu
 * kullanıcının emeği yalnız tarayıcıda kalırdı (canlıda yaşandı, 2026-08-11).
 */
export function NewSignatureButton() {
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
        body: JSON.stringify({ name: 'Untitled signature', data: createEmptyData() }),
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
    <span className={styles.newWrap}>
      <button type="button" className={styles.primary} onClick={create} disabled={busy}>
        {busy ? 'Creating…' : 'New signature'}
      </button>
      {failed && <span className={styles.newError}>Could not create — try again.</span>}
    </span>
  );
}
