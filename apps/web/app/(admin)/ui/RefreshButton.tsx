'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Başlıktaki "yenile" — sayfa force-dynamic, refresh gerçek veri çeker. */
export function RefreshButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-icon btn-text-secondary rounded-pill btn-sm"
      aria-label="Refresh"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        router.refresh();
        window.setTimeout(() => setBusy(false), 600);
      }}
    >
      <i
        className={`icon-base ti tabler-refresh${busy ? ' icon-spin' : ''}`}
        aria-hidden="true"
      />
    </button>
  );
}
