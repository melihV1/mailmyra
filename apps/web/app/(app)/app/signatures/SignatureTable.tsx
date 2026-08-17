'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { SignatureData } from '@mailmyra/renderer';

import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import type { SignatureRow } from '../../../../lib/repo/signatures';
import {
  EMPTY_FILTERS,
  filterSignatures,
  hasActiveFilters,
  templateOptions,
  type SignatureFilterState,
} from '../../../../lib/signature-filter';
import { useToast } from '../../ToastProvider';
import { AssignSelect } from './AssignSelect';
import { NewSignatureButton } from './NewSignatureButton';
import { RowActions } from './RowActions';

/* Vuexy rozet dili: bg-label-* (dolu renk değil, pastel etiket). */
const SENDER_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-label-secondary' },
  active: { label: 'Live', cls: 'bg-label-success' },
  inactive: { label: 'Inactive', cls: 'bg-label-warning' },
};

/**
 * İmza listesi — temanın `app-user-list` kalıbı: kart başlığında süzgeç
 * satırı, altında tablo. Süzme/sıralama tamamen ekranda (bkz.
 * `lib/signature-filter.ts`); DataTables/jQuery ALINMADI, tema yalnız
 * markup + CSS referansı.
 *
 * Veriyi sunucu bileşeni veriyor; `AssignSelect` ve `RowActions` taşınırken
 * olduğu gibi korundu.
 */
