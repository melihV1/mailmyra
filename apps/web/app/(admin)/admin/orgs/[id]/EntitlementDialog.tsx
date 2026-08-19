'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useToast } from '../../../../(app)/ToastProvider';
import { StaffDialog } from '../../../ui/StaffDialog';

/**
 * Hak ediş düzeltme — RenameDialog'un akışıyla aynı: düğme → modal → kaydet
 * → toast + refresh. Sebep zorunlu (repo da reddediyor); müşterinin bunu
 * kendi akışında GÖRECEĞİ modalda açıkça yazıyor.
 */
export function EntitlementDialog({
  orgId,
  current,
}: {
  orgId: string;
  current: { entitledSeats: number; entitlementState: string; trialEndsAt: string };
}) {
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
      setError(body.error ?? 'Failed — try again.');
      return;
    }
    toast('success', 'Entitlement updated — the customer sees this in their activity.');
    setReason('');
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <button type="button" className="btn btn-primary w-100" onClick={() => setOpen(true)}>
        <i className="icon-base ti tabler-adjustments me-1" aria-hidden="true" />
        Edit entitlement
      </button>

      {open && (
        <StaffDialog
          title="Edit entitlement"
          subtitle="The customer sees this change in their activity stream, attributed to Mailmyra support."
          labelledBy="Edit entitlement"
          busy={busy}
          onClose={() => setOpen(false)}
        >
          <form className="row g-6" onSubmit={submit}>
            <div className="col-4">
              <label className="form-label" htmlFor="entSeats">Seats</label>
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
              <label className="form-label" htmlFor="entState">State</label>
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
              <label className="form-label" htmlFor="entTrial">Trial ends</label>
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
                Reason <span className="text-danger">*</span>
              </label>
              <input
                id="entReason"
                className="form-control"
                placeholder="Goes into the immutable action log"
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
                Save
              </button>
              <button
                type="button"
                className="btn btn-label-secondary"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
        </StaffDialog>
      )}
    </>
  );
}
