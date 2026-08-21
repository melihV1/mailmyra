'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useToast } from '../../../../(app)/ToastProvider';
import { useDropdown } from '../../../../(app)/navbar/useDropdown';
import { StaffDialog } from '../../../ui/StaffDialog';

/**
 * Fatura satır eylemleri — signatures RowActions deseni: üç-nokta dropdown,
 * her eylem kendi modalında. `paid` ayrı diyalog: muhasebe kaydı (tarih +
 * yöntem + dekont) ister; void/geri açma yalnız sebep. Silme YOK.
 */
export function InvoiceRowActions({
  id,
  number,
  status,
  buttonClassName = 'btn btn-icon btn-text-secondary rounded-pill dropdown-toggle hide-arrow',
}: {
  id: string;
  number: string;
  status: string;
  buttonClassName?: string;
}) {
  const { open, setOpen, ref } = useDropdown<HTMLDivElement>();
  const [dialog, setDialog] = useState<'paid' | 'void' | 'due' | null>(null);

  return (
    <>
      <div className="dropdown" ref={ref}>
        <button
          type="button"
          className={buttonClassName}
          aria-label={`Actions for ${number}`}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <i className="icon-base ti tabler-dots-vertical icon-md" aria-hidden="true" />
        </button>
        <ul
          className={`dropdown-menu dropdown-menu-end${open ? ' show' : ''}`}
          style={open ? { position: 'absolute', right: 0 } : undefined}
        >
          {status === 'due' && (
            <>
              <li>
                <button type="button" className="dropdown-item" onClick={() => { setOpen(false); setDialog('paid'); }}>
                  <i className="icon-base ti tabler-cash me-2" aria-hidden="true" />
                  Record payment
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button type="button" className="dropdown-item text-danger" onClick={() => { setOpen(false); setDialog('void'); }}>
                  <i className="icon-base ti tabler-file-x me-2" aria-hidden="true" />
                  Void invoice
                </button>
              </li>
            </>
          )}
          {status !== 'due' && (
            <li>
              <button type="button" className="dropdown-item" onClick={() => { setOpen(false); setDialog('due'); }}>
                <i className="icon-base ti tabler-rotate me-2" aria-hidden="true" />
                Reopen as due
              </button>
            </li>
          )}
        </ul>
      </div>

      {dialog === 'paid' && <PaidDialog id={id} number={number} onClose={() => setDialog(null)} />}
      {(dialog === 'void' || dialog === 'due') && (
        <StatusDialog id={id} number={number} target={dialog} onClose={() => setDialog(null)} />
      )}
    </>
  );
}

function PaidDialog({ id, number, onClose }: { id: string; number: string; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/invoices/${id}/paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paidAt, method, reference: reference || undefined, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Failed — try again.');
      return;
    }
    toast('success', `${number} marked paid.`);
    onClose();
    router.refresh();
  };

  return (
    <StaffDialog
      title={`Record payment — ${number}`}
      subtitle="This is a bookkeeping entry: when, how, and under which reference."
      labelledBy={`Record payment for ${number}`}
      busy={busy}
      onClose={onClose}
    >
      <form className="row g-6" onSubmit={submit}>
        <div className="col-md-6">
          <label className="form-label" htmlFor="paidAt">Paid on</label>
          <input id="paidAt" type="date" className="form-control" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="paidMethod">Method</label>
          <select id="paidMethod" className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="bank_transfer">Bank transfer</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="paidRef">Bank / payment reference</label>
          <input id="paidRef" className="form-control" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="paidReason">
            Reason <span className="text-danger">*</span>
          </label>
          <input id="paidReason" className="form-control" placeholder="e.g. transfer received, receipt attached to email" value={reason} onChange={(e) => setReason(e.target.value)} required />
        </div>
        {error && (
          <div className="col-12">
            <div className="alert alert-danger mb-0" role="alert">{error}</div>
          </div>
        )}
        <div className="col-12 text-center">
          <button type="submit" className="btn btn-primary me-3" disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />}
            Record payment
          </button>
          <button type="button" className="btn btn-label-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </StaffDialog>
  );
}

function StatusDialog({
  id,
  number,
  target,
  onClose,
}: {
  id: string;
  number: string;
  target: 'void' | 'due';
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/invoices/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: target, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Failed — try again.');
      return;
    }
    toast('success', target === 'void' ? `${number} voided.` : `${number} reopened as due.`);
    onClose();
    router.refresh();
  };

  return (
    <StaffDialog
      title={target === 'void' ? `Void ${number}?` : `Reopen ${number}?`}
      subtitle={
        target === 'void'
          ? 'The invoice is kept, never deleted. Any payment record on it is cleared.'
          : 'The invoice returns to due; its payment record is cleared.'
      }
      labelledBy={`${target} ${number}`}
      busy={busy}
      onClose={onClose}
    >
      <form className="row g-6" onSubmit={submit}>
        <div className="col-12">
          <label className="form-label" htmlFor="stReason">
            Reason <span className="text-danger">*</span>
          </label>
          <input id="stReason" className="form-control" value={reason} onChange={(e) => setReason(e.target.value)} required />
        </div>
        {error && (
          <div className="col-12">
            <div className="alert alert-danger mb-0" role="alert">{error}</div>
          </div>
        )}
        <div className="col-12 text-center">
          <button type="submit" className={`btn me-3 ${target === 'void' ? 'btn-danger' : 'btn-primary'}`} disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />}
            {target === 'void' ? 'Void invoice' : 'Reopen'}
          </button>
          <button type="button" className="btn btn-label-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </StaffDialog>
  );
}
