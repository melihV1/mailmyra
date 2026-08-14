'use client';

import { useRouter } from 'next/navigation';
import { useState, type ChangeEvent } from 'react';

import { guessMapping, parseCsv, validateRows, type ColumnMapping, type ParsedCsv } from '../../../../lib/csv';
import styles from './senders.module.css';

/**
 * CSV içe aktarma (panel-brief §2.10): dosya → sütun eşleme → önizleme
 * (ilk 10 satır, hatalılar kırmızı, satır numarasıyla) → "N gönderici,
 * hepsi TASLAK olarak" → onay. Koltuk yemez; tavan doluyken de çalışır.
 */
export function ImportCsv() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({ displayName: null, email: null, jobTitle: null });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ created: number; skipped: number } | null>(null);
  const [failed, setFailed] = useState(false);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const p = parseCsv(text);
    setParsed(p);
    setMapping(guessMapping(p.headers));
    setDone(null);
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
    setDone({ created: body.created, skipped: body.skipped.length });
    setParsed(null);
    router.refresh();
  };

  const reasonText: Record<string, string> = {
    missing_name: 'name is missing',
    invalid_email: 'email does not look right',
    duplicate_in_file: 'duplicate of an earlier row',
  };

  const fieldPicker = (field: keyof ColumnMapping, label: string) => (
    <label className={styles.mapField}>
      <span className={styles.mapLabel}>{label}</span>
      <select
        className={styles.roleLikeSelect}
        value={mapping[field] ?? ''}
        onChange={(e) =>
          setMapping({ ...mapping, [field]: e.target.value === '' ? null : Number(e.target.value) })
        }
      >
        <option value="">—</option>
        {parsed?.headers.map((h, i) => (
          <option key={i} value={i}>
            {h || `Column ${i + 1}`}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="mt-3">
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => setOpen(!open)}
      >
        <i className="icon-base ti tabler-upload me-1" aria-hidden="true" />
        {open ? 'Hide CSV import' : 'Import from CSV'}
      </button>

      {done && (
        <span className="text-success small ms-2" role="status">
          Added {done.created} sender{done.created === 1 ? '' : 's'} as drafts
          {done.skipped > 0 && ` — ${done.skipped} already existed and were skipped`}.
        </span>
      )}

      {open && (
        <div className={styles.importBody}>
          <input type="file" accept=".csv,text/csv" onChange={onFile} className={styles.fileInput} />

          {parsed && (
            <>
              <div className={styles.mapRow}>
                {fieldPicker('displayName', 'Full name')}
                {fieldPicker('email', 'Email')}
                {fieldPicker('jobTitle', 'Job title (optional)')}
              </div>

              <div className={styles.previewWrap}>
                <table className={styles.preview}>
                  <tbody>
                    {parsed.rows.slice(0, 10).map((row, i) => {
                      const line = i + 2;
                      const err = errors.find((e) => e.line === line);
                      return (
                        <tr key={i} className={errorLines.has(line) ? styles.badRow : ''}>
                          <td className={styles.lineNo}>{line}</td>
                          {row.map((cell, j) => (
                            <td key={j}>{cell}</td>
                          ))}
                          {err && <td className={styles.rowErr}>{reasonText[err.reason]}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {parsed.rows.length > 10 && (
                  <span className={styles.rowMeta}>…and {parsed.rows.length - 10} more rows</span>
                )}
              </div>

              <p className={styles.importSummary}>
                <strong>{valid.length}</strong> sender{valid.length === 1 ? '' : 's'} will be added —
                all as <strong>drafts</strong>, using no seats.
                {errors.length > 0 && (
                  <span className={styles.error}>
                    {' '}
                    {errors.length} row{errors.length === 1 ? '' : 's'} will be skipped (
                    {errors.map((e) => `line ${e.line}: ${reasonText[e.reason]}`).join(' · ')})
                  </span>
                )}
              </p>

              <button type="button" className={styles.primary} onClick={submit} disabled={busy || !ready}>
                {busy ? 'Importing…' : `Import ${valid.length} sender${valid.length === 1 ? '' : 's'}`}
              </button>
              {!ready && parsed && (
                <span className={styles.rowMeta}> Map the name and email columns first.</span>
              )}
              {failed && (
                <span className={styles.error} role="alert">
                  Import failed — try again.
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
