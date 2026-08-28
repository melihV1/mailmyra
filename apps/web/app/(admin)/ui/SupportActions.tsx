'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, type FormEvent } from 'react';

import { useToast } from '../../(app)/ToastProvider';
import { useLang } from '../../../lib/i18n/LangProvider';
import { adminCommon } from '../../../lib/i18n/dict/admin-common';
import { common } from '../../../lib/i18n/dict/common';
import { adminSupport } from '../../../lib/i18n/dict/admin-support';
import type { SupportCasePriority, SupportCaseRow, SupportCaseStatus } from '../support-operations-model';
import { StaffDialog } from './StaffDialog';

/**
 * İzinli durum geçişleri — `lib/repo/admin.ts`taki `SUPPORT_TRANSITIONS`in
 * AYNASI. Sunucu zaten reddediyor; burada tekrarlanmasının tek sebebi
 * `<select>`e yalnız ulaşılabilir hedefleri sunmak (KvkkActions'taki
 * `kvkkStatusTargets` emsali) — iki taraf birbirinden bağımsız sürüklenirse
 * sunucu 400 döner, arayüz yanlışlıkla "başarılı" göstermez.
 */
const SUPPORT_STATUS_TARGETS: Record<SupportCaseStatus, SupportCaseStatus[]> = {
  open: ['waiting_customer', 'escalated', 'resolved'],
  waiting_customer: ['open', 'escalated', 'resolved'],
  escalated: ['open', 'resolved'],
  resolved: ['open'],
};

export type SupportAction = 'status' | 'owner' | 'priority';

/**
 * Vaka satır eylemleri — ApprovalActionButtons/KvkkActionButtons deseni
 * birebir: diyaloğu KENDİ İÇİNDE AÇMAZ, yalnız seçilen eylemi dışarı
 * bildirir; diyalog çağıran tarafta detay panelinin YERİNE, kardeş olarak
 * açılır (iç içe modal ApprovalActions'ta yaşanan iki-kapatma-düğmesi
 * hatasını üretir).
 *
 * Durum HER ZAMAN görünür — `resolved → open` yeniden açma yolu budur.
 * Sahip ve öncelik `resolved` vakada gizlenir: repo ikisini de reddediyor
 * (kapatılmış dosyada ne yeni sahip ne SLA saati anlamlı).
 */
export function SupportActionButtons({
  row,
  onPick,
}: {
  row: SupportCaseRow;
  onPick: (action: SupportAction) => void;
}) {
  const lang = useLang();
  const t = adminSupport[lang];
  return (
    <>
      <button type="button" className="btn btn-label-info btn-sm" onClick={() => onPick('status')}>
        {t.actions.buttons.changeStatus}
      </button>
      {row.status !== 'resolved' && (
        <button type="button" className="btn btn-label-secondary btn-sm" onClick={() => onPick('owner')}>
          {t.actions.buttons.assignOwner}
        </button>
      )}
      {row.status !== 'resolved' && (
        <button type="button" className="btn btn-label-secondary btn-sm" onClick={() => onPick('priority')}>
          {t.actions.buttons.setPriority}
        </button>
      )}
    </>
  );
}

/** Seçilen eylemin sebep formu — detay panelinin yerine açılır. */
export function SupportActionDialog({
  row,
  action,
  onClose,
  onDone,
}: {
  row: SupportCaseRow;
  action: SupportAction;
  onClose: () => void;
  onDone?: () => void;
}) {
  switch (action) {
    case 'status':
      return <StatusDialog row={row} onClose={onClose} onDone={onDone} />;
    case 'owner':
      return <OwnerDialog row={row} onClose={onClose} onDone={onDone} />;
    case 'priority':
      return <PriorityDialog row={row} onClose={onClose} onDone={onDone} />;
  }
}

