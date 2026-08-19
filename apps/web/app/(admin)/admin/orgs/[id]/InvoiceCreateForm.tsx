'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Fatura kesme. Tutar elle: seats×unit yalnız ÖNERİ olarak gösterilir,
 * kutuya otomatik yazılmaz — indirim ve düzeltme çarpıma sığmaz
 * (repo/invoices.ts kuralı). Numara önerisi de öneridir; çakışırsa sunucu
 * net hatayla döner (P2002 → "zaten kullanılmış").
 */
export function InvoiceCreateForm({
  orgId,
  suggestedSeats,
  nextNumber,
}: {
  orgId: string;
  suggestedSeats: number;
  nextNumber: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState(nextNumber);
  const [seats, setSeats] = useState(String(suggestedSeats));
  const [amount, setAmount] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggested = (Number(seats) || 0) * 1; // $1/koltuk/yıl

  async function create() {
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
      setError(body.error ?? 'Failed.');
      return;
    }
    setOpen(false);
    setAmount('');
    setReason('');
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        <i className="icon-base ti tabler-plus me-1" aria-hidden="true" />
        New invoice
      </button>
    );
  }

  return (
    <div className="border rounded p-3 d-flex flex-column gap-3">
      {error && (
        <div className="alert alert-danger py-2 small mb-0" role="alert">
          {error}
        </div>
      )}
      <div className="row g-2">
        <div className="col-md-4">
          <label className="form-label small" htmlFor="inv-number">Number</label>
          <input id="inv-number" className="form-control" value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>
        <div className="col-md-2">
          <label className="form-label small" htmlFor="inv-seats">Seats</label>
          <input id="inv-seats" type="number" min={1} className="form-control" value={seats} onChange={(e) => setSeats(e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label small" htmlFor="inv-amount">
            Amount (USD) — suggested {suggested.toFixed(2)}
          </label>
          <input id="inv-amount" type="number" step="0.01" min={0} className="form-control" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label small" htmlFor="inv-due">Due date</label>
          <input id="inv-due" type="date" className="form-control" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="form-label small" htmlFor="inv-note">Note on the invoice</label>
        <input id="inv-note" className="form-control" placeholder="Billing period, bank details…" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div>
        <label className="form-label small" htmlFor="inv-reason">
          Reason <span className="text-danger">*</span>
        </label>
        <input id="inv-reason" className="form-control" placeholder="Internal — audit log only" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div className="d-flex gap-2">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy || !reason.trim() || !amount || !number.trim()}
          onClick={() => void create()}
        >
          {busy ? 'Creating…' : 'Create invoice'}
        </button>
        <button type="button" className="btn btn-label-secondary btn-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
