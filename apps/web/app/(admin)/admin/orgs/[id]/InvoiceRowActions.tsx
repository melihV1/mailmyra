'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Satır eylemleri. `paid` ayrı yol: tarih + yöntem + dekont ister
 * (muhasebe kaydı); void/geri açma yalnız sebep ister. Fatura silme YOK.
 */
export function InvoiceRowActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'paid' | 'void' | 'due'>('idle');
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const res =
      mode === 'paid'
        ? await fetch(`/api/admin/invoices/${id}/paid`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paidAt: new Date().toISOString(),
              method,
              reference: reference || undefined,
              reason,
            }),
          })
        : await fetch(`/api/admin/invoices/${id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: mode, reason }),
          });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Failed.');
      return;
    }
    setMode('idle');
    setReason('');
    setReference('');
    router.refresh();
  }

  if (mode === 'idle') {
    return (
      <div className="d-flex gap-1 justify-content-end">
        {status === 'due' && (
          <>
            <button type="button" className="btn btn-label-success btn-xs" onClick={() => setMode('paid')}>
              Mark paid
            </button>
            <button type="button" className="btn btn-label-secondary btn-xs" onClick={() => setMode('void')}>
              Void
            </button>
          </>
        )}
        {status === 'paid' && (
          <button type="button" className="btn btn-label-warning btn-xs" onClick={() => setMode('due')}>
            Reopen
          </button>
        )}
        {status === 'void' && (
          <button type="button" className="btn btn-label-warning btn-xs" onClick={() => setMode('due')}>
            Reopen
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-2" style={{ minWidth: 240 }}>
      {error && <div className="alert alert-danger py-1 small mb-0">{error}</div>}
      {mode === 'paid' && (
        <>
          <select className="form-select form-select-sm" aria-label="Payment method" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="bank_transfer">Bank transfer</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>
          <input
            className="form-control form-control-sm"
            placeholder="Bank / payment reference"
            aria-label="Payment reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </>
      )}
      <input
        className="form-control form-control-sm"
        placeholder="Reason (required)"
        aria-label="Reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="d-flex gap-1">
        <button type="button" className="btn btn-primary btn-xs" disabled={busy || !reason.trim()} onClick={() => void submit()}>
          {busy ? '…' : mode === 'paid' ? 'Record payment' : mode === 'void' ? 'Void invoice' : 'Reopen'}
        </button>
        <button type="button" className="btn btn-label-secondary btn-xs" onClick={() => setMode('idle')}>
          Cancel
        </button>
      </div>
    </div>
  );
}
