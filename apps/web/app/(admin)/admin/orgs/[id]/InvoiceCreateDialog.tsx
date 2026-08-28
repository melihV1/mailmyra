'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useToast } from '../../../../(app)/ToastProvider';
import { StaffDialog } from '../../../ui/StaffDialog';
import { useLang } from '../../../../../lib/i18n/LangProvider';
import { adminCommon } from '../../../../../lib/i18n/dict/admin-common';
import { adminRevenue } from '../../../../../lib/i18n/dict/admin-revenue';
import { common } from '../../../../../lib/i18n/dict/common';

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
  const lang = useLang();
  const t = adminRevenue[lang].invoiceCreateDialog;
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
      setError(body.error ?? common[lang].failedTryAgain);
      return;
    }
    toast('success', t.toastIssued(number));
    setOpen(false);
    setAmount('');
    setReason('');
    router.refresh();
  };

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        <i className="icon-base ti tabler-plus me-1" aria-hidden="true" />
        {t.newInvoice}
      </button>

      {open && (
        <StaffDialog
          title={t.dialogTitle}
          subtitle={t.subtitle}
          labelledBy={t.dialogTitle}
          busy={busy}
          onClose={() => setOpen(false)}
        >
          <form className="row g-6" onSubmit={submit}>
            <div className="col-md-6">
              <label className="form-label" htmlFor="invNumber">{t.fields.number}</label>
              <input
                id="invNumber"
                className="form-control"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="invDue">{t.fields.dueDate}</label>
              <input
                id="invDue"
                type="date"
                className="form-control"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="invSeats">{t.fields.seats}</label>
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
                {t.fields.amountLabel} <span className="text-body-secondary">{t.fields.suggestedPrefix(suggested)}</span>
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
              <label className="form-label" htmlFor="invNote">{t.fields.note}</label>
              <input
                id="invNote"
                className="form-control"
                placeholder={t.fields.notePlaceholder}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="invReason">
                {adminCommon[lang].reason} <span className="text-danger">*</span>
              </label>
              <input
                id="invReason"
                className="form-control"
                placeholder={t.fields.reasonPlaceholder}
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
                {t.dialogTitle}
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
