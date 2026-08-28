'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useLang } from '../../../lib/i18n/LangProvider';
import { adminCommon } from '../../../lib/i18n/dict/admin-common';

/** Başlıktaki "yenile" — sayfa force-dynamic, refresh gerçek veri çeker. */
export function RefreshButton() {
  const lang = useLang();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-icon btn-text-secondary rounded-pill btn-sm"
      aria-label={adminCommon[lang].refresh}
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
