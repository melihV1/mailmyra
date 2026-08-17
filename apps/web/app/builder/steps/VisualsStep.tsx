'use client';

import { useState } from 'react';
import type { SignatureData } from '@mailmyra/renderer';
import type { BuilderAction } from '../reducer';
import { FieldGroup, LockHint } from '../fields';
import type { BrandFieldName } from '../../../lib/brand-apply';

type VisualKey = 'avatarUrl' | 'logoUrl' | 'handSignatureUrl';

const SLOTS: Array<{
  key: VisualKey;
  kind: string;
  icon: string;
  title: string;
  hint: string;
}> = [
  { key: 'avatarUrl', kind: 'avatar', icon: 'tabler-user-circle', title: 'Profile photo', hint: '180px, target under 40KB' },
  { key: 'logoUrl', kind: 'logo', icon: 'tabler-building', title: 'Company logo', hint: '360px, target under 60KB' },
  { key: 'handSignatureUrl', kind: 'handSignature', icon: 'tabler-signature', title: 'Handwritten signature', hint: '300px, target under 50KB' },
];

export function VisualsStep({
  data,
  applied,
  dispatch,
  locked = new Set<BrandFieldName>(),
}: {
  data: SignatureData;
  /** `applyBrand(data, brand)` çıktısı — logoUrl kilitliyken GÖSTERİLEN
   *  değer buradan okunur (bkz. StyleStep aynı desen). */
  applied: SignatureData;
  dispatch: (a: BuilderAction) => void;
  /** Marka ayarlarından yönetilen alan adları — o kontroller pasif. */
  locked?: Set<BrandFieldName>;
}) {
  const [busy, setBusy] = useState<VisualKey | null>(null);
  const [messages, setMessages] = useState<Partial<Record<VisualKey, string>>>({});

  async function upload(slot: (typeof SLOTS)[number], file: File) {
    setBusy(slot.key);
    setMessages((m) => ({ ...m, [slot.key]: undefined }));
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('kind', slot.kind);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const body = (await res.json()) as { url?: string; error?: string; warning?: string };
      if (!res.ok || !body.url) {
        setMessages((m) => ({ ...m, [slot.key]: body.error ?? 'Upload failed.' }));
        return;
      }
      dispatch({ type: 'patchVisuals', value: { [slot.key]: body.url } });
      if (body.warning) setMessages((m) => ({ ...m, [slot.key]: `⚠️ ${body.warning}` }));
    } catch {
      setMessages((m) => ({ ...m, [slot.key]: 'Network error — try again.' }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {SLOTS.map((slot) => {
        // Yalnız logo marka tarafından yönetilebilir — avatar ve el imzası
        // her zaman kişisel kalır.
        const isLocked = slot.key === 'logoUrl' && locked.has('logoUrl');
        // Kilitliyken GÖSTERİLEN url bindirilmiş veriden gelir — aksi halde
        // marka logosu değiştikten sonra bu kontrol eski kişisel logoyu
        // göstermeye devam eder (önizleme/export ise yeni logoyu gösterir).
        const url = isLocked ? applied.visuals[slot.key] : data.visuals[slot.key];
        return (
          <FieldGroup
            key={slot.key}
            title={slot.title}
            icon={slot.icon}
            first={slot.key === 'avatarUrl'}
          >
            <div className="col-12">
              <p className="text-body-secondary small mb-3">
                PNG, JPG or SVG · max 5MB · {slot.hint}
              </p>
              {url ? (
                <div className="d-flex flex-wrap align-items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={slot.title}
                    className="rounded border mm-asset-thumb"
                  />
                  <code className="small text-truncate" style={{ maxWidth: 260 }}>
                    {url}
                  </code>
                  <button
                    type="button"
                    className="btn btn-label-danger btn-sm"
                    disabled={isLocked}
                    onClick={() => {
                      dispatch({ type: 'patchVisuals', value: { [slot.key]: undefined } });
                      setMessages((m) => ({ ...m, [slot.key]: undefined }));
                    }}
                  >
                    <i className="icon-base ti tabler-trash me-1" aria-hidden="true" />
                    Remove
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  className="form-control"
                  accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                  disabled={busy !== null || isLocked}
                  aria-label={`Upload ${slot.title}`}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(slot, f);
                    e.target.value = '';
                  }}
                />
              )}
              {isLocked && <LockHint />}
              {busy === slot.key && (
                <div className="d-flex align-items-center gap-2 mt-2 text-body-secondary small">
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  Uploading…
                </div>
              )}
              {messages[slot.key] && (
                <div className="alert alert-danger mt-3 mb-0 py-2 small" role="alert">
                  {messages[slot.key]}
                </div>
              )}
            </div>
          </FieldGroup>
        );
      })}
    </div>
  );
}
