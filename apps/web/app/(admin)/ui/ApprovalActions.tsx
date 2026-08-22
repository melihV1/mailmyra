'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useToast } from '../../(app)/ToastProvider';
import type { ApprovalQueueRow } from '../operations-model';
import { StaffDialog } from './StaffDialog';

export type ApprovalAction = 'approve' | 'reject' | 'cancel';

/**
 * Karar butonları — diyaloğu KENDİ İÇİNDE AÇMAZ. Bu butonlar detay
 * panelinin içinde duruyor ve o panel zaten bir modal; ikinci modalı onun
 * ÇOCUĞU olarak render etmek iki modalı üst üste bindirir (yaşandı, canlı
 * 2026-08-22: iki kapatma düğmesi, kaymış kutu, iki kat koyu zemin).
 * Bu yüzden bileşen yalnız hangi eylemin seçildiğini bildirir; diyaloğu
 * çağıran taraf detay panelinin YERİNE, kardeş olarak açar.
 *
 * Yalnız `pending` satırda görünür; çağıran taraf unutsa bile burada da
 * kontrol edilir.
 */
export function ApprovalActionButtons({
  row,
  onPick,
}: {
  row: ApprovalQueueRow;
  onPick: (action: ApprovalAction) => void;
}) {
  if (row.status !== 'pending') return null;

  return (
    <>
      <button type="button" className="btn btn-success btn-sm" onClick={() => onPick('approve')}>
        Approve
      </button>
      <button type="button" className="btn btn-danger btn-sm" onClick={() => onPick('reject')}>
        Reject
      </button>
      <button type="button" className="btn btn-label-secondary btn-sm" onClick={() => onPick('cancel')}>
        Cancel
      </button>
    </>
  );
}

/**
 * Seçilen eylemin sebep formu — InvoiceRowActions deseni: sebep zorunlu,
 * fetch → hata satır içinde → toast + router.refresh().
 *
 * `onClose`: forma vazgeçildi, detay paneline dönülür.
 * `onDone`: eylem BAŞARILI — çağıran taraf tıklama anındaki satır kopyasını
 * (`selected`) temizler; aksi halde panel eski durumu gösterir ve ikinci
 * tıklama sunucudan "artık kararda değil" hatası alır.
 */
export function ApprovalActionDialog({
  row,
  action,
  onClose,
  onDone,
}: {
  row: ApprovalQueueRow;
  action: ApprovalAction;
  onClose: () => void;
  onDone?: () => void;
}) {
  if (action === 'cancel') return <CancelDialog row={row} onClose={onClose} onDone={onDone} />;
  return <DecisionDialog row={row} decision={action} onClose={onClose} onDone={onDone} />;
}

function DecisionDialog({
  row,
  decision,
  onClose,
  onDone,
}: {
  row: ApprovalQueueRow;
  decision: 'approve' | 'reject';
  onClose: () => void;
  onDone?: () => void;
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
    const res = await fetch(`/api/admin/approvals/${row.id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, reason }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; status?: string };
    setBusy(false);
    if (!res.ok) {
      setError(body.error ?? 'Failed — try again.');
      return;
    }
    // Karar 'approve' olsa da eşik dolmadıysa API 'pending' döner — talep
    // hâlâ açık, kutlama tonundaki mesaj yanlış olur.
    toast(
      'success',
      body.status === 'pending'
        ? 'Decision recorded — still pending.'
        : decision === 'approve'
          ? 'Request approved.'
          : 'Request rejected.',
    );
    onClose();
    onDone?.();
    router.refresh();
  };

  return (
    <StaffDialog
      title={decision === 'approve' ? `Approve — ${row.title}` : `Reject — ${row.title}`}
      subtitle={
        decision === 'approve'
          ? `${row.approvals + 1}/${row.requiredApprovals} approvals once this decision is recorded.`
          : 'A single rejection closes the request.'
      }
      labelledBy={`${decision === 'approve' ? 'Approve' : 'Reject'} ${row.title}`}
      busy={busy}
      onClose={onClose}
    >
      <form className="row g-6" onSubmit={submit}>
        <div className="col-12">
          <label className="form-label" htmlFor="apprDecisionReason">
            Reason <span className="text-danger">*</span>
          </label>
          <input
            id="apprDecisionReason"
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
          <button
            type="submit"
            className={`btn me-3 ${decision === 'approve' ? 'btn-success' : 'btn-danger'}`}
            disabled={busy}
          >
            {busy && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />}
            {decision === 'approve' ? 'Approve' : 'Reject'}
          </button>
          <button type="button" className="btn btn-label-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </StaffDialog>
  );
}

function CancelDialog({
  row,
  onClose,
  onDone,
}: {
  row: ApprovalQueueRow;
  onClose: () => void;
  onDone?: () => void;
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
    const res = await fetch(`/api/admin/approvals/${row.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Failed — try again.');
      return;
    }
    toast('success', 'Request cancelled.');
    onClose();
    onDone?.();
    router.refresh();
  };

  return (
    <StaffDialog
      title={`Cancel — ${row.title}`}
      subtitle="The request stays in the ledger; it only drops out of the active queue."
      labelledBy={`Cancel ${row.title}`}
      busy={busy}
      onClose={onClose}
    >
      <form className="row g-6" onSubmit={submit}>
        <div className="col-12">
          <label className="form-label" htmlFor="apprCancelReason">
            Reason <span className="text-danger">*</span>
          </label>
          <input
            id="apprCancelReason"
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
          <button type="submit" className="btn btn-danger me-3" disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />}
            Cancel request
          </button>
          <button type="button" className="btn btn-label-secondary" onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>
      </form>
    </StaffDialog>
  );
}

