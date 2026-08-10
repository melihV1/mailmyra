'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import styles from './signatures.module.css';

export function RowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const duplicate = async () => {
    setBusy(true);
    const res = await fetch(`/api/signatures/${id}/duplicate`, { method: 'POST' });
    setBusy(false);
    if (res.ok) router.refresh();
  };

  const remove = async () => {
    // Onay metni CDN gerçeğini açıkça söylüyor (panel-brief §2.4): görsel
    // URL'leri kalıcıdır, imzayı silmek sahadaki kopyaları kırmaz.
    const sure = window.confirm(
      `Delete “${name}”?\n\nUploaded images stay on the CDN so copies of this signature already in use keep working.`,
    );
    if (!sure) return;
    setBusy(true);
    const res = await fetch(`/api/signatures/${id}`, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) router.refresh();
  };

  return (
    <span className={styles.actions}>
      <Link href={`/builder?sig=${id}`} className={styles.action}>
        Edit
      </Link>
      <button type="button" className={styles.action} onClick={duplicate} disabled={busy}>
        Duplicate
      </button>
      <button type="button" className={styles.actionDanger} onClick={remove} disabled={busy}>
        Delete
      </button>
    </span>
  );
}
