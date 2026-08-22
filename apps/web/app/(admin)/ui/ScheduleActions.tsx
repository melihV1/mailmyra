'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useToast } from '../../(app)/ToastProvider';
import { REPORT_LIBRARY, RUNNABLE_REPORTS, TABLELESS_REPORT_IDS, type ReportSchedule } from '../reporting-model';
import { StaffDialog } from './StaffDialog';

type Cadence = 'daily' | 'weekly' | 'monthly';
type Format = 'digest' | 'csv';

const TABLELESS_IDS: readonly string[] = TABLELESS_REPORT_IDS;

/**
 * Yeni rapor zamanlaması açma diyaloğu — NewSupportCaseButton deseni.
 * Rapor listesi ve tablosuz-rapor kısıtı `../reporting-model`den gelir
 * (Task 3'ün `RUNNABLE_REPORTS`/`TABLELESS_REPORT_IDS` sabitleri) — ASLA
 * `lib/reports`'tan değil, `app/` altı oradan import edemez (import kapısı,
 * bkz. `report-import-guard.test.ts`). `recipients` textarea'da satır satır
 * girilir, gönderimde diziye çevrilir; ham gövdeye JSON DİZİ olarak gider
 * (`Array.isArray` kontrolü uçta, `field()` yalnız string döner).
 */
export function NewScheduleButton() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reportId, setReportId] = useState<string>(RUNNABLE_REPORTS[0]);
  const [cadence, setCadence] = useState<Cadence>('weekly');
  const [format, setFormat] = useState<Format>('digest');
  const [recipients, setRecipients] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const csvDisabled = TABLELESS_IDS.includes(reportId);

  const reset = () => {
    setReportId(RUNNABLE_REPORTS[0]);
    setCadence('weekly');
    setFormat('digest');
    setRecipients('');
    setReason('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const recipientList = recipients
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const res = await fetch('/api/admin/report-schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, cadence, format, recipients: recipientList, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Failed — try again.');
      return;
    }
    toast('success', 'Schedule created.');
    setOpen(false);
    reset();
    router.refresh();
  };

  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        <i className="icon-base ti tabler-plus me-1" aria-hidden="true" />
        New schedule
      </button>

      {open && (
        <StaffDialog
          title="New schedule"
          subtitle="Opens a delivery schedule — the daily runner picks it up on its next planned run."
          labelledBy="New schedule"
          busy={busy}
          onClose={() => setOpen(false)}
        >
          <form className="row g-6" onSubmit={submit}>
            <div className="col-md-6">
              <label className="form-label" htmlFor="scheduleNewReport">Report</label>
              <select
                id="scheduleNewReport"
                className="form-select"
                value={reportId}
                onChange={(e) => {
                  const next = e.target.value;
                  setReportId(next);
                  if (format === 'csv' && TABLELESS_IDS.includes(next)) setFormat('digest');
                }}
              >
                {RUNNABLE_REPORTS.map((id) => {
                  const def = REPORT_LIBRARY.find((row) => row.id === id);
                  return <option key={id} value={id}>{def?.name ?? id}</option>;
                })}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="scheduleNewCadence">Cadence</label>
              <select id="scheduleNewCadence" className="form-select" value={cadence} onChange={(e) => setCadence(e.target.value as Cadence)}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="scheduleNewFormat">Format</label>
              <select id="scheduleNewFormat" className="form-select" value={format} onChange={(e) => setFormat(e.target.value as Format)}>
                <option value="digest">Email digest</option>
                <option value="csv" disabled={csvDisabled}>{csvDisabled ? 'CSV (no table output)' : 'CSV'}</option>
              </select>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="scheduleNewRecipients">
                Recipients <span className="text-danger">*</span>
              </label>
              <textarea
                id="scheduleNewRecipients"
                className="form-control"
                rows={3}
                placeholder={'one@voldi.net\ntwo@voldi.net'}
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                required
              />
              <small className="text-body-secondary">One email per line — 1 to 10 recipients.</small>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="scheduleNewReason">
                Reason <span className="text-danger">*</span>
              </label>
              <input id="scheduleNewReason" className="form-control" value={reason} onChange={(e) => setReason(e.target.value)} required />
            </div>
            {error && (
              <div className="col-12">
                <div className="alert alert-danger mb-0" role="alert">{error}</div>
              </div>
            )}
            <div className="col-12 text-center">
              <button type="submit" className="btn btn-primary me-3" disabled={busy}>
                {busy && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />}
                Create schedule
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

export type ScheduleAction = 'status';

/**
 * Duraklat/sürdür satır eylemi — ErrorActionButtons deseni: tek eylem türü
 * var ama yine de buttons-emit-picks korunur (diyaloğu KENDİ İÇİNDE AÇMAZ);
 * bu buton `ScheduledReportsView`deki detay `StaffDialog`ın İÇİNDE duruyor,
 * ikinci diyalog onun YERİNE (kardeş) açılır.
 */
export function ScheduleActionButtons({ row, onPick }: { row: ReportSchedule; onPick: (action: ScheduleAction) => void }) {
  return (
    <button type="button" className={`btn btn-sm ${row.status === 'paused' ? 'btn-label-success' : 'btn-label-warning'}`} onClick={() => onPick('status')}>
      {row.status === 'paused' ? 'Resume' : 'Pause'}
    </button>
  );
}

/**
 * Seçilen eylemin sebep formu. Hedef durum yalnız `active`/`paused` olabilir
 * (repo tarafı — `attention` yalnız UI türetimi, `lastRunStatus === 'failed'`
 * ile hesaplanır, kalıcı bir durum değil): `paused` ise hedef `active`,
 * aksi halde (active veya attention) hedef `paused`.
 */
export function ScheduleActionDialog({
  row,
  onClose,
  onDone,
}: {
  row: ReportSchedule;
  action: ScheduleAction;
  onClose: () => void;
  onDone?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const target: 'active' | 'paused' = row.status === 'paused' ? 'active' : 'paused';
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/report-schedules/${row.id}/status`, {
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
    toast('success', target === 'active' ? 'Schedule resumed.' : 'Schedule paused.');
    onClose();
    onDone?.();
    router.refresh();
  };

  return (
    <StaffDialog
      title={target === 'active' ? `Resume — ${row.reportName}` : `Pause — ${row.reportName}`}
      subtitle={target === 'active' ? 'The schedule becomes eligible for its next planned run.' : 'The schedule stops running until it is resumed.'}
      labelledBy={`${target === 'active' ? 'Resume' : 'Pause'} ${row.reportName}`}
      busy={busy}
      onClose={onClose}
    >
      <form className="row g-6" onSubmit={submit}>
        <div className="col-12">
          <label className="form-label" htmlFor="scheduleStatusReason">
            Reason <span className="text-danger">*</span>
          </label>
          <input id="scheduleStatusReason" className="form-control" value={reason} onChange={(e) => setReason(e.target.value)} required />
        </div>
        {error && (
          <div className="col-12">
            <div className="alert alert-danger mb-0" role="alert">{error}</div>
          </div>
        )}
        <div className="col-12 text-center">
          <button type="submit" className="btn btn-primary me-3" disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />}
            {target === 'active' ? 'Resume' : 'Pause'}
          </button>
          <button type="button" className="btn btn-label-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </StaffDialog>
  );
}
