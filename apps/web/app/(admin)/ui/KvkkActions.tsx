'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, type FormEvent } from 'react';

import { useToast } from '../../(app)/ToastProvider';
import type { DataRequestRow } from '../operations-model';
import { StaffDialog } from './StaffDialog';

/**
 * KVKK yaşam döngüsü satır eylemleri — ApprovalRowActions deseni birebir:
 * her eylem kendi StaffDialog'unda, sebep zorunlu, fetch → hata satır
 * içinde → toast + onClose + onDone + router.refresh().
 *
 * Kimlik doğrulama GERÇEK alandan okunur: `row.identityVerified`
 * (repo katmanında `identityVerifiedAt !== null`). `status`'ten türetilmez
 * — SQL ile elle eklenmiş bir kayıt `in_progress` görünüp kimliği
 * doğrulanmamış olabilir (`completeKvkkRequest` bunu sunucuda zaten
 * reddediyor, bkz. lib/repo/admin.ts). Böyle bozuk bir satırda ne
 * "Verify identity" ne "Respond & close" görünür — bu doğru davranış:
 * panel kimliği yalnız `intake`/`identity_check`ten doğrulatabilir,
 * geriye dönük onarım yolu yok.
 *
 * `kvkkStatusTargets`: `setKvkkStatus`'un izinli geçiş haritasının
 * (KVKK_TRANSITIONS, hedef → izinli kaynaklar) mevcut duruma göre TERSİ —
 * "bu durumdan nereye gidilebilir". `completed` bir uç noktadır.
 *
 * `identity_check` satırında hedef sabit değil, `row.identityVerified`e
 * bağlı: sunucu (`setKvkkStatus`) identity_check → in_progress geçişini
 * kimlik doğrulanmadan zaten reddediyor. Hedefi koşulsuz sunmak "Move
 * status" düğmesini ölü uca çıkarırdı — doğru yol "Verify identity".
 */
function kvkkStatusTargets(row: DataRequestRow): Array<DataRequestRow['status']> {
  switch (row.status) {
    case 'intake':
      return ['identity_check'];
    case 'identity_check':
      return row.identityVerified ? ['in_progress'] : [];
    case 'in_progress':
      return ['legal_review'];
    case 'legal_review':
      return ['in_progress'];
    case 'completed':
      return [];
  }
}

export type KvkkAction = 'identity' | 'owner' | 'evidence' | 'status' | 'complete';

/**
 * Yaşam döngüsü butonları — diyaloğu KENDİ İÇİNDE AÇMAZ (ApprovalActions
 * ile aynı gerekçe): bu butonlar bir modalın içinde duruyor, ikinci modalı
 * çocuk olarak render etmek iki modalı üst üste bindirir. Seçilen eylem
 * dışarı bildirilir; diyalog detay panelinin YERİNE açılır.
 */
export function KvkkActionButtons({
  row,
  onPick,
}: {
  row: DataRequestRow;
  onPick: (action: KvkkAction) => void;
}) {
  if (row.status === 'completed') return null;

  const statusTargets = kvkkStatusTargets(row);
  const canVerifyIdentity = !row.identityVerified && (row.status === 'intake' || row.status === 'identity_check');
  const canComplete = row.identityVerified && (row.status === 'in_progress' || row.status === 'legal_review');

  return (
    <>
      {canVerifyIdentity && (
        <button type="button" className="btn btn-primary btn-sm" onClick={() => onPick('identity')}>
          Verify identity
        </button>
      )}
      <button type="button" className="btn btn-label-secondary btn-sm" onClick={() => onPick('owner')}>
        Assign owner
      </button>
      <button type="button" className="btn btn-label-secondary btn-sm" onClick={() => onPick('evidence')}>
        Add evidence
      </button>
      {statusTargets.length > 0 && (
        <button type="button" className="btn btn-label-info btn-sm" onClick={() => onPick('status')}>
          Move status
        </button>
      )}
      {canComplete && (
        <button type="button" className="btn btn-success btn-sm" onClick={() => onPick('complete')}>
          Respond &amp; close
        </button>
      )}
    </>
  );
}

/** Seçilen eylemin sebep formu — detay panelinin yerine açılır. */
export function KvkkActionDialog({
  row,
  action,
  onClose,
  onDone,
}: {
  row: DataRequestRow;
  action: KvkkAction;
  onClose: () => void;
  onDone?: () => void;
}) {
  switch (action) {
    case 'identity':
      return <IdentityDialog row={row} onClose={onClose} onDone={onDone} />;
    case 'owner':
      return <OwnerDialog row={row} onClose={onClose} onDone={onDone} />;
    case 'evidence':
      return <EvidenceDialog row={row} onClose={onClose} onDone={onDone} />;
    case 'status':
      return (
        <StatusDialog row={row} targets={kvkkStatusTargets(row)} onClose={onClose} onDone={onDone} />
      );
    case 'complete':
      return <CompleteDialog row={row} onClose={onClose} onDone={onDone} />;
  }
}

