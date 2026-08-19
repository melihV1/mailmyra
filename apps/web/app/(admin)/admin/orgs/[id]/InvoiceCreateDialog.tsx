'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useToast } from '../../../../(app)/ToastProvider';
import { StaffDialog } from '../../../ui/StaffDialog';

/**
 * Fatura kesme diyaloğu. Tutar elle — seats×unit yalnız öneri (repo
 * kuralı). Numara çakışırsa sunucu net hatayla döner, form açık kalır.
 */
export function InvoiceCreateDialog({
  orgId,
  suggestedSeats,
  nextNumber,
}: {
  orgId: string;
  suggestedSeats: number;
  nextNumber: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState(nextNumber);
  const [seats, setSeats] = useState(String(suggestedSeats));
  const [amount, setAmount] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggested = ((Number(seats) || 0) * 1).toFixed(2); // $1/koltuk/yıl

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgId,
        number,
        issuedAt: new Date().toISOString(),
        ...(dueAt ? { dueAt } : {}),
        seats: Number(seats),
        amountCents: Math.round(Number(amount) * 100),
        note: note || undefined,
        reason,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Failed — try again.');
      return;
    }
    toast('success', `Invoice ${number} issued.`);
    setOpen(false);
    setAmount('');
    setReason('');
    router.refresh();
  };

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        <i className="icon-base ti tabler-plus me-1" aria-hidden="true" />
        New invoice
      </button>

      {open && (
        <StaffDialog
          title="Issue invoice"
          subtitle="The amount is authoritative — the seat suggestion is only a starting point."
          labelledBy="Issue invoice"
          busy={busy}
          onClose={() => setOpen(false)}
        >
          <form className="row g-6" onSubmit={submit}>
            <div className="col-md-6">
              <label className="form-label" htmlFor="invNumber">Number</label>
              <input
                id="invNumber"
                className="form-control"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="invDue">Due date</label>
              <input
                id="invDue"
                type="date"
                className="form-control"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="invSeats">Seats</label>
              <input
                id="invSeats"
                type="number"
                min={1}
                className="form-control"
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="invAmount">
                Amount (USD) <span className="text-body-secondary">— suggested {suggested}</span>
              </label>
              <input
                id="invAmount"
                type="number"
                step="0.01"
                min={0}
                className="form-control"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="invNote">Note on the invoice</label>
              <input
                id="invNote"
                className="form-control"
                placeholder="Billing period, bank details…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="invReason">
                Reason <span className="text-danger">*</span>
              </label>
              <input
                id="invReason"
                className="form-control"
                placeholder="Internal — action log only"
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
                Issue invoice
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
