'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useToast } from '../../../../(app)/ToastProvider';
import { StaffDialog } from '../../../ui/StaffDialog';
import { useLang } from '../../../../../lib/i18n/LangProvider';
import { adminCommon } from '../../../../../lib/i18n/dict/admin-common';
import { adminCustomers } from '../../../../../lib/i18n/dict/admin-customers';
import { common } from '../../../../../lib/i18n/dict/common';

/**
 * Hak ediş düzeltme — RenameDialog'un akışıyla aynı: düğme → modal → kaydet
 * → toast + refresh. Sebep zorunlu (repo da reddediyor); müşterinin bunu
 * kendi akışında GÖRECEĞİ modalda açıkça yazıyor.
 *
 * State `<select>` seçenekleri (trial/active/past_due/cancelled) ham durum
 * KODU — veri, sözlüğe girmez (CustomerTable'ın aynı seçenekleriyle
 * tutarlı, bkz. Task 5 raporu).
 */
export function EntitlementDialog({
  orgId,
  current,
}: {
  orgId: string;
  current: { entitledSeats: number; entitlementState: string; trialEndsAt: string };
}) {
  const lang = useLang();
  const t = adminCustomers[lang].entitlementDialog;
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [seats, setSeats] = useState(String(current.entitledSeats));
  const [state, setState] = useState(current.entitlementState);
  const [trialEndsAt, setTrialEndsAt] = useState(current.trialEndsAt);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/orgs/${orgId}/entitlement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entitledSeats: Number(seats),
        entitlementState: state,
        ...(trialEndsAt ? { trialEndsAt } : {}),
        reason,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? common[lang].failedTryAgain);
      return;
    }
    toast('success', t.toastSuccess);
    setReason('');
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <button type="button" className="btn btn-primary w-100" onClick={() => setOpen(true)}>
        <i className="icon-base ti tabler-adjustments me-1" aria-hidden="true" />
        {t.editButton}
      </button>

      {open && (
        <StaffDialog
          title={t.title}
          subtitle={t.subtitle}
          labelledBy={t.title}
          busy={busy}
          onClose={() => setOpen(false)}
        >
          <form className="row g-6" onSubmit={submit}>
            <div className="col-4">
              <label className="form-label" htmlFor="entSeats">{t.seatsLabel}</label>
              <input
                id="entSeats"
                type="number"
                min={1}
                className="form-control"
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                required
              />
            </div>
            <div className="col-8">
              <label className="form-label" htmlFor="entState">{t.stateLabel}</label>
              <select
                id="entState"
                className="form-select"
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                <option value="trial">trial</option>
                <option value="active">active</option>
                <option value="past_due">past_due</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="entTrial">{t.trialEndsLabel}</label>
              <input
                id="entTrial"
                type="date"
                className="form-control"
                value={trialEndsAt}
                onChange={(e) => setTrialEndsAt(e.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="entReason">
                {adminCommon[lang].reason} <span className="text-danger">*</span>
              </label>
              <input
                id="entReason"
                className="form-control"
                placeholder={t.reasonPlaceholder}
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
                {busy && (
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                )}
                {common[lang].save}
              </button>
              <button
                type="button"
                className="btn btn-label-secondary"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                {common[lang].cancel}
              </button>
            </div>
          </form>
        </StaffDialog>
      )}
    </>
  );
}
