'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { useDropdown } from '../../navbar/useDropdown';

/**
 * Satır aksiyonları — temanın üç-nokta menüsü (2026-08-14 tema turu:
 * "temadaki elementleri kullan"). Silme onayı artık window.confirm değil,
 * ortak ConfirmDialog (tema modal'ı); CDN gerçeği metinde duruyor.
 */
export function RowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const { open, setOpen, ref } = useDropdown<HTMLDivElement>();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const duplicate = async () => {
    setOpen(false);
    setBusy(true);
    const res = await fetch(`/api/signatures/${id}/duplicate`, { method: 'POST' });
    setBusy(false);
    if (res.ok) router.refresh();
  };

  const remove = async () => {
    setBusy(true);
    const res = await fetch(`/api/signatures/${id}/delete`, { method: 'POST' });
    setBusy(false);
    setConfirming(false);
    if (res.ok) router.refresh();
  };

  return (
    <>
      <div className="dropdown" ref={ref}>
        <button
          type="button"
          className="btn btn-icon btn-text-secondary rounded-pill dropdown-toggle hide-arrow"
          aria-label={`Actions for ${name}`}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          disabled={busy}
        >
          <i className="icon-base ti tabler-dots-vertical icon-md" aria-hidden="true" />
        </button>
        <ul
          className={`dropdown-menu dropdown-menu-end${open ? ' show' : ''}`}
          style={open ? { position: 'absolute', right: 0 } : undefined}
        >
          <li>
            <Link href={`/builder?sig=${id}`} className="dropdown-item">
              <i className="icon-base ti tabler-edit me-2" aria-hidden="true" />
              Edit in builder
            </Link>
          </li>
          <li>
            <button type="button" className="dropdown-item" onClick={() => void duplicate()}>
              <i className="icon-base ti tabler-copy me-2" aria-hidden="true" />
              Duplicate
            </button>
          </li>
          <li>
            <hr className="dropdown-divider" />
          </li>
          <li>
            <button
              type="button"
              className="dropdown-item text-danger"
              onClick={() => {
                setOpen(false);
                setConfirming(true);
              }}
            >
              <i className="icon-base ti tabler-trash me-2" aria-hidden="true" />
              Delete
            </button>
          </li>
        </ul>
      </div>

      {confirming && (
        <ConfirmDialog
          title={`Delete “${name}”?`}
          onCancel={() => !busy && setConfirming(false)}
          onConfirm={remove}
          confirmLabel="Delete"
          tone="danger"
          busy={busy}
        >
          {/* Onay metni CDN gerçeğini açıkça söylüyor (panel-brief §2.4): görsel
              URL'leri kalıcıdır, imzayı silmek sahadaki kopyaları kırmaz. */}
          <p className="mb-0">
            Uploaded images stay on the CDN, so copies of this signature already in use keep
            working. The signature itself cannot be recovered.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
