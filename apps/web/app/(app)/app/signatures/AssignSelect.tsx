'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * İmzayı bir göndericiye bağlar. Publish'in anlamını tamamlayan bağ bu:
 * "bu KİŞİNİN şu imzası kullanımda." Boş seçenek bağı çözer.
 */
export function AssignSelect({
  signatureId,
  current,
  senders,
}: {
  signatureId: string;
  current: string | null;
  senders: Array<{ id: string; displayName: string }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const change = async (value: string) => {
    setBusy(true);
    setFailed(false);
    const res = await fetch(`/api/signatures/${signatureId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderIdentityId: value === '' ? null : value }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setFailed(true);
  };

  return (
    <span className="d-inline-flex align-items-center gap-2">
      <select
        className="form-select form-select-sm w-auto"
        value={current ?? ''}
        onChange={(e) => void change(e.target.value)}
        disabled={busy}
        aria-label="Assign to sender"
      >
        <option value="">Unassigned</option>
        {senders.map((s) => (
          <option key={s.id} value={s.id}>
            {s.displayName}
          </option>
        ))}
      </select>
      {failed && <small className="text-danger">Could not assign.</small>}
    </span>
  );
}
