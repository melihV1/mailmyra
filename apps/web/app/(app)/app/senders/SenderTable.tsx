'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { SenderRowData } from '../../../../lib/repo/senders';
import { exportPlan } from '../../../../lib/export-plan';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { senders as sendersDict } from '../../../../lib/i18n/dict/senders';
import { useLang } from '../../../../lib/i18n/LangProvider';
import { SenderActions } from './SenderActions';
import { useToast } from '../../ToastProvider';

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
  const lang = useLang();
  const t = sendersDict[lang];
  /* Vuexy rozet dili: bg-label-* (dolu renk değil, pastel etiket). */
  const BADGE: Record<string, { label: string; cls: string }> = {
    draft: { label: t.statusBadge.draft, cls: 'bg-label-secondary' },
    active: { label: t.statusBadge.active, cls: 'bg-label-success' },
    inactive: { label: t.statusBadge.inactive, cls: 'bg-label-warning' },
  };
  /** Hata gövdesi → panel dilinde açıklama. */
  const ERRORS: Record<string, string> = {
    too_many: t.table.errors.too_many,
    not_found: t.table.errors.not_found,
    no_exportable: t.table.errors.no_exportable,
    forbidden: t.table.errors.forbidden,
  };
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
        setError(ERRORS[body.error ?? ''] ?? t.table.errors.generic);
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
      toast('success', t.table.downloadedToast(plan.fileCount));
    } catch {
      // reviewer bulgusu: fetch reddi veya res.blob() hatası önceden
      // yakalanmadan kaçıyordu — kullanıcı diyalog sessizce açık kalırken
      // hiçbir hata görmüyordu.
      setError(t.table.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  const skips: string[] = [];
  if (plan.unassigned > 0) skips.push(t.table.skipUnassigned(plan.unassigned));
  if (plan.unpublished > 0) skips.push(t.table.skipUnpublished(plan.unpublished));

  return (
    <div className="card">
      <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h5 className="card-title mb-0">{t.table.allSenders}</h5>
        <div className="d-flex flex-wrap gap-2">
          {/* Liste CSV'si her role açık — ekranda zaten görünen verinin
              dosyası; imza İÇERİĞİ veren zip'in rol kapısına girmez. */}
          <a href="/api/senders/export-csv" className="btn btn-label-info">
            <i className="icon-base ti tabler-file-spreadsheet me-1" aria-hidden="true" />
            {t.table.exportCsv}
          </a>
          {showExport && (
            <button type="button" className="btn btn-primary" onClick={openDialog}>
              <i className="icon-base ti tabler-file-zip me-1" aria-hidden="true" />
              {t.table.exportZip}
              {selected.size > 0 ? t.table.exportZipSelectedSuffix(selected.size) : ''}
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
                    aria-label={t.table.selectAllAria}
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={toggleAll}
                  />
                </th>
              )}
              <th>{t.table.colSender}</th>
              <th>{t.table.colJobTitle}</th>
              <th>{t.table.colSignatures}</th>
              <th>{t.table.colStatus}</th>
              <th>{t.table.colActions}</th>
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
                        aria-label={t.table.selectRowAria(s.displayName)}
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
          title={t.table.exportDialogTitle}
          onCancel={closeDialog}
          onConfirm={plan.fileCount > 0 ? download : undefined}
          confirmLabel={busy ? t.table.preparing : t.table.download}
          busy={busy}
        >
          {plan.fileCount > 0 ? (
            <>
              <p>
                <strong>{t.table.fileSummaryBold(plan.fileCount)}</strong>
                {t.table.fileSummaryTrail(plan.senderCount)}
              </p>
              {skips.length > 0 && (
                <p>
                  {t.table.skippedPrefix}
                  {skips.join(' · ')}.
                </p>
              )}
            </>
          ) : (
            <p>{t.table.noneExportable}</p>
          )}
          {error && <p className="text-danger mb-0">{error}</p>}
        </ConfirmDialog>
      )}
    </div>
  );
}