/**
 * Yeni onay talebi açma diyaloğu — InvoiceCreateDialog deseni: sayfa
 * başlığında sabit buton, form gönderiminde diyalog kapanır ve sayfa
 * yenilenir. Hiçbir şeyi otomatik uygulamaz; yalnız karar defterine kayıt
 * açar.
 */
export function NewApprovalButton() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState<'entitlement' | 'billing' | 'security' | 'platform'>('entitlement');
  const [riskLevel, setRiskLevel] = useState<'medium' | 'high' | 'critical'>('medium');
  const [orgId, setOrgId] = useState('');
  const [requiredApprovals, setRequiredApprovals] = useState('1');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        domain,
        riskLevel,
        orgId: orgId || undefined,
        requiredApprovals: requiredApprovals ? Number(requiredApprovals) : undefined,
        reason,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Failed — try again.');
      return;
    }
    toast('success', 'Approval request created.');
    setOpen(false);
    setTitle('');
    setDomain('entitlement');
    setRiskLevel('medium');
    setOrgId('');
    setRequiredApprovals('1');
    setReason('');
    router.refresh();
  };

  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        <i className="icon-base ti tabler-plus me-1" aria-hidden="true" />
        New approval request
      </button>

      {open && (
        <StaffDialog
          title="New approval request"
          subtitle="Opens a decision-ledger entry — nothing is applied automatically."
          labelledBy="New approval request"
          busy={busy}
          onClose={() => setOpen(false)}
        >
          <form className="row g-6" onSubmit={submit}>
            <div className="col-12">
              <label className="form-label" htmlFor="apprTitle">Title</label>
              <input
                id="apprTitle"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="apprDomain">Domain</label>
              <select
                id="apprDomain"
                className="form-select"
                value={domain}
                onChange={(e) => setDomain(e.target.value as typeof domain)}
              >
                <option value="entitlement">Entitlement</option>
                <option value="billing">Billing</option>
                <option value="security">Security</option>
                <option value="platform">Platform</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="apprRisk">Risk level</label>
              <select
                id="apprRisk"
                className="form-select"
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as typeof riskLevel)}
              >
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="apprOrgId">Org id</label>
              <input
                id="apprOrgId"
                className="form-control"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              />
              <small className="text-body-secondary">Org id — leave blank for a platform-wide record.</small>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="apprRequired">Required approvals</label>
              <input
                id="apprRequired"
                type="number"
                min={1}
                max={3}
                className="form-control"
                value={requiredApprovals}
                onChange={(e) => setRequiredApprovals(e.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="apprReason">
                Reason <span className="text-danger">*</span>
              </label>
              <input
                id="apprReason"
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
                Create request
              </button>
              <button type="button" className="btn btn-label-secondary" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </button>
            </div>
          </form>
        </StaffDialog>
      )}
    </>
  );
}
