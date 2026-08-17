'use client';

import type { SignatureData, WebSafeFont } from '@mailmyra/renderer';
import { contrastRatio, TEMPLATE_IDS } from '@mailmyra/renderer';
import type { BuilderAction } from '../reducer';
import { FieldGroup, LockHint } from '../fields';
import { WEB_SAFE_FONTS } from '../../../lib/brand-doc';
import type { BrandFieldName } from '../../../lib/brand-apply';

const FONTS: readonly WebSafeFont[] = WEB_SAFE_FONTS;

/**
 * Şablon vitrini. Kaynak listesi renderer'ın `TEMPLATE_IDS`i — buraya
 * yalnız ETİKET yazılır; yeni şablon eklendiğinde etiketi yoksa ham id
 * gösterilir, seçenek listeden DÜŞMEZ (sessizce erişilemez şablon olmaz).
 */
const TEMPLATE_LOOKS: Record<string, { name: string; blurb: string; icon: string }> = {
  'classic-horizontal': {
    name: 'Classic',
    blurb: 'Photo on the left, details on the right.',
    icon: 'tabler-layout-columns',
  },
  'stacked-minimal': {
    name: 'Stacked',
    blurb: 'One narrow column — images on top.',
    icon: 'tabler-layout-rows',
  },
  'card-bordered': {
    name: 'Card',
    blurb: 'Bordered card with a brand accent bar.',
    icon: 'tabler-layout-board-split',
  },
};

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
    { color: visuals.textColor, min: 4.5, name: 'Text color' },
    { color: visuals.mutedColor, min: 3, name: 'Secondary text color' },
  ];
  for (const c of checks) {
    try {
      if (contrastRatio(c.color, LIGHT_BG) < c.min)
        warnings.push(`${c.name} is hard to read on a white background.`);
      if (contrastRatio(c.color, PURE_BLACK) < NEAR_BLACK_MAX_RATIO)
        warnings.push(`${c.name} is very close to pure black and can disappear in dark mode.`);
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
    <div className="col-12 col-md-6">
      <label className="form-label">{label}</label>
      <div className="input-group">
        <input
          type="color"
          className="form-control form-control-color"
          value={value}
          disabled={locked}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} picker`}
        />
        <input
          type="text"
          className="form-control font-monospace"
          value={value}
          disabled={locked}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} hex value`}
        />
      </div>
      {locked && <LockHint />}
    </div>
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
  const templateLocked = locked.has('templateId');

  return (
    <div>
      {warnings.length > 0 && (
        <div className="alert alert-warning" role="alert">
          <h6 className="alert-heading mb-1 d-flex align-items-center gap-2">
            <i className="icon-base ti tabler-alert-triangle icon-18px" aria-hidden="true" />
            Contrast
          </h6>
          {warnings.map((w) => (
            <div key={w} className="small">
              {w}
            </div>
          ))}
        </div>
      )}

      <FieldGroup title="Template" icon="tabler-layout-grid" first>
        <div className="col-12">
          <div className="row g-3">
            {TEMPLATE_IDS.map((id) => {
              const look = TEMPLATE_LOOKS[id];
              // Kilitliyken GÖSTERİLEN şablon bindirilmiş veriden gelir —
              // diğer kontrollerdeki desenin aynısı.
              const current = templateLocked ? applied.layout.templateId : data.layout.templateId;
              const active = current === id;
              return (
                <div className="col-12 col-sm-4" key={id}>
                  <button
                    type="button"
                    /* d-flex flex-column ŞART: temanın `.btn`i inline-flex,
                       aksi halde ad ve açıklama yan yana yapışıyor. */
                    className={`btn w-100 h-100 text-start p-3 d-flex flex-column align-items-start ${
                      active ? 'btn-primary' : 'btn-label-secondary'
                    }`}
                    aria-pressed={active}
                    disabled={templateLocked}
                    onClick={() => dispatch({ type: 'patchLayout', value: { templateId: id } })}
                  >
                    <span className="d-flex align-items-center gap-2 mb-1 fw-medium">
                      <i
                        className={`icon-base ti ${look?.icon ?? 'tabler-template'} icon-20px`}
                        aria-hidden="true"
                      />
                      {look?.name ?? id}
                    </span>
                    <span className="d-block small opacity-75 text-wrap">{look?.blurb ?? id}</span>
                  </button>
                </div>
              );
            })}
          </div>
          {templateLocked && <LockHint />}
        </div>
      </FieldGroup>

      <FieldGroup title="Colors" icon="tabler-palette">
        <ColorField
          label="Brand color"
          value={locked.has('brandColor') ? applied.visuals.brandColor : data.visuals.brandColor}
          onChange={(v) => dispatch({ type: 'patchVisuals', value: { brandColor: v } })}
          locked={locked.has('brandColor')}
        />
        <ColorField
          label="Text color"
          value={locked.has('textColor') ? applied.visuals.textColor : data.visuals.textColor}
          onChange={(v) => dispatch({ type: 'patchVisuals', value: { textColor: v } })}
          locked={locked.has('textColor')}
        />
        <ColorField
          label="Secondary text color"
          value={locked.has('mutedColor') ? applied.visuals.mutedColor : data.visuals.mutedColor}
          onChange={(v) => dispatch({ type: 'patchVisuals', value: { mutedColor: v } })}
          locked={locked.has('mutedColor')}
        />
        <ColorField
          label="Icon color"
          value={data.visuals.iconColor}
          onChange={(v) => dispatch({ type: 'patchVisuals', value: { iconColor: v } })}
        />
      </FieldGroup>

      <FieldGroup title="Typography and layout" icon="tabler-typography">
        <div className="col-12 col-md-6">
          <label className="form-label">Font</label>
          <select
            className="form-select"
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
          {locked.has('fontFamily') && <LockHint />}
        </div>

        <div className="col-12 col-md-6">
        <label className="form-label d-block">Size</label>
        <div className="d-flex flex-wrap gap-3">
          {(['small', 'medium', 'large'] as const).map((s) => (
            <label key={s} className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="size"
                checked={data.layout.size === s}
                onChange={() => dispatch({ type: 'patchLayout', value: { size: s } })}
              />{' '}
              <span className="form-check-label">
                {s === 'small' ? 'Small' : s === 'medium' ? 'Medium' : 'Large'}
              </span>
            </label>
          ))}
        </div>
        </div>

        <div className="col-12 col-md-6 d-flex align-items-end">
        <label className="form-check mb-2">
          <input
            className="form-check-input"
            type="checkbox"
            checked={data.layout.showDividers}
            onChange={(e) => dispatch({ type: 'patchLayout', value: { showDividers: e.target.checked } })}
          />{' '}
          <span className="form-check-label">Show divider lines</span>
        </label>
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label">Icon style</label>
          <select
            className="form-select"
            value={data.layout.iconStyle}
            onChange={(e) =>
              dispatch({
                type: 'patchLayout',
                value: { iconStyle: e.target.value as SignatureData['layout']['iconStyle'] },
              })
            }
          >
            <option value="filled">Filled</option>
            <option value="outline">Outline</option>
            <option value="mono">Monochrome</option>
          </select>
        </div>
        {data.layout.iconStyle === 'filled' && (
          <div className="col-12">
            <div className="alert alert-secondary mb-0 py-2 small" role="note">
              Filled icons use each platform’s own colors — the icon color is not used in this
              style.
            </div>
          </div>
        )}

        {(data.layout.iconStyle === 'outline' || data.layout.iconStyle === 'mono') &&
          iconLowContrast && (
            <div className="col-12">
              <div className="alert alert-secondary mb-0 py-2 small" role="note">
                Your icon color is light — icons may look faint on a white background.
              </div>
            </div>
          )}
      </FieldGroup>
    </div>
  );
}
