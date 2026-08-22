'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useToast } from '../../(app)/ToastProvider';
import type { StaffChangeRequestRow } from '../operations-model';
import { StaffDialog } from './StaffDialog';

/**
 * `setStaffFlag`in kendi normalizasyonuyla BİREBİR aynı olmalı
 * (`targetEmail.trim().toLowerCase().slice(0, 64)`, bkz. `lib/repo/admin.ts`)
 * — talep açarken burada yazılan `targetId`, icra anında sunucunun tekrar
 * hesapladığı değerle eşleşmezse onaylanmış talep hiç bulunamaz.
 */
function normalizeStaffEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, 64);
}

/**
 * Staff yetkisi değişikliği talebi açar — mevcut
 * `createApprovalRequest`/`NewApprovalButton` yolunu kullanır, kendi ekranını
 * icat etmez. `domain 'security'`, `targetType 'staff_grant'|'staff_revoke'`,
 * `targetId` normalize edilmiş hedef e-posta, başlık otomatik. Karar
 * (approve/reject) BURADA değil, mevcut Security → Approvals akışında.
 * Bu diyalog hiçbir şeyi uygulamaz — yalnız karar defterine kayıt açar
 * (İLKE: talep → karar → icra, üçü ayrı adım).
 */
export function RequestStaffChangeButton() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [action, setAction] = useState<'grant' | 'revoke'>('grant');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const targetId = normalizeStaffEmail(email);
    const targetType = action === 'grant' ? 'staff_grant' : 'staff_revoke';
    const title = `${action === 'grant' ? 'Grant staff' : 'Revoke staff'} — ${targetId}`;
    const res = await fetch('/api/admin/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, domain: 'security', riskLevel: 'critical', targetType, targetId, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Failed — try again.');
      return;
    }
    toast('success', 'Request opened — decide it from Security → Approvals.');
    setOpen(false);
    setEmail('');
    setAction('grant');
    setReason('');
    router.refresh();
  };

  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        <i className="icon-base ti tabler-shield-plus me-1" aria-hidden="true" />
        Request staff change
      </button>

      {open && (
        <StaffDialog
          title="Request staff change"
          subtitle="Opens a decision-ledger entry. Nothing is granted or revoked until it is approved and executed."
          labelledBy="Request staff change"
          busy={busy}
          onClose={() => setOpen(false)}
        >
          <form className="row g-6" onSubmit={submit}>
            <div className="col-md-6">
              <label className="form-label" htmlFor="staffRequestEmail">
                Target email <span className="text-danger">*</span>
              </label>
              <input
                id="staffRequestEmail"
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="staffRequestAction">Action</label>
              <select
                id="staffRequestAction"
                className="form-select"
                value={action}
                onChange={(e) => setAction(e.target.value as typeof action)}
              >
                <option value="grant">Grant staff access</option>
                <option value="revoke">Revoke staff access</option>
              </select>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="staffRequestReason">
                Reason <span className="text-danger">*</span>
              </label>
              <input
                id="staffRequestReason"
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

/**
 * Onaylanmış, HENÜZ İCRA EDİLMEMİŞ bir staff-değişikliği talebini icra
 * eder — onayın İLK gerçek icrası. `request.targetType` zaten sunucudaki
 * talebi belirlediği için `grant` burada TÜRETİLİR (`'staff_grant'`),
 * ikinci bir seçim sunulmaz — kullanıcı yanlışlıkla ters yönde icra
 * gönderemez. Kendi diyaloğunu KENDİ İÇİNDE açar (ApprovalActions'taki
 * "iç içe modal" sorunu burada yok: bu buton bir StaffDialog'un İÇİNDE
 * değil, satırın kendisinde duruyor).
 */
export function ExecuteStaffChangeButton({ request }: { request: StaffChangeRequestRow }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const grant = request.targetType === 'staff_grant';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/staff/flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetEmail: request.targetId, grant, approvalRequestId: request.id, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Failed — try again.');
      return;
    }
    toast('success', grant ? 'Staff access granted.' : 'Staff access revoked.');
    setOpen(false);
    setReason('');
    router.refresh();
  };

  return (
    <>
      <button type="button" className={`btn btn-sm ${grant ? 'btn-success' : 'btn-danger'}`} onClick={() => setOpen(true)}>
        Execute
      </button>

      {open && (
        <StaffDialog
          title={`${grant ? 'Grant' : 'Revoke'} staff access — ${request.targetId}`}
          subtitle="Executes the approved request. It can only be spent once."
          labelledBy={`Execute staff change ${request.targetId}`}
          busy={busy}
          onClose={() => setOpen(false)}
        >
          <form className="row g-6" onSubmit={submit}>
            <div className="col-12">
              <label className="form-label" htmlFor={`staffExecuteReason-${request.id}`}>
                Reason <span className="text-danger">*</span>
              </label>
              <input
                id={`staffExecuteReason-${request.id}`}
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
              <button type="submit" className={`btn me-3 ${grant ? 'btn-success' : 'btn-danger'}`} disabled={busy}>
                {busy && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />}
                {grant ? 'Grant access' : 'Revoke access'}
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
