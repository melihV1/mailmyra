'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useToast } from '../../(app)/ToastProvider';
import { useLang } from '../../../lib/i18n/LangProvider';
import { adminCommon } from '../../../lib/i18n/dict/admin-common';
import { adminGrowth } from '../../../lib/i18n/dict/admin-growth';
import { common } from '../../../lib/i18n/dict/common';
import type { GrowthLeadRow, GrowthLeadStage } from '../growth-analytics-model';
import { StaffDialog } from './StaffDialog';

const LEAD_STAGES: readonly GrowthLeadStage[] = ['new', 'qualified', 'scheduled', 'won', 'lost'];

/**
 * Yeni lead açma diyaloğu — NewSupportCaseButton deseni: sayfa başlığında
 * sabit buton, form gönderiminde diyalog kapanır ve sayfa yenilenir.
 * `seats` ham gövdeye SAYI olarak gider (`typeof body.seats === 'number'`
 * kontrolü uçta) — `Number(seats)` burada tip düzeyinde de sayı üretir.
 *
 * `<option>` metinleri (`new`/`qualified`/…) BİLEREK ham durum KODU
 * olarak kalır — admin-revenue `row.status` emsali (VERİ, sözlüğe
 * girmez). İnsan-okur etiket `GrowthOperationsViews.tsx`'teki
 * `LEAD_META`/`leads.meta`'dan gelir, bu form o etiketi kullanmaz.
 */
