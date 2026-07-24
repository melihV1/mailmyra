'use client';

import type { SignatureData, WebSafeFont } from '@mailmyra/renderer';
import { contrastRatio } from '@mailmyra/renderer';
import type { BuilderAction } from '../reducer';
import { FieldGroup, labelStyle, inputStyle } from '../fields';

const FONTS: WebSafeFont[] = [
  'Arial, Helvetica, sans-serif',
  'Georgia, serif',
  'Times New Roman, serif',
  'Verdana, Geneva, sans-serif',
  'Tahoma, Geneva, sans-serif',
  'Trebuchet MS, sans-serif',
];

const LIGHT_BG = '#ffffff';
const DARK_BG = '#1a1a1a';

/** Spec eşikleri: textColor < 4.5, mutedColor < 3 — iki zeminde de. */
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
      if (contrastRatio(c.color, DARK_BG) < c.min)
        warnings.push(`${c.name} koyu zeminde (dark mode) zor okunur.`);
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={labelStyle}>{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <code style={{ marginLeft: 8, fontSize: 13 }}>{value}</code>
    </label>
  );
}

export function StyleStep({
  data,
  dispatch,
}: {
  data: SignatureData;
  dispatch: (a: BuilderAction) => void;
}) {
  const warnings = contrastWarnings(data.visuals);

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
          value={data.visuals.brandColor}
          onChange={(v) => dispatch({ type: 'patchVisuals', value: { brandColor: v } })}
        />
        <ColorField
          label="Metin rengi"
          value={data.visuals.textColor}
          onChange={(v) => dispatch({ type: 'patchVisuals', value: { textColor: v } })}
        />
        <ColorField
          label="İkincil metin rengi"
          value={data.visuals.mutedColor}
          onChange={(v) => dispatch({ type: 'patchVisuals', value: { mutedColor: v } })}
        />
      </FieldGroup>

      <FieldGroup title="Tipografi ve Düzen">
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={labelStyle}>Font</span>
          <select
            style={inputStyle}
            value={data.visuals.fontFamily}
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
          <span style={labelStyle}>İkon stili (sosyal ikonlar CDN ikonlarıyla gelecek)</span>
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
      </FieldGroup>
    </div>
  );
}