function StatusDialog({
  row,
  onClose,
  onDone,
}: {
  row: SupportCaseRow;
  onClose: () => void;
  onDone?: () => void;
}) {
  const lang = useLang();
  const t = adminSupport[lang];
  const router = useRouter();
  const toast = useToast();
  const targets = SUPPORT_STATUS_TARGETS[row.status];
  const [status, setStatus] = useState<SupportCaseStatus>(targets[0] ?? row.status);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/support/${row.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? common[lang].failedTryAgain);
      return;
    }
    toast('success', t.actions.statusDialog.toast(status.replace('_', ' ')));
    onClose();
    onDone?.();
    router.refresh();
  };

  return (
    <StaffDialog
      title={t.actions.statusDialog.title(row.reference)}
      subtitle={t.actions.onlyReachable}
      labelledBy={t.actions.statusDialog.labelledBy(row.reference)}
      busy={busy}
      onClose={onClose}
    >
      <form className="row g-6" onSubmit={submit}>
        <div className="col-12">
          <label className="form-label" htmlFor="supportStatusTarget">{t.actions.targetStatusLabel}</label>
          <select
            id="supportStatusTarget"
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value as SupportCaseStatus)}
          >
            {targets.map((target) => (
              <option key={target} value={target}>{target.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="supportStatusReason">
            {adminCommon[lang].reason} <span className="text-danger">*</span>
          </label>
          <input
            id="supportStatusReason"
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
            {t.actions.buttons.changeStatus}
          </button>
          <button type="button" className="btn btn-label-secondary" onClick={onClose} disabled={busy}>
            {common[lang].cancel}
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
  row: SupportCaseRow;
  onClose: () => void;
  onDone?: () => void;
}) {
  const lang = useLang();
  const t = adminSupport[lang];
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
    const res = await fetch(`/api/admin/support/${row.id}/owner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerEmail, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? common[lang].failedTryAgain);
      return;
    }
    toast('success', t.actions.ownerDialog.toast);
    onClose();
    onDone?.();
    router.refresh();
  };

  return (
    <StaffDialog
      title={t.actions.ownerDialog.title(row.reference)}
      subtitle={t.actions.ownerDialog.subtitle}
      labelledBy={t.actions.ownerDialog.labelledBy(row.reference)}
      busy={busy}
      onClose={onClose}
    >
      <form className="row g-6" onSubmit={submit}>
        <div className="col-12">
          <label className="form-label" htmlFor="supportOwnerEmail">
            {t.actions.ownerDialog.ownerEmailLabel} <span className="text-danger">*</span>
          </label>
          <input
            id="supportOwnerEmail"
            type="email"
            className="form-control"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            required
          />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="supportOwnerReason">
            {adminCommon[lang].reason} <span className="text-danger">*</span>
          </label>
          <input
            id="supportOwnerReason"
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
            {t.actions.buttons.assignOwner}
          </button>
          <button type="button" className="btn btn-label-secondary" onClick={onClose} disabled={busy}>
            {common[lang].cancel}
          </button>
        </div>
      </form>
    </StaffDialog>
  );
}

/** Öncelik değişince `slaDueAt` `createdAt`ten yeniden hesaplanır — repo notu buna göre. */
function PriorityDialog({
  row,
  onClose,
  onDone,
}: {
  row: SupportCaseRow;
  onClose: () => void;
  onDone?: () => void;
}) {
  const lang = useLang();
  const t = adminSupport[lang];
  const router = useRouter();
  const toast = useToast();
  const [priority, setPriority] = useState<SupportCasePriority>(row.priority);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/support/${row.id}/priority`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? common[lang].failedTryAgain);
      return;
    }
    toast('success', t.actions.priorityDialog.toast(priority));
    onClose();
    onDone?.();
    router.refresh();
  };

  return (
    <StaffDialog
      title={t.actions.priorityDialog.title(row.reference)}
      subtitle={t.actions.priorityDialog.subtitle}
      labelledBy={t.actions.priorityDialog.labelledBy(row.reference)}
      busy={busy}
      onClose={onClose}
    >
      <form className="row g-6" onSubmit={submit}>
        <div className="col-12">
          <label className="form-label" htmlFor="supportPriorityTarget">{t.fields.priority}</label>
          <select
            id="supportPriorityTarget"
            className="form-select"
            value={priority}
            onChange={(e) => setPriority(e.target.value as SupportCasePriority)}
          >
            <option value="urgent">{t.actions.priorityOptions.urgent}</option>
            <option value="high">{t.actions.priorityOptions.high}</option>
            <option value="normal">{t.actions.priorityOptions.normal}</option>
            <option value="low">{t.actions.priorityOptions.low}</option>
          </select>
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="supportPriorityReason">
            {adminCommon[lang].reason} <span className="text-danger">*</span>
          </label>
          <input
            id="supportPriorityReason"
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
            {t.actions.buttons.setPriority}
          </button>
          <button type="button" className="btn btn-label-secondary" onClick={onClose} disabled={busy}>
            {common[lang].cancel}
          </button>
        </div>
      </form>
    </StaffDialog>
  );
}

/**
 * Yeni destek vakası açma diyaloğu — NewKvkkButton deseni: sayfa
 * başlığında sabit buton, form gönderiminde diyalog kapanır ve sayfa
 * yenilenir. `slaDueAt` kod tarafında hesaplanır (bkz. `createSupportCase`)
 * — burada elle girilmez.
 */
