'use client';

import { useRouter } from 'next/navigation';
import { useState, type ChangeEvent } from 'react';

import { guessMapping, parseCsv, validateRows, type ColumnMapping, type ParsedCsv } from '../../../../lib/csv';
import { senders as sendersDict } from '../../../../lib/i18n/dict/senders';
import { useLang } from '../../../../lib/i18n/LangProvider';
import { useToast } from '../../ToastProvider';

/**
 * CSV içe aktarma (panel-brief §2.10): dosya → sütun eşleme → önizleme
 * (ilk 10 satır, hatalılar kırmızı, satır numarasıyla) → "N gönderici,
 * hepsi TASLAK olarak" → onay. Koltuk yemez; tavan doluyken de çalışır.
 *
 * 2026-08-14: gövde tema diline geçti (form-control dosya girişi,
 * form-select eşleme, tema tablosu) — pilotta eski stilde unutulan son
 * parçaydı; başarı bildirimi artık toast.
 */
export function ImportCsv() {
  const router = useRouter();
  const toast = useToast();
  const lang = useLang();
  const t = sendersDict[lang];
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({ displayName: null, email: null, jobTitle: null });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const p = parseCsv(text);
    setParsed(p);
    setMapping(guessMapping(p.headers));
    setFailed(false);
  };

  const { valid, errors } = parsed ? validateRows(parsed.rows, mapping) : { valid: [], errors: [] };
  const errorLines = new Set(errors.map((e) => e.line));
  const ready = mapping.displayName !== null && mapping.email !== null && valid.length > 0;

  const submit = async () => {
    setBusy(true);
    setFailed(false);
    const res = await fetch('/api/senders/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: valid }),
    });
    setBusy(false);
    if (!res.ok) return setFailed(true);
    const body = (await res.json()) as { created: number; skipped: string[] };
    toast(
      'success',
      t.importCsv.importedToast(body.created, body.skipped.length),
      t.importCsv.importedToastTitle,
    );
    setParsed(null);
    setOpen(false);
    router.refresh();
  };

  const fieldPicker = (field: keyof ColumnMapping, label: string) => (
    <div className="col-sm-4">
      <label className="form-label" htmlFor={`csv-map-${field}`}>
        {label}
      </label>
      <select
        id={`csv-map-${field}`}
        className="form-select"
        value={mapping[field] ?? ''}
        onChange={(e) =>
          setMapping({ ...mapping, [field]: e.target.value === '' ? null : Number(e.target.value) })
        }
      >
        <option value="">—</option>
        {parsed?.headers.map((h, i) => (
          <option key={i} value={i}>
            {h || t.importCsv.columnFallback(i + 1)}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="mt-3">
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => setOpen(!open)}
      >
        <i className="icon-base ti tabler-upload me-1" aria-hidden="true" />
        {open ? t.importCsv.hide : t.importCsv.show}
      </button>

      {open && (
        <div className="border rounded p-4 mt-3">
          {/* Adım çubuğu — Dosya → Eşleme → Önizleme; tamamlanan yeşil ✓ */}
          <div className="d-flex align-items-center flex-wrap gap-2 mb-4">
            {[
              { n: 1, label: t.importCsv.stepUpload, done: parsed !== null, active: parsed === null },
              { n: 2, label: t.importCsv.stepMap, done: ready, active: parsed !== null && !ready },
              { n: 3, label: t.importCsv.stepPreview, done: false, active: ready },
            ].map((step, i) => (
              <span key={step.n} className="d-inline-flex align-items-center gap-2">
                {i > 0 && (
                  <i
                    className="icon-base ti tabler-chevron-right text-body-secondary mx-1"
                    aria-hidden="true"
                  />
                )}
                <span className="avatar avatar-xs">
                  <span
                    className={`avatar-initial rounded-circle ${
                      step.done ? 'bg-success' : step.active ? 'bg-primary' : 'bg-label-secondary'
                    }`}
                  >
                    {step.done ? (
                      <i className="icon-base ti tabler-check icon-14px" aria-hidden="true" />
                    ) : (
                      step.n
                    )}
                  </span>
                </span>
                <span
                  className={
                    step.done || step.active ? 'fw-medium text-heading' : 'text-body-secondary'
                  }
                >
                  {step.label}
                </span>
              </span>
            ))}
          </div>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="csv-file">
                {t.importCsv.fileLabel}
              </label>
              <input
                id="csv-file"
                type="file"
                className="form-control"
                accept=".csv,text/csv"
                onChange={(e) => void onFile(e)}
              />
              <div className="form-text">{t.importCsv.fileHint}</div>
            </div>
          </div>

          {parsed && (
            <>
              <div className="row g-3 mt-1">
                {fieldPicker('displayName', t.importCsv.nameLabel)}
                {fieldPicker('email', t.importCsv.emailLabel)}
                {fieldPicker('jobTitle', t.importCsv.jobTitleLabel)}
              </div>

              <div className="table-responsive mt-4">
                <table className="table table-sm table-bordered mb-2">
                  <tbody>
                    {parsed.rows.slice(0, 10).map((row, i) => {
                      const line = i + 2;
                      const err = errors.find((e) => e.line === line);
                      return (
                        <tr key={i} className={errorLines.has(line) ? 'table-danger' : ''}>
                          <td className="text-body-secondary">{line}</td>
                          {row.map((cell, j) => (
                            <td key={j}>{cell}</td>
                          ))}
                          {err && (
                            <td className="text-danger small">{t.importCsv.reason[err.reason]}</td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {parsed.rows.length > 10 && (
                  <small className="text-body-secondary">
                    {t.importCsv.moreRows(parsed.rows.length - 10)}
                  </small>
                )}
              </div>

              <p className="mt-3 mb-3">
                <strong>{valid.length}</strong>
                {t.importCsv.summarySenderWord(valid.length)}
                <strong>{t.importCsv.summaryDraftsWord}</strong>
                {t.importCsv.summaryTrail}
                {errors.length > 0 && (
                  <span className="text-danger d-block small mt-1">
                    {t.importCsv.skippedLead(errors.length)}
                    {errors
                      .map((e) => t.importCsv.lineReason(e.line, t.importCsv.reason[e.reason]))
                      .join(' · ') + ')'}
                  </span>
                )}
              </p>

              <div className="d-flex align-items-center flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void submit()}
                  disabled={busy || !ready}
                >
                  <i className="icon-base ti tabler-upload me-1" aria-hidden="true" />
                  {busy ? t.importCsv.importing : t.importCsv.importLabel(valid.length)}
                </button>
                {!ready && (
                  <small className="text-body-secondary">{t.importCsv.mapFirst}</small>
                )}
                {failed && (
                  <small className="text-danger" role="alert">
                    {t.importCsv.failed}
                  </small>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
