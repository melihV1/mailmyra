'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useToast } from '../../(app)/ToastProvider';
import type { ErrorGroupRow } from '../platform-operations-model';
import { StaffDialog } from './StaffDialog';

/**
 * İzinli durum geçişleri — `lib/repo/admin.ts`taki `ERROR_TRANSITIONS`in
 * AYNASI (SupportActions'taki `SUPPORT_STATUS_TARGETS` emsali).
 */
const ERROR_STATE_TARGETS: Record<ErrorGroupRow['state'], ErrorGroupRow['state'][]> = {
  open: ['investigating', 'resolved'],
  investigating: ['open', 'resolved'],
  resolved: ['open'],
};

export type ErrorAction = 'state';

/**
 * Hata grubu satır eylemi — tek eylem türü var (durum) ama yine de
 * buttons-emit-picks deseni korunur: diyaloğu KENDİ İÇİNDE AÇMAZ, seçimi
 * dışarı bildirir; diyalog çağıran tarafta kardeş olarak açılır
 * (ApprovalActions/SupportActions emsali).
 */
export function ErrorActionButtons({ onPick }: { onPick: (action: ErrorAction) => void }) {
  return (
    <button type="button" className="btn btn-sm btn-primary" onClick={() => onPick('state')}>
      Change status
    </button>
  );
}

/** Seçilen eylemin sebep formu — detay panelinin yerine açılır. */
export function ErrorActionDialog({
  row,
  onClose,
  onDone,
}: {
  row: ErrorGroupRow;
  action: ErrorAction;
  onClose: () => void;
  onDone?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const targets = ERROR_STATE_TARGETS[row.state];
  const [state, setState] = useState<ErrorGroupRow['state']>(targets[0] ?? row.state);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/errors/${row.id}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Failed — try again.');
      return;
    }
    toast('success', `Status moved to ${state}.`);
    onClose();
    onDone?.();
    router.refresh();
  };

  return (
    <StaffDialog
      title={`Change status — ${row.title}`}
      subtitle="Only the statuses reachable from the current one are offered."
      labelledBy={`Change status ${row.title}`}
      busy={busy}
      onClose={onClose}
    >
      <form className="row g-6" onSubmit={submit}>
        <div className="col-12">
          <label className="form-label" htmlFor="errorStateTarget">Target status</label>
          <select
            id="errorStateTarget"
            className="form-select"
            value={state}
            onChange={(e) => setState(e.target.value as ErrorGroupRow['state'])}
          >
            {targets.map((target) => (
              <option key={target} value={target}>{target}</option>
            ))}
          </select>
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="errorStateReason">
            Reason <span className="text-danger">*</span>
          </label>
          <input
            id="errorStateReason"
            className="form-control"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>
        {error && (
          <div className="col-12">
            <div className="alert alert-danger mb-0" role="alert">{error}</div>
          </div>
        )}
        <div className="col-12 text-center">
          <button type="submit" className="btn btn-primary me-3" disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />}
            Change status
          </button>
          <button type="button" className="btn btn-label-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </StaffDialog>
  );
}