export function NewLeadButton() {
  const lang = useLang();
  const t = adminGrowth[lang];
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState('');
  const [contact, setContact] = useState('');
  const [source, setSource] = useState('');
  const [seats, setSeats] = useState('1');
  const [stage, setStage] = useState<GrowthLeadStage>('new');
  const [nextStep, setNextStep] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCompany('');
    setContact('');
    setSource('');
    setSeats('1');
    setStage('new');
    setNextStep('');
    setReason('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company,
        contact,
        source,
        seats: seats ? Number(seats) : undefined,
        stage,
        nextStep: nextStep || undefined,
        reason,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? common[lang].failedTryAgain);
      return;
    }
    toast('success', t.leadActions.newLead.toast);
    setOpen(false);
    reset();
    router.refresh();
  };

  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        <i className="icon-base ti tabler-plus me-1" aria-hidden="true" />
        {t.leadActions.newLead.dialogTitle}
      </button>

      {open && (
        <StaffDialog
          title={t.leadActions.newLead.dialogTitle}
          subtitle={t.leadActions.newLead.subtitle}
          labelledBy={t.leadActions.newLead.dialogTitle}
          busy={busy}
          onClose={() => setOpen(false)}
        >
          <form className="row g-6" onSubmit={submit}>
            <div className="col-md-6">
              <label className="form-label" htmlFor="leadNewCompany">
                {t.leadActions.fields.company} <span className="text-danger">*</span>
              </label>
              <input id="leadNewCompany" className="form-control" value={company} onChange={(e) => setCompany(e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="leadNewContact">
                {t.leadActions.fields.contact} <span className="text-danger">*</span>
              </label>
              <input id="leadNewContact" className="form-control" value={contact} onChange={(e) => setContact(e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="leadNewSource">
                {t.shared.sourceLabel} <span className="text-danger">*</span>
              </label>
              <input id="leadNewSource" className="form-control" placeholder={t.leadActions.fields.sourcePlaceholder} value={source} onChange={(e) => setSource(e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="leadNewSeats">{t.leadActions.fields.seats}</label>
              <input id="leadNewSeats" type="number" min={1} className="form-control" value={seats} onChange={(e) => setSeats(e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="leadNewStage">{t.leadActions.fields.stage}</label>
              <select id="leadNewStage" className="form-select" value={stage} onChange={(e) => setStage(e.target.value as GrowthLeadStage)}>
                {LEAD_STAGES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="leadNewNextStep">{t.shared.nextStepFieldLabel}</label>
              <input id="leadNewNextStep" className="form-control" value={nextStep} onChange={(e) => setNextStep(e.target.value)} />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="leadNewReason">
                {adminCommon[lang].reason} <span className="text-danger">*</span>
              </label>
              <input id="leadNewReason" className="form-control" value={reason} onChange={(e) => setReason(e.target.value)} required />
            </div>
            {error && (
              <div className="col-12">
                <div className="alert alert-danger mb-0" role="alert">{error}</div>
              </div>
            )}
            <div className="col-12 text-center">
              <button type="submit" className="btn btn-primary me-3" disabled={busy}>
                {busy && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />}
                {t.leadActions.newLead.createSubmit}
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

/**
 * Lead güncelleme diyaloğu — kart üstünde self-contained açılır: lead kartı
 * başka bir modalın İÇİNDE değil (ApprovalActions'taki iç-içe-modal sorunu
 * burada söz konusu değil), bu yüzden StaffFlagActions'taki
 * `ExecuteStaffChangeButton` deseninin aynısı: buton kendi diyaloğunu
 * kendi içinde açar.
 */
export function LeadUpdateButton({ lead }: { lead: GrowthLeadRow }) {
  const lang = useLang();
  const t = adminGrowth[lang];
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<GrowthLeadStage>(lead.stage);
  const [nextStep, setNextStep] = useState(lead.nextStep);
  const [seats, setSeats] = useState(String(lead.seats));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Yalnız satırın MEVCUT değerinden farklı alanlar gövdeye gider — aksi
  // halde her kaydetme dokunulmayan alanları da denetime "değişti" diye
  // yazardı (updateLead sunucuda zaten en az bir alan istiyor).
  const seatsNumber = seats ? Number(seats) : undefined;
  const patch: { stage?: GrowthLeadStage; nextStep?: string; seats?: number } = {};
  if (stage !== lead.stage) patch.stage = stage;
  if (nextStep !== lead.nextStep) patch.nextStep = nextStep;
  if (seatsNumber !== undefined && seatsNumber !== lead.seats) patch.seats = seatsNumber;
  const hasChanges = Object.keys(patch).length > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!hasChanges) {
      setError(t.leadActions.updateLead.noChanges);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/leads/${lead.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...patch, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? common[lang].failedTryAgain);
      return;
    }
    toast('success', t.leadActions.updateLead.toast);
    setOpen(false);
    setReason('');
    router.refresh();
  };

  return (
    <>
      <button
        className="btn btn-sm btn-icon btn-text-secondary rounded-pill"
        type="button"
        aria-label={t.leadActions.updateLead.ariaLabel(lead.company)}
        onClick={() => setOpen(true)}
      >
        <i className="icon-base ti tabler-dots-vertical" />
      </button>

      {open && (
        <StaffDialog
          title={t.leadActions.updateLead.dialogTitle(lead.company)}
          subtitle={t.leadActions.updateLead.subtitle}
          labelledBy={t.leadActions.updateLead.labelledBy(lead.company)}
          busy={busy}
          onClose={() => setOpen(false)}
        >
          <form className="row g-6" onSubmit={submit}>
            <div className="col-md-6">
              <label className="form-label" htmlFor={`leadUpdateStage-${lead.id}`}>{t.leadActions.fields.stage}</label>
              <select
                id={`leadUpdateStage-${lead.id}`}
                className="form-select"
                value={stage}
                onChange={(e) => setStage(e.target.value as GrowthLeadStage)}
              >
                {LEAD_STAGES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={`leadUpdateSeats-${lead.id}`}>{t.leadActions.fields.seats}</label>
              <input
                id={`leadUpdateSeats-${lead.id}`}
                type="number"
                min={1}
                className="form-control"
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor={`leadUpdateNextStep-${lead.id}`}>{t.shared.nextStepFieldLabel}</label>
              <input
                id={`leadUpdateNextStep-${lead.id}`}
                className="form-control"
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor={`leadUpdateReason-${lead.id}`}>
                {adminCommon[lang].reason} <span className="text-danger">*</span>
              </label>
              <input
                id={`leadUpdateReason-${lead.id}`}
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
                {t.leadActions.updateLead.saveSubmit}
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