export function SignatureTable({
  rows,
  senders,
  seedData,
}: {
  rows: SignatureRow[];
  senders: Array<{ id: string; displayName: string }>;
  seedData?: SignatureData;
}) {
  const router = useRouter();
  const toast = useToast();
  const [filters, setFilters] = useState<SignatureFilterState>(EMPTY_FILTERS);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allBox = useRef<HTMLInputElement>(null);

  const templates = useMemo(() => templateOptions(rows), [rows]);
  const visible = useMemo(() => filterSignatures(rows, filters), [rows, filters]);
  const filtered = hasActiveFilters(filters);

  /**
   * Seçim DAİMA görünen satırlarla kesişir. Süzgeç daraldığında ekranda
   * olmayan bir satır ne "N selected" sayısına ne de toplu silmeye girer —
   * "hepsini seç" deyip süzgeci değiştiren kullanıcı, görmediği bir imzayı
   * silemez. Bu ekranın en pahalı hatası olurdu.
   */
  const selected = useMemo(() => visible.filter((r) => picked.has(r.id)), [visible, picked]);

  useEffect(() => {
    if (allBox.current) {
      allBox.current.indeterminate = selected.length > 0 && selected.length < visible.length;
    }
  }, [selected.length, visible.length]);

  function toggle(id: string) {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  }

  /** Yalnız görünen satırlar: süzgeçliyken "hepsi" ekrandakiler demektir. */
  function toggleAll() {
    if (selected.length === visible.length) {
      const next = new Set(picked);
      for (const r of visible) next.delete(r.id);
      setPicked(next);
      return;
    }
    setPicked(new Set([...picked, ...visible.map((r) => r.id)]));
  }

  function clearFilters() {
    setFilters({ ...EMPTY_FILTERS, sort: filters.sort });
  }

  async function deleteSelected() {
    const ids = selected.map((r) => r.id);
    setBusy(true);
    setError(null);
    let done = 0;
    for (const id of ids) {
      // Toplu uç açılmadı: tekil silme ucu satır satır çağrılıyor. Ayrı bir
      // toplu yol aynı yetki kapısını ikinci kez yazmak, ikinci kez de
      // yanlış yazma riski demekti.
      const res = await fetch(`/api/signatures/${id}/delete`, { method: 'POST' }).catch(
        () => null,
      );
      if (res?.ok) done += 1;
    }
    const failed = ids.length - done;
    setBusy(false);
    setConfirming(false);
    setPicked(new Set());
    // Başarı toast'la geçer, HATA ekranda kalır (proje kuralı) — kısmi
    // başarıda ikisi birden görünür, kullanıcı neyin kaldığını bilir.
    if (done > 0) {
      toast(
        'success',
        `Deleted ${done} signature${done === 1 ? '' : 's'}. Uploaded images stay on the CDN.`,
      );
    }
    if (failed > 0) {
      setError(
        `${failed} signature${failed === 1 ? '' : 's'} could not be deleted — reload the page and try again.`,
      );
    }
    router.refresh();
  }

  return (
    <div className="card">
      <div className="card-header border-bottom">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <h5 className="card-title mb-0">
            All signatures{' '}
            <span className="badge bg-label-primary ms-1">{visible.length}</span>
            {visible.length !== rows.length && (
              <small className="text-body-secondary ms-2">of {rows.length}</small>
            )}
          </h5>
          <div className="d-flex flex-wrap align-items-center gap-3">
            {selected.length > 0 && (
              <div className="d-flex align-items-center gap-2">
                <span className="text-body-secondary" role="status">
                  {selected.length} selected
                </span>
                <button
                  type="button"
                  className="btn btn-label-danger"
                  onClick={() => {
                    setError(null);
                    setConfirming(true);
                  }}
                >
                  <i className="icon-base ti tabler-trash me-1" aria-hidden="true" />
                  Delete selected
                </button>
              </div>
            )}
            <NewSignatureButton seedData={seedData} />
          </div>
        </div>

        {/* Temanın filtre satırı (app-user-list): kart başlığının altında,
            dört eşit sütun. Etiket yok, seçeneğin ilk maddesi kendini
            anlatıyor; ekran okuyucu için aria-label var. */}
        <div className="row pt-4 gap-4 gap-md-0">
          <div className="col-md-3">
            <div className="input-group input-group-merge">
              <span className="input-group-text" id="signatureSearchIcon">
                <i className="icon-base ti tabler-search" aria-hidden="true" />
              </span>
              <input
                type="search"
                className="form-control"
                placeholder="Search signatures"
                aria-label="Search signatures by name or template"
                aria-describedby="signatureSearchIcon"
                value={filters.query}
                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              />
            </div>
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              aria-label="Filter by assignment"
              value={filters.assignment}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  assignment: e.target.value as SignatureFilterState['assignment'],
                })
              }
            >
              <option value="all">All assignments</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              aria-label="Filter by template"
              value={filters.templateId}
              onChange={(e) => setFilters({ ...filters, templateId: e.target.value })}
            >
              <option value="">All templates</option>
              {templates.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              aria-label="Sort signatures"
              value={filters.sort}
              onChange={(e) =>
                setFilters({ ...filters, sort: e.target.value as SignatureFilterState['sort'] })
              }
            >
              <option value="recent">Recently updated</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="card-body pb-0">
          <div className="alert alert-danger mb-0" role="alert">
            {error}
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="card-body text-center py-5">
          <h6 className="mb-2">No signatures match these filters</h6>
          <p className="text-body-secondary mb-4">
            Try a different search, or widen the assignment and template filters.
          </p>
          <button type="button" className="btn btn-label-primary" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th style={{ width: '1%' }}>
                  <input
                    ref={allBox}
                    type="checkbox"
                    className="form-check-input"
                    aria-label={filtered ? 'Select all matching signatures' : 'Select all'}
                    checked={visible.length > 0 && selected.length === visible.length}
                    onChange={toggleAll}
                  />
                </th>
                <th>Signature</th>
                <th>Assigned to</th>
                <th>Status</th>
                <th>Updated</th>
                <th style={{ width: '1%' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="table-border-bottom-0">
              {visible.map((s) => {
                const badge = s.senderStatus ? SENDER_BADGE[s.senderStatus] : null;
                return (
                  <tr key={s.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        aria-label={`Select ${s.name}`}
                        checked={picked.has(s.id)}
                        onChange={() => toggle(s.id)}
                      />
                    </td>
                    <td>
                      <span className="d-block fw-medium text-heading mb-1">{s.name}</span>
                      <span className="badge bg-label-info">{s.templateId}</span>
                    </td>
                    <td>
                      <AssignSelect signatureId={s.id} current={s.senderId} senders={senders} />
                    </td>
                    <td>
                      {badge ? (
                        <span className={`badge ${badge.cls}`}>{badge.label}</span>
                      ) : (
                        <span className="badge bg-label-secondary">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <time dateTime={s.updatedAt.toISOString()}>
                        {s.updatedAt.toLocaleDateString('en-GB')}
                      </time>
                    </td>
                    <td>
                      <RowActions id={s.id} name={s.name} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          title={`Delete ${selected.length} signature${selected.length === 1 ? '' : 's'}?`}
          onCancel={() => !busy && setConfirming(false)}
          onConfirm={deleteSelected}
          confirmLabel={busy ? 'Deleting…' : 'Delete'}
          tone="danger"
          busy={busy}
        >
          {/* Tekil silmedeki CDN gerçeği aynen duruyor (panel-brief §2.4):
              görsel URL'leri kalıcıdır, imzayı silmek sahadaki kopyaları
              kırmaz. */}
          <p>
            Uploaded images stay on the CDN, so copies of these signatures already in use keep
            working. The signatures themselves cannot be recovered.
          </p>
          <ul className="mb-0 ps-4">
            {selected.slice(0, 5).map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
            {selected.length > 5 && (
              <li className="text-body-secondary">and {selected.length - 5} more</li>
            )}
          </ul>
        </ConfirmDialog>
      )}
    </div>
  );
}
