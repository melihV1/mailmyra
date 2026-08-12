'use client';

import { useState } from 'react';

import type { SenderRowData } from '../../../../lib/repo/senders';
import { exportPlan } from '../../../../lib/export-plan';
import { SenderActions } from './SenderActions';
import styles from './senders.module.css';

const BADGE: Record<string, { label: string; cls: 'draft' | 'active' | 'inactive' }> = {
  draft: { label: 'Draft', cls: 'draft' },
  active: { label: 'Live', cls: 'active' },
  inactive: { label: 'Inactive', cls: 'inactive' },
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
    <div>
      {showExport && (
        <div className={styles.exportBar}>
          <label className={styles.selectAll}>
            <input
              type="checkbox"
              checked={rows.length > 0 && selected.size === rows.length}
              onChange={toggleAll}
            />
            Select all
          </label>
          <button type="button" onClick={openDialog}>
            Export zip{selected.size > 0 ? ` (${selected.size} selected)` : ''}
          </button>
        </div>
      )}

      <ul className={styles.list}>
        {rows.map((s) => {
          const badge = BADGE[s.status]!;
          return (
            <li key={s.id} className={styles.row}>
              {showExport && (
                <input
                  type="checkbox"
                  aria-label={`Select ${s.displayName}`}
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                />
              )}
              <span className={styles.rowName}>{s.displayName}</span>
              <span className={styles.rowMeta}>{s.email}</span>
              {s.jobTitle && <span className={styles.rowMeta}>{s.jobTitle}</span>}
              <span className={`${styles.badge} ${styles[badge.cls]}`}>{badge.label}</span>
              <span className={styles.rowMeta}>
                {s.signatureNames.length > 0 ? s.signatureNames.join(', ') : '—'}
              </span>
              <SenderActions
                id={s.id}
                name={s.displayName}
                status={s.status}
                activeSeats={activeSeats}
                entitledSeats={entitledSeats}
              />
            </li>
          );
        })}
      </ul>

      {dialogOpen && (
        <div role="dialog" aria-modal="true" className={styles.exportDialog}>
          <h2>Export zip</h2>
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
          {error && <p className={styles.exportError}>{error}</p>}
          <div className={styles.exportDialogActions}>
            <button type="button" onClick={closeDialog} disabled={busy}>
              Cancel
            </button>
            {plan.fileCount > 0 && (
              <button type="button" onClick={download} disabled={busy}>
                {busy ? 'Preparing…' : 'Download'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
