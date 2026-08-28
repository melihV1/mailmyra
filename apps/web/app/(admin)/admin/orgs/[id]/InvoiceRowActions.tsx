'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useToast } from '../../../../(app)/ToastProvider';
import { useDropdown } from '../../../../(app)/navbar/useDropdown';
import { StaffDialog } from '../../../ui/StaffDialog';
import { useLang } from '../../../../../lib/i18n/LangProvider';
import { adminCommon } from '../../../../../lib/i18n/dict/admin-common';
import { adminRevenue } from '../../../../../lib/i18n/dict/admin-revenue';
import { common } from '../../../../../lib/i18n/dict/common';

/**
 * Fatura satır eylemleri — signatures RowActions deseni: üç-nokta dropdown,
 * her eylem kendi modalında. `paid` ayrı diyalog: muhasebe kaydı (tarih +
 * yöntem + dekont) ister; void/geri açma yalnız sebep. Silme YOK.
 *
 * `method` `<select>` seçenekleri (bank_transfer/cash/other) hem burada
 * hem InvoiceWorkbenchView'in salt-okunur önizlemesinde aynı üç insan-okur
 * etiketle görünür — paylaşılan `adminRevenue.paymentMethod` tablosu.
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
  const lang = useLang();
  const t = adminRevenue[lang].invoiceRowActions;
  const { open, setOpen, ref } = useDropdown<HTMLDivElement>();
  const [dialog, setDialog] = useState<'paid' | 'void' | 'due' | null>(null);

  return (
    <>
      <div className="dropdown" ref={ref}>
        <button
          type="button"
          className={buttonClassName}
          aria-label={t.actionsAria(number)}
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
                  {t.menu.recordPayment}
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button type="button" className="dropdown-item text-danger" onClick={() => { setOpen(false); setDialog('void'); }}>
                  <i className="icon-base ti tabler-file-x me-2" aria-hidden="true" />
                  {t.menu.voidInvoice}
                </button>
              </li>
            </>
          )}
          {status !== 'due' && (
            <li>
              <button type="button" className="dropdown-item" onClick={() => { setOpen(false); setDialog('due'); }}>
                <i className="icon-base ti tabler-rotate me-2" aria-hidden="true" />
                {t.menu.reopenAsDue}
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
  const lang = useLang();
  const t = adminRevenue[lang].invoiceRowActions.paidDialog;
  const tm = adminRevenue[lang].invoiceRowActions.menu;
  const tp = adminRevenue[lang].paymentMethod;
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
      setError(body.error ?? common[lang].failedTryAgain);
      return;
    }
    toast('success', t.toast(number));
    onClose();
    router.refresh();
  };

  return (
    <StaffDialog
      title={t.titlePrefix(number)}
      subtitle={t.subtitle}
      labelledBy={t.labelledBy(number)}
      busy={busy}
      onClose={onClose}
    >
      <form className="row g-6" onSubmit={submit}>
        <div className="col-md-6">
          <label className="form-label" htmlFor="paidAt">{t.fields.paidOn}</label>
          <input id="paidAt" type="date" className="form-control" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="paidMethod">{t.fields.method}</label>
          <select id="paidMethod" className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="bank_transfer">{tp.bankTransfer}</option>
            <option value="cash">{tp.cash}</option>
            <option value="other">{tp.other}</option>
          </select>
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="paidRef">{t.fields.reference}</label>
          <input id="paidRef" className="form-control" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="paidReason">
            {adminCommon[lang].reason} <span className="text-danger">*</span>
          </label>
          <input id="paidReason" className="form-control" placeholder={t.fields.reasonPlaceholder} value={reason} onChange={(e) => setReason(e.target.value)} required />
        </div>
        {error && (
          <div className="col-12">
            <div className="alert alert-danger mb-0" role="alert">{error}</div>
          </div>
        )}
        <div className="col-12 text-center">
          <button type="submit" className="btn btn-primary me-3" disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />}
            {tm.recordPayment}
          </button>
          <button type="button" className="btn btn-label-secondary" onClick={onClose} disabled={busy}>
            {common[lang].cancel}
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
  const lang = useLang();
  const t = adminRevenue[lang].invoiceRowActions;
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
      setError(body.error ?? common[lang].failedTryAgain);
      return;
    }
    toast('success', target === 'void' ? t.statusDialog.voidToast(number) : t.statusDialog.reopenToast(number));
    onClose();
    router.refresh();
  };

  return (
    <StaffDialog
      title={target === 'void' ? t.statusDialog.voidTitle(number) : t.statusDialog.reopenTitle(number)}
      subtitle={
        target === 'void'
          ? t.statusDialog.voidSubtitle
          : t.statusDialog.reopenSubtitle
      }
      labelledBy={target === 'void' ? t.statusDialog.voidLabelledBy(number) : t.statusDialog.reopenLabelledBy(number)}
      busy={busy}
      onClose={onClose}
    >
      <form className="row g-6" onSubmit={submit}>
        <div className="col-12">
          <label className="form-label" htmlFor="stReason">
            {adminCommon[lang].reason} <span className="text-danger">*</span>
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
            {target === 'void' ? t.menu.voidInvoice : t.statusDialog.reopenSubmit}
          </button>
          <button type="button" className="btn btn-label-secondary" onClick={onClose} disabled={busy}>
            {common[lang].cancel}
          </button>
        </div>
      </form>
    </StaffDialog>
  );
}