function IdentityDialog({
  row,
  onClose,
  onDone,
}: {
  row: DataRequestRow;
  onClose: () => void;
  onDone?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [method, setMethod] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/kvkk/${row.id}/identity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Failed — try again.');
      return;
    }
    toast('success', 'Identity verified.');
    onClose();
    onDone?.();
    router.refresh();
  };

  return (
    <StaffDialog
      title={`Verify identity — ${row.reference}`}
      subtitle="Confirms the data subject's identity and moves the request into progress."
      labelledBy={`Verify identity ${row.reference}`}
      busy={busy}
      onClose={onClose}
    >
      <form className="row g-6" onSubmit={submit}>
        <div className="col-12">
          <label className="form-label" htmlFor="kvkkIdentityMethod">
            Verification method <span className="text-danger">*</span>
          </label>
          <input
            id="kvkkIdentityMethod"
            className="form-control"
            placeholder="e.g. video call, ID document, portal login"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            required
          />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="kvkkIdentityReason">
            Reason <span className="text-danger">*</span>
          </label>
          <input
            id="kvkkIdentityReason"
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
            Verify identity
          </button>
          <button type="button" className="btn btn-label-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </StaffDialog>
  );
}

function OwnerDialog({
  row,
  onClose,
  onDone,
}: {
  row: DataRequestRow;
  onClose: () => void;
  onDone?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [ownerEmail, setOwnerEmail] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/kvkk/${row.id}/owner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerEmail, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Failed — try again.');
      return;
    }
    toast('success', 'Owner assigned.');
    onClose();
    onDone?.();
    router.refresh();
  };

  return (
    <StaffDialog
      title={`Assign owner — ${row.reference}`}
      subtitle="The owner must already be a staff account."
      labelledBy={`Assign owner ${row.reference}`}
      busy={busy}
      onClose={onClose}
    >
      <form className="row g-6" onSubmit={submit}>
        <div className="col-12">
          <label className="form-label" htmlFor="kvkkOwnerEmail">
            Owner email <span className="text-danger">*</span>
          </label>
          <input
            id="kvkkOwnerEmail"
            type="email"
            className="form-control"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            required
          />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="kvkkOwnerReason">
            Reason <span className="text-danger">*</span>
          </label>
          <input
            id="kvkkOwnerReason"
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
            Assign owner
          </button>
          <button type="button" className="btn btn-label-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </StaffDialog>
  );
}

