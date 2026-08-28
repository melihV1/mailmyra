'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useToast } from '../../(app)/ToastProvider';
import { adminCommon } from '../../../lib/i18n/dict/admin-common';
import { adminPlatform } from '../../../lib/i18n/dict/admin-platform';
import { common } from '../../../lib/i18n/dict/common';
import { useLang } from '../../../lib/i18n/LangProvider';
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
  const lang = useLang();
  const t = adminPlatform[lang];
  return (
    <button type="button" className="btn btn-sm btn-label-info" onClick={() => onPick('state')}>
      {t.errorActions.changeStatus}
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
  const lang = useLang();
  const t = adminPlatform[lang];
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
      setError(body.error ?? common[lang].failedTryAgain);
      return;
    }
    toast('success', t.errorActions.toast(state));
    onClose();
    onDone?.();
    router.refresh();
  };

  return (
    <StaffDialog
      title={t.errorActions.title(row.title)}
      subtitle={t.errorActions.onlyReachable}
      labelledBy={t.errorActions.labelledBy(row.title)}
      busy={busy}
      onClose={onClose}
    >
      <form className="row g-6" onSubmit={submit}>
        <div className="col-12">
          <label className="form-label" htmlFor="errorStateTarget">{t.errorActions.targetStatusLabel}</label>
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
            {adminCommon[lang].reason} <span className="text-danger">*</span>
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
            {t.errorActions.changeStatus}
          </button>
          <button type="button" className="btn btn-label-secondary" onClick={onClose} disabled={busy}>
            {common[lang].cancel}
          </button>
        </div>
      </form>
    </StaffDialog>
  );
}
