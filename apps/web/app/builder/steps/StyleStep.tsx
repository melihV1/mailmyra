'use client';

import type { SignatureData, WebSafeFont } from '@mailmyra/renderer';
import { contrastRatio } from '@mailmyra/renderer';
import type { BuilderAction } from '../reducer';
import { FieldGroup, labelStyle, inputStyle } from '../fields';
import { WEB_SAFE_FONTS } from '../../../lib/brand-doc';
import type { BrandFieldName } from '../../../lib/brand-apply';
import styles from '../builder.module.css';

const FONTS: readonly WebSafeFont[] = WEB_SAFE_FONTS;

const LIGHT_BG = '#ffffff';
const PURE_BLACK = '#000000';
/** Saf-siyah bandı (≈ #000–#111): bu orandan düşükse koyu modda risklidir. */
const NEAR_BLACK_MAX_RATIO = 1.2;

/**
 * Spec (§1): iki BAĞIMSIZ kontrol.
 * 1) Çok açık: beyaz zeminde okunurluk — textColor < 4.5, mutedColor < 3.
 * 2) Saf siyaha yakın: contrastRatio(renk, #000000) < 1.2 — koyu mod riski.
 * (#1a1a1a siyaha karşı ≈1.206 → bilerek bandın hemen DIŞINDA kalır.)
 */
export function contrastWarnings(visuals: SignatureData['visuals']): string[] {
  const warnings: string[] = [];
  const checks: Array<{ color: string; min: number; name: string }> = [
    { color: visuals.textColor, min: 4.5, name: 'Metin rengi' },
    { color: visuals.mutedColor, min: 3, name: 'İkincil metin rengi' },
  ];
  for (const c of checks) {
    try {
      if (contrastRatio(c.color, LIGHT_BG) < c.min)
        warnings.push(`${c.name} beyaz zeminde zor okunur.`);
      if (contrastRatio(c.color, PURE_BLACK) < NEAR_BLACK_MAX_RATIO)
        warnings.push(`${c.name} saf siyaha çok yakın; koyu modda sorun çıkarabilir.`);
    } catch {
      // geçersiz hex — renk seçici geçerli hex üretir, elle bozuk girişte sessiz kal
    }
  }
  return warnings;
}

function ColorField({
  label,
  value,
  onChange,
  locked = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  locked?: boolean;
}) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={labelStyle}>{label}</span>
      <input type="color" value={value} disabled={locked} onChange={(e) => onChange(e.target.value)} />
      <code style={{ marginLeft: 8, fontSize: 13 }}>{value}</code>
      {locked && <span className={styles.lockHint}>🔒 Marka ayarlarından yönetiliyor</span>}
    </label>
  );
}