export function NewSupportCaseButton() {
  const lang = useLang();
  const t = adminSupport[lang];
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState('');
  const [subject, setSubject] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [channel, setChannel] = useState<'email' | 'form' | 'staff'>('email');
  const [category, setCategory] = useState<'billing' | 'builder' | 'export' | 'access' | 'account'>('billing');
  const [priority, setPriority] = useState<SupportCasePriority>('normal');
  const [orgId, setOrgId] = useState('');
  const [summary, setSummary] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Navbar'daki Quick create `?new=1` ile gelir (Dalga A, K1): diyaloğu aç
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

  const reset = () => {
    setReference('');
    setSubject('');
    setRequesterEmail('');
    setChannel('email');
    setCategory('billing');
    setPriority('normal');
    setOrgId('');
    setSummary('');
    setReason('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference,
        subject,
        requesterEmail,
        channel,
        category,
        priority,
        orgId: orgId || undefined,
        summary: summary || undefined,
        reason,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? common[lang].failedTryAgain);
      return;
    }
    toast('success', t.actions.newCase.toast);
    setOpen(false);
    reset();
    router.refresh();
  };

  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        <i className="icon-base ti tabler-plus me-1" aria-hidden="true" />
        {t.actions.newCase.button}
      </button>

      {open && (
        <StaffDialog
          title={t.actions.newCase.dialogTitle}
          subtitle={t.actions.newCase.subtitle}
          labelledBy={t.actions.newCase.dialogTitle}
          busy={busy}
          onClose={() => setOpen(false)}
        >
          <form className="row g-6" onSubmit={submit}>
            <div className="col-md-6">
              <label className="form-label" htmlFor="supportNewReference">
                {t.actions.newCase.referenceLabel} <span className="text-danger">*</span>
              </label>
              <input
                id="supportNewReference"
                className="form-control"
                placeholder="SUP-2026-0001"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="supportNewRequesterEmail">
                {t.actions.newCase.requesterEmailLabel} <span className="text-danger">*</span>
              </label>
              <input
                id="supportNewRequesterEmail"
                type="email"
                className="form-control"
                value={requesterEmail}
                onChange={(e) => setRequesterEmail(e.target.value)}
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="supportNewSubject">
                {t.actions.newCase.subjectLabel} <span className="text-danger">*</span>
              </label>
              <input
                id="supportNewSubject"
                className="form-control"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="supportNewChannel">{t.actions.newCase.channelLabel}</label>
              <select
                id="supportNewChannel"
                className="form-select"
                value={channel}
                onChange={(e) => setChannel(e.target.value as typeof channel)}
              >
                <option value="email">{t.actions.newCase.channelOptions.email}</option>
                <option value="form">{t.actions.newCase.channelOptions.form}</option>
                <option value="staff">{t.actions.newCase.channelOptions.staff}</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="supportNewCategory">{t.fields.category}</label>
              <select
                id="supportNewCategory"
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
              >
                <option value="billing">{t.actions.newCase.categoryOptions.billing}</option>
                <option value="builder">{t.actions.newCase.categoryOptions.builder}</option>
                <option value="export">{t.actions.newCase.categoryOptions.export}</option>
                <option value="access">{t.actions.newCase.categoryOptions.access}</option>
                <option value="account">{t.actions.newCase.categoryOptions.account}</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="supportNewPriority">{t.fields.priority}</label>
              <select
                id="supportNewPriority"
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as SupportCasePriority)}
              >
                <option value="urgent">{t.actions.priorityOptions.urgent}</option>
                <option value="high">{t.actions.priorityOptions.high}</option>
                <option value="normal">{t.actions.priorityOptions.normal}</option>
                <option value="low">{t.actions.priorityOptions.low}</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="supportNewOrgId">{t.actions.newCase.orgIdLabel}</label>
              <input
                id="supportNewOrgId"
                className="form-control"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              />
              <small className="text-body-secondary">{t.actions.newCase.orgIdHelp}</small>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="supportNewSummary">{t.actions.newCase.summaryLabel}</label>
              <textarea
                id="supportNewSummary"
                className="form-control"
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="supportNewReason">
                {adminCommon[lang].reason} <span className="text-danger">*</span>
              </label>
              <input
                id="supportNewReason"
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
                {t.actions.newCase.submit}
              </button>
              <button type="button" className="btn btn-label-secondary" onClick={() => setOpen(false)} disabled={busy}>
                {common[lang].cancel}
              </button>
            </div>
          </form>
        </StaffDialog>
      )}
    </>
  );
}