function EvidenceDialog({
  row,
  onClose,
  onDone,
}: {
  row: DataRequestRow;
  onClose: () => void;
  onDone?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [label, setLabel] = useState('');
  const [location, setLocation] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/kvkk/${row.id}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, location, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Failed — try again.');
      return;
    }
    toast('success', 'Evidence added.');
    onClose();
    onDone?.();
    router.refresh();
  };

  return (
    <StaffDialog
      title={`Add evidence — ${row.reference}`}
      subtitle="The location is stored with the evidence record only — it never appears in the event trail."
      labelledBy={`Add evidence ${row.reference}`}
      busy={busy}
      onClose={onClose}
    >
      <form className="row g-6" onSubmit={submit}>
        <div className="col-12">
          <label className="form-label" htmlFor="kvkkEvidenceLabel">
            Label <span className="text-danger">*</span>
          </label>
          <input
            id="kvkkEvidenceLabel"
            className="form-control"
            placeholder="e.g. CRM export, mailbox search"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="kvkkEvidenceLocation">
            Location <span className="text-danger">*</span>
          </label>
          <input
            id="kvkkEvidenceLocation"
            className="form-control"
            placeholder="e.g. /evidence/kvkk-2026-0001/crm-export.csv"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="kvkkEvidenceReason">
            Reason <span className="text-danger">*</span>
          </label>
          <input
            id="kvkkEvidenceReason"
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
            Add evidence
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
  row,
  targets,
  onClose,
  onDone,
}: {
  row: DataRequestRow;
  targets: Array<DataRequestRow['status']>;
  onClose: () => void;
  onDone?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState<DataRequestRow['status']>(targets[0] ?? row.status);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/kvkk/${row.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Failed — try again.');
      return;
    }
    toast('success', `Status moved to ${status.replace('_', ' ')}.`);
    onClose();
    onDone?.();
    router.refresh();
  };

  return (
    <StaffDialog
      title={`Move status — ${row.reference}`}
      subtitle="Only the statuses reachable from the current one are offered."
      labelledBy={`Move status ${row.reference}`}
      busy={busy}
      onClose={onClose}
    >
      <form className="row g-6" onSubmit={submit}>
        <div className="col-12">
          <label className="form-label" htmlFor="kvkkStatusTarget">Target status</label>
          <select
            id="kvkkStatusTarget"
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value as DataRequestRow['status'])}
          >
            {targets.map((target) => (
              <option key={target} value={target}>{target.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="kvkkStatusReason">
            Reason <span className="text-danger">*</span>
          </label>
          <input
            id="kvkkStatusReason"
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
            Move status
          </button>
          <button type="button" className="btn btn-label-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </StaffDialog>
  );
}

function CompleteDialog({
  row,
  onClose,
  onDone,
}: {
  row: DataRequestRow;
  onClose: () => void;
  onDone?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [responseSummary, setResponseSummary] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/kvkk/${row.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responseSummary, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Failed — try again.');
      return;
    }
    toast('success', 'Request closed.');
    onClose();
    onDone?.();
    router.refresh();
  };

  return (
    <StaffDialog
      title={`Respond & close — ${row.reference}`}
      subtitle="Closes the request. This cannot be reopened."
      labelledBy={`Respond and close ${row.reference}`}
      busy={busy}
      onClose={onClose}
    >
      <form className="row g-6" onSubmit={submit}>
        <div className="col-12">
          <label className="form-label" htmlFor="kvkkCompleteSummary">
            Response summary <span className="text-danger">*</span>
          </label>
          <textarea
            id="kvkkCompleteSummary"
            className="form-control"
            rows={4}
            value={responseSummary}
            onChange={(e) => setResponseSummary(e.target.value)}
            required
          />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="kvkkCompleteReason">
            Reason <span className="text-danger">*</span>
          </label>
          <input
            id="kvkkCompleteReason"
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
          <button type="submit" className="btn btn-success me-3" disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />}
            Respond &amp; close
          </button>
          <button type="button" className="btn btn-label-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </StaffDialog>
  );
}

/**
 * Yeni KVKK talebi açma diyaloğu — NewApprovalButton deseni: sayfa
 * başlığında sabit buton, form gönderiminde diyalog kapanır ve sayfa
 * yenilenir. `statutoryDueAt` kod tarafında hesaplanır (bkz.
 * `createKvkkRequest`) — burada elle girilmez.
 */
export function NewKvkkButton() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState('');
  const [subjectEmail, setSubjectEmail] = useState('');
  const [type, setType] = useState<'access' | 'erasure' | 'correction' | 'portability'>('access');
  const [orgId, setOrgId] = useState('');
  // UTC değil, yerel tarih: gece yarısına yakın UTC dilimi yanlış günü gösterir.
  const [receivedAt, setReceivedAt] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [receivedVia, setReceivedVia] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Navbar'daki Quick create `?new=1` ile gelir (Dalga A, K2): diyaloğu aç
     ve parametreyi URL'den düşür — yenileme yeniden açmasın; navbar'dan
     ikinci tıklama parametreyi geri getirip effect'i yeniden tetiklesin. */
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setOpen(true);
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/kvkk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference,
        subjectEmail,
        type,
        orgId: orgId || undefined,
        receivedAt,
        receivedVia: receivedVia || undefined,
        reason,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Failed — try again.');
      return;
    }
    toast('success', 'KVKK request created.');
    setOpen(false);
    setReference('');
    setSubjectEmail('');
    setType('access');
    setOrgId('');
    setReceivedAt(new Date().toLocaleDateString('en-CA'));
    setReceivedVia('');
    setReason('');
    router.refresh();
  };

  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        <i className="icon-base ti tabler-plus me-1" aria-hidden="true" />
        New KVKK request
      </button>

      {open && (
        <StaffDialog
          title="New KVKK request"
          subtitle="Opens a statutory data-subject request record."
          labelledBy="New KVKK request"
          busy={busy}
          onClose={() => setOpen(false)}
        >
          <form className="row g-6" onSubmit={submit}>
            <div className="col-md-6">
              <label className="form-label" htmlFor="kvkkNewReference">
                Reference <span className="text-danger">*</span>
              </label>
              <input
                id="kvkkNewReference"
                className="form-control"
                placeholder="KVKK-2026-0001"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="kvkkNewSubjectEmail">
                Subject email <span className="text-danger">*</span>
              </label>
              <input
                id="kvkkNewSubjectEmail"
                type="email"
                className="form-control"
                value={subjectEmail}
                onChange={(e) => setSubjectEmail(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="kvkkNewType">Request type</label>
              <select
                id="kvkkNewType"
                className="form-select"
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
              >
                <option value="access">Access</option>
                <option value="erasure">Erasure</option>
                <option value="correction">Correction</option>
                <option value="portability">Portability</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="kvkkNewOrgId">Org id</label>
              <input
                id="kvkkNewOrgId"
                className="form-control"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              />
              <small className="text-body-secondary">Org id — leave blank if the subject is not tied to a customer.</small>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="kvkkNewReceivedAt">Received on</label>
              <input
                id="kvkkNewReceivedAt"
                type="date"
                className="form-control"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                required
              />
              <small className="text-body-secondary">The statutory 30-day clock starts from this date.</small>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="kvkkNewReceivedVia">Received via</label>
              <input
                id="kvkkNewReceivedVia"
                className="form-control"
                placeholder="e.g. email, portal, mail"
                value={receivedVia}
                onChange={(e) => setReceivedVia(e.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="kvkkNewReason">
                Reason <span className="text-danger">*</span>
              </label>
              <input
                id="kvkkNewReason"
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
