'use client';

import { useState } from 'react';
import type { SignatureData } from '@mailmyra/renderer';
import type { BuilderAction } from '../reducer';
import { FieldGroup, labelStyle } from '../fields';
import type { BrandFieldName } from '../../../lib/brand-apply';
import styles from '../builder.module.css';

type VisualKey = 'avatarUrl' | 'logoUrl' | 'handSignatureUrl';

const SLOTS: Array<{ key: VisualKey; kind: string; title: string; hint: string }> = [
  { key: 'avatarUrl', kind: 'avatar', title: 'Profil fotoğrafı', hint: '180px, <40KB hedef' },
  { key: 'logoUrl', kind: 'logo', title: 'Şirket logosu', hint: '360px, <60KB hedef' },
  { key: 'handSignatureUrl', kind: 'handSignature', title: 'El imzası', hint: '300px, <50KB hedef' },
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
        setMessages((m) => ({ ...m, [slot.key]: body.error ?? 'Yükleme başarısız.' }));
        return;
      }
      dispatch({ type: 'patchVisuals', value: { [slot.key]: body.url } });
      if (body.warning) setMessages((m) => ({ ...m, [slot.key]: `⚠️ ${body.warning}` }));
    } catch {
      setMessages((m) => ({ ...m, [slot.key]: 'Ağ hatası — tekrar deneyin.' }));
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
          <FieldGroup key={slot.key} title={slot.title}>
            <span style={labelStyle}>
              PNG, JPG veya SVG · max 5MB · {slot.hint}
            </span>
            {url ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={slot.title} style={{ maxWidth: 90, maxHeight: 90, borderRadius: 4 }} />
                <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{url}</code>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    dispatch({ type: 'patchVisuals', value: { [slot.key]: undefined } });
                    setMessages((m) => ({ ...m, [slot.key]: undefined }));
                  }}
                >
                  Kaldır
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                disabled={busy !== null || isLocked}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(slot, f);
                  e.target.value = '';
                }}
              />
            )}
            {isLocked && <span className={styles.lockHint}>🔒 Marka ayarlarından yönetiliyor</span>}
            {busy === slot.key && <p style={{ fontSize: 13 }}>Yükleniyor…</p>}
            {messages[slot.key] && (
              <p style={{ fontSize: 13, color: '#a05a2c' }}>{messages[slot.key]}</p>
            )}
          </FieldGroup>
        );
      })}
    </div>
  );
}
