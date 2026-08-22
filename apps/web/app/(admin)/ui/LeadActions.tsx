'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useToast } from '../../(app)/ToastProvider';
import type { GrowthLeadRow, GrowthLeadStage } from '../growth-analytics-model';
import { StaffDialog } from './StaffDialog';

const LEAD_STAGES: readonly GrowthLeadStage[] = ['new', 'qualified', 'scheduled', 'won', 'lost'];

/**
 * Yeni lead açma diyaloğu — NewSupportCaseButton deseni: sayfa başlığında
 * sabit buton, form gönderiminde diyalog kapanır ve sayfa yenilenir.
 * `seats` ham gövdeye SAYI olarak gider (`typeof body.seats === 'number'`
 * kontrolü uçta) — `Number(seats)` burada tip düzeyinde de sayı üretir.
 */
export function NewLeadButton() {
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
      setError(body.error ?? 'Failed — try again.');
      return;
    }
    toast('success', 'Lead created.');
    setOpen(false);
    reset();
    router.refresh();
  };

  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        <i className="icon-base ti tabler-plus me-1" aria-hidden="true" />
        New lead
      </button>

      {open && (
        <StaffDialog
          title="New lead"
          subtitle="Opens a pipeline entry in the manually curated lead board."
          labelledBy="New lead"
          busy={busy}
          onClose={() => setOpen(false)}
        >
          <form className="row g-6" onSubmit={submit}>
            <div className="col-md-6">
              <label className="form-label" htmlFor="leadNewCompany">
                Company <span className="text-danger">*</span>
              </label>
              <input id="leadNewCompany" className="form-control" value={company} onChange={(e) => setCompany(e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="leadNewContact">
                Contact <span className="text-danger">*</span>
              </label>
              <input id="leadNewContact" className="form-control" value={contact} onChange={(e) => setContact(e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="leadNewSource">
                Source <span className="text-danger">*</span>
              </label>
              <input id="leadNewSource" className="form-control" placeholder="e.g. referral, outbound, event" value={source} onChange={(e) => setSource(e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="leadNewSeats">Seats</label>
              <input id="leadNewSeats" type="number" min={1} className="form-control" value={seats} onChange={(e) => setSeats(e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="leadNewStage">Stage</label>
              <select id="leadNewStage" className="form-select" value={stage} onChange={(e) => setStage(e.target.value as GrowthLeadStage)}>
                {LEAD_STAGES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="leadNewNextStep">Next step</label>
              <input id="leadNewNextStep" className="form-control" value={nextStep} onChange={(e) => setNextStep(e.target.value)} />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="leadNewReason">
                Reason <span className="text-danger">*</span>
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
                Create lead
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
 * Lead güncelleme diyaloğu — kart üstünde self-contained açılır: lead kartı
 * başka bir modalın İÇİNDE değil (ApprovalActions'taki iç-içe-modal sorunu
 * burada söz konusu değil), bu yüzden StaffFlagActions'taki
 * `ExecuteStaffChangeButton` deseninin aynısı: buton kendi diyaloğunu
 * kendi içinde açar.
 */
export function LeadUpdateButton({ lead }: { lead: GrowthLeadRow }) {
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
      setError('No changes.');
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
      setError(body.error ?? 'Failed — try again.');
      return;
    }
    toast('success', 'Lead updated.');
    setOpen(false);
    setReason('');
    router.refresh();
  };

  return (
    <>
      <button
        className="btn btn-sm btn-icon btn-text-secondary rounded-pill"
        type="button"
        aria-label={`Update ${lead.company}`}
        onClick={() => setOpen(true)}
      >
        <i className="icon-base ti tabler-dots-vertical" />
      </button>

      {open && (
        <StaffDialog
          title={`Update lead — ${lead.company}`}
          subtitle="Move the pipeline stage, adjust the seat estimate or record the next step."
          labelledBy={`Update lead ${lead.company}`}
          busy={busy}
          onClose={() => setOpen(false)}
        >
          <form className="row g-6" onSubmit={submit}>
            <div className="col-md-6">
              <label className="form-label" htmlFor={`leadUpdateStage-${lead.id}`}>Stage</label>
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
              <label className="form-label" htmlFor={`leadUpdateSeats-${lead.id}`}>Seats</label>
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
              <label className="form-label" htmlFor={`leadUpdateNextStep-${lead.id}`}>Next step</label>
              <input
                id={`leadUpdateNextStep-${lead.id}`}
                className="form-control"
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor={`leadUpdateReason-${lead.id}`}>
                Reason <span className="text-danger">*</span>
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
                Save changes
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