export function StyleStep({
  data,
  applied,
  dispatch,
  iconLowContrast = false,
  locked = new Set<BrandFieldName>(),
}: {
  data: SignatureData;
  /** `applyBrand(data, brand)` çıktısı — kilitli kontroller GÖSTERİLEN
   *  değeri buradan okur, ham `data`'dan değil (aksi halde marka
   *  değiştikten sonra disabled kontrol eski kişisel değeri gösterir). */
  applied: SignatureData;
  dispatch: (a: BuilderAction) => void;
  iconLowContrast?: boolean;
  /** Marka ayarlarından yönetilen alan adları — o kontroller pasif. */
  locked?: Set<BrandFieldName>;
}) {
  // Bindirilmiş renkler denetlenir (review bulgusu #2): org kilitli kötü bir
  // renk uyarı versin, marka geçersiz kılan kişisel bir renk YANLIŞ uyarmasın
  // — kontrol `applyBrand` çıktısına göre yapılır, ham `data`'ya göre değil.
  const warnings = contrastWarnings(applied.visuals);

  return (
    <div>
      {warnings.length > 0 && (
        <div
          role="alert"
          style={{
            background: '#fff7e6',
            border: '1px solid #dca16f',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {warnings.map((w) => (
            <div key={w}>⚠️ {w}</div>
          ))}
        </div>
      )}

      <FieldGroup title="Renkler">
        <ColorField
          label="Marka rengi"
          value={locked.has('brandColor') ? applied.visuals.brandColor : data.visuals.brandColor}
          onChange={(v) => dispatch({ type: 'patchVisuals', value: { brandColor: v } })}
          locked={locked.has('brandColor')}
        />
        <ColorField
          label="Metin rengi"
          value={locked.has('textColor') ? applied.visuals.textColor : data.visuals.textColor}
          onChange={(v) => dispatch({ type: 'patchVisuals', value: { textColor: v } })}
          locked={locked.has('textColor')}
        />
        <ColorField
          label="İkincil metin rengi"
          value={locked.has('mutedColor') ? applied.visuals.mutedColor : data.visuals.mutedColor}
          onChange={(v) => dispatch({ type: 'patchVisuals', value: { mutedColor: v } })}
          locked={locked.has('mutedColor')}
        />
        <ColorField
          label="İkon rengi"
          value={data.visuals.iconColor}
          onChange={(v) => dispatch({ type: 'patchVisuals', value: { iconColor: v } })}
        />
      </FieldGroup>

      <FieldGroup title="Tipografi ve Düzen">
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={labelStyle}>Font</span>
          <select
            style={inputStyle}
            value={locked.has('fontFamily') ? applied.visuals.fontFamily : data.visuals.fontFamily}
            disabled={locked.has('fontFamily')}
            onChange={(e) =>
              dispatch({ type: 'patchVisuals', value: { fontFamily: e.target.value as WebSafeFont } })
            }
          >
            {FONTS.map((f) => (
              <option key={f} value={f}>
                {f.split(',')[0]}
              </option>
            ))}
          </select>
          {locked.has('fontFamily') && (
            <span className={styles.lockHint}>🔒 Marka ayarlarından yönetiliyor</span>
          )}
        </label>

        <span style={labelStyle}>Boyut</span>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          {(['small', 'medium', 'large'] as const).map((s) => (
            <label key={s}>
              <input
                type="radio"
                name="size"
                checked={data.layout.size === s}
                onChange={() => dispatch({ type: 'patchLayout', value: { size: s } })}
              />{' '}
              {s === 'small' ? 'Küçük' : s === 'medium' ? 'Orta' : 'Büyük'}
            </label>
          ))}
        </div>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={data.layout.showDividers}
            onChange={(e) => dispatch({ type: 'patchLayout', value: { showDividers: e.target.checked } })}
          />{' '}
          Ayraç çizgisi göster
        </label>

        <label style={{ display: 'block' }}>
          <span style={labelStyle}>İkon stili</span>
          <select
            style={inputStyle}
            value={data.layout.iconStyle}
            onChange={(e) =>
              dispatch({
                type: 'patchLayout',
                value: { iconStyle: e.target.value as SignatureData['layout']['iconStyle'] },
              })
            }
          >
            <option value="filled">Dolu</option>
            <option value="outline">Kontur</option>
            <option value="mono">Tek renk</option>
          </select>
        </label>
        {data.layout.iconStyle === 'filled' && (
          <p style={{ fontSize: 13, color: '#666666', marginTop: 8 }}>
            Dolu stilde ikonlar platformların kendi renkleriyle basılır — İkon
            rengi bu stilde kullanılmaz.
          </p>
        )}

        {(data.layout.iconStyle === 'outline' || data.layout.iconStyle === 'mono') &&
          iconLowContrast && (
            <p style={{ fontSize: 13, color: '#666666', marginTop: 8 }}>
              ℹ️ İkon rengin açık tonda — beyaz zeminde ikonlar soluk görünebilir.
            </p>
          )}
      </FieldGroup>
    </div>
  );
}
