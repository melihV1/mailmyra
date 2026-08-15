'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { SenderRowData } from '../../../../lib/repo/senders';
import { exportPlan } from '../../../../lib/export-plan';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { SenderActions } from './SenderActions';
import { useToast } from '../../ToastProvider';

/* Vuexy rozet dili: bg-label-* (dolu renk değil, pastel etiket). */
const BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-label-secondary' },
  active: { label: 'Live', cls: 'bg-label-success' },
  inactive: { label: 'Inactive', cls: 'bg-label-warning' },
};

/** Hata gövdesi → panel dilinde (İngilizce) açıklama. */
const ERRORS: Record<string, string> = {
  too_many: 'Up to 200 senders per export — contact us for larger runs.',
  not_found: 'The list changed under you — reload the page and try again.',
  no_exportable: 'No live senders with an assigned signature yet.',
  forbidden: 'You do not have permission to export.',
};

/**
 * Satır listesi + (varsa) seçim/dışa aktarma araç çubuğu ve diyaloğu.
 * `showExport` yalnız görünürlüğü kapatır — asıl kapı sunucuda
 * (POST /api/senders/export-zip, spec §3).
 *
 * `activeSeats`/`entitledSeats` brief'in arayüz imzasında yoktu ama satır
 * JSX'i AYNEN taşınınca `SenderActions`in ihtiyaç duyduğu ortaya çıktı
 * (yayına alma onayı koltuk sayısını gösteriyor) — page.tsx'in zaten
 * çektiği `seatSummary()` sonucu buradan geçiriliyor, ikinci bir uç açılmadı.
 */
export function SenderTable({
  rows,
  showExport,
  activeSeats,
  entitledSeats,
}: {
  rows: SenderRowData[];
  showExport: boolean;
  activeSeats: number;
  entitledSeats: number;
}) {
  const toast = useToast();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = exportPlan(rows, [...selected]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)));
  }

  /* Diyalog her açılış/kapanışta önceki denemenin hatasını taşımasın —
     reviewer bulgusu: Cancel sonrası seçim değişip yeniden açılınca eski
     hata mesajı yeni denemeyi yanlış temsil ediyordu. */
  function openDialog() {
    setError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setError(null);
    setDialogOpen(false);
  }

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/senders/export-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected.size > 0 ? { senderIds: [...selected] } : {}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(ERRORS[body.error ?? ''] ?? 'Export failed — try again.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mailmyra-imzalar-${new Date().toISOString().slice(0, 10)}.zip`;
      // ExportButtons.tsx'teki gibi: bazı tarayıcılarda DOM'a hiç girmemiş
      // bir <a>'nın click()'i tetiklenmiyor — önce ekle, sonra kaldır.
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDialogOpen(false);
      toast(
        'success',
        `Zip downloaded — ${plan.fileCount} signature file${plan.fileCount === 1 ? '' : 's'}.`,
      );
    } catch {
      // reviewer bulgusu: fetch reddi veya res.blob() hatası önceden
      // yakalanmadan kaçıyordu — kullanıcı diyalog sessizce açık kalırken
      // hiçbir hata görmüyordu.
      setError('Export failed — try again.');
    } finally {
      setBusy(false);
    }
  }

  const skips: string[] = [];
  if (plan.unassigned > 0)
    skips.push(
      `${plan.unassigned} sender${plan.unassigned === 1 ? ' has' : 's have'} no assigned signature`,
    );
  if (plan.unpublished > 0)
    skips.push(
      `${plan.unpublished} selected sender${plan.unpublished === 1 ? ' is' : 's are'} not live`,
    );

  return (
    <div className="card">
      <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h5 className="card-title mb-0">All senders</h5>
        <div className="d-flex flex-wrap gap-2">
          {/* Liste CSV'si her role açık — ekranda zaten görünen verinin
              dosyası; imza İÇERİĞİ veren zip'in rol kapısına girmez. */}
          <a href="/api/senders/export-csv" className="btn btn-label-info">
            <i className="icon-base ti tabler-file-spreadsheet me-1" aria-hidden="true" />
            Export CSV
          </a>
          {showExport && (
            <button type="button" className="btn btn-primary" onClick={openDialog}>
              <i className="icon-base ti tabler-file-zip me-1" aria-hidden="true" />
              Export zip{selected.size > 0 ? ` (${selected.size} selected)` : ''}
            </button>
          )}
        </div>
      </div>

      <div className="table-responsive text-nowrap">
        <table className="table table-hover">
          <thead>
            <tr>
              {showExport && (
                <th style={{ width: '1%' }}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    aria-label="Select all"
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={toggleAll}
                  />
                </th>
              )}
              <th>Sender</th>
              <th>Job title</th>
              <th>Signatures</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="table-border-bottom-0">
            {rows.map((s) => {
              const badge = BADGE[s.status]!;
              return (
                <tr key={s.id}>
                  {showExport && (
                    <td>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        aria-label={`Select ${s.displayName}`}
                        checked={selected.has(s.id)}
                        onChange={() => toggle(s.id)}
                      />
                    </td>
                  )}
                  <td>
                    <Link href={'/app/senders/' + s.id} className="d-block fw-medium text-heading">
                      {s.displayName}
                    </Link>
                    <small className="text-body-secondary">{s.email}</small>
                  </td>
                  <td>{s.jobTitle ?? '—'}</td>
                  <td>
                    {s.signatureNames.length > 0 ? s.signatureNames.join(', ') : '—'}
                  </td>
                  <td>
                    <span className={`badge ${badge.cls}`}>{badge.label}</span>
                  </td>
                  <td>
                    <SenderActions
                      id={s.id}
                      name={s.displayName}
                      email={s.email}
                      jobTitle={s.jobTitle}
                      status={s.status}
                      activeSeats={activeSeats}
                      entitledSeats={entitledSeats}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <ConfirmDialog
          title="Export zip"
          onCancel={closeDialog}
          onConfirm={plan.fileCount > 0 ? download : undefined}
          confirmLabel={busy ? 'Preparing…' : 'Download'}
          busy={busy}
        >
          {plan.fileCount > 0 ? (
            <>
              <p>
                <strong>
                  {plan.fileCount} signature file{plan.fileCount === 1 ? '' : 's'}
                </strong>{' '}
                will be generated ({plan.senderCount} sender
                {plan.senderCount === 1 ? '' : 's'}).
              </p>
              {skips.length > 0 && <p>Skipped: {skips.join(' · ')}.</p>}
            </>
          ) : (
            <p>
              No live senders with an assigned signature yet — assign a signature and publish
              first.
            </p>
          )}
          {error && <p className="text-danger mb-0">{error}</p>}
        </ConfirmDialog>
      )}
    </div>
  );
}
