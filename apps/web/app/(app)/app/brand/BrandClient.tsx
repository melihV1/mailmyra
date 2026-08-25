'use client';

import { useMemo, useState } from 'react';
import { BRAND, TEMPLATE_IDS, fixtures, renderSignature } from '@mailmyra/renderer';

import {
  WEB_SAFE_FONTS,
  isValidBrandHex,
  parseBrandDocument,
  type BrandDocument,
  type BrandField,
  type BrandMode,
} from '../../../../lib/brand-doc';
import { applyBrand, seedBrandDefaults } from '../../../../lib/brand-apply';
import { common } from '../../../../lib/i18n/dict/common';
import { brand as brandDict } from '../../../../lib/i18n/dict/brand';
import { useLang } from '../../../../lib/i18n/LangProvider';
import { mergeWithEmpty } from '../../../builder/reducer';
import { Preview } from '../../../builder/Preview';
import { contrastWarnings } from '../../../builder/steps/StyleStep';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { useToast } from '../../ToastProvider';

/**
 * Marka ekranı (Task 7) — görünüm tema diline taşındı (2026-08-14 turu),
 * MANTIK AYNEN: her alanın "Not managed / Default / Locked" modu var
 * (spec §3/§4; unmanaged alan belgeden SİLİNİR), sağda fixtures[0]'ın
 * bindirilmiş hâlinin canlı önizlemesi (sandbox iframe — Vuexy CSS'i imzaya
 * SIZAMAZ). Mod seçici artık temanın segmented düğme grubu; kilit ikonla
 * söyleniyor. Doğrulamanın tek yetkilisi hâlâ parseBrandDocument.
 *
 * Metinler (Task 5, i18n): `dict/brand.ts`'ten. Kontrast uyarıları
 * (`contrastWarnings`, StyleStep'ten) BİLİNÇLİ dışarıda — builder ile aynı,
 * Türkçe döner, dil göçü bu ekranın kapsamı dışında.
 */

type FieldKey = keyof BrandDocument;
type ModeOption = 'unmanaged' | BrandMode;
type FieldValue<K extends FieldKey> = BrandDocument[K] extends BrandField<infer V> | undefined ? V : never;

function ModeSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ModeOption;
  onChange: (mode: ModeOption) => void;
}) {
  const lang = useLang();
  const t = brandDict[lang];
  return (
    <div className="btn-group btn-group-sm" role="group" aria-label={t.modeGroupAria(label)}>
      {(Object.keys(t.modeLabel) as ModeOption[]).map((m) => (
        <button
          key={m}
          type="button"
          className={`btn ${value === m ? 'btn-primary' : 'btn-outline-primary'}`}
          aria-pressed={value === m}
          onClick={() => onChange(m)}
        >
          {m === 'locked' && (
            <i className="icon-base ti tabler-lock icon-14px me-1" aria-hidden="true" />
          )}
          {t.modeLabel[m]}
        </button>
      ))}
    </div>
  );
}

/**
 * Renk girişi — input-group: solda renk yuvası, sağda ELLE DE yazılabilen
 * hex kutusu (2026-08-14: "renk kısmı kötü görünüyor" düzeltmesi; pembe
 * <code> gitti). Geçersiz hex'i mevcut alan-bazlı doğrulama zaten uyarır,
 * Save'i parseBrandDocument kilitler — burada ekstra bekçi yok.
 */
function ColorControl({
  fieldId,
  value,
  onChange,
}: {
  fieldId: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const lang = useLang();
  const t = brandDict[lang];
  return (
    <div className="input-group" style={{ maxWidth: 220 }}>
      <input
        id={fieldId}
        type="color"
        className="form-control form-control-color"
        // Tarayıcının renk yuvası yalnız geçerli hex kabul eder; elle yazılan
        // değer geçersizken yuva son geçerli rengi göstermeye devam eder.
        value={isValidBrandHex(value) ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        type="text"
        className="form-control font-monospace"
        aria-label={t.hexValueAria}
        value={value}
        maxLength={7}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** Alan satırı kabuğu: başlık + mod seçici üstte, kontrol (yönetiliyorsa) altta. */
function FieldRow({
  label,
  labelFor,
  mode,
  onMode,
  divider = true,
  children,
}: {
  label: string;
  labelFor?: string;
  mode: ModeOption;
  onMode: (m: ModeOption) => void;
  divider?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`p-4${divider ? ' border-bottom' : ''}`}>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        {labelFor ? (
          <label htmlFor={labelFor} className="fw-medium text-heading mb-0">
            {label}
          </label>
        ) : (
          <span className="fw-medium text-heading">{label}</span>
        )}
        <ModeSelect label={label} value={mode} onChange={onMode} />
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

/** Gruplu kart kabuğu — product-add sayfasının kart dili (ikonlu başlık). */
function GroupCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card mb-4">
      <div className="card-header border-bottom py-3">
        <h5 className="card-title mb-0 d-flex align-items-center">
          <i className={`icon-base ti ${icon} icon-md me-2 text-primary`} aria-hidden="true" />
          {title}
        </h5>
      </div>
      <div className="card-body p-0">{children}</div>
    </div>
  );
}

export function BrandClient({
  initialBrand,
  liveSignatures,
  iconBaseUrl,
}: {
  initialBrand: BrandDocument | null;
  liveSignatures: number;
  iconBaseUrl: string;
}) {
  const toast = useToast();
  const lang = useLang();
  const t = brandDict[lang];
  const c = common[lang];
  const [doc, setDoc] = useState<BrandDocument>(initialBrand ?? {});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [logoBusy, setLogoBusy] = useState(false);
  const [logoMessage, setLogoMessage] = useState<string | null>(null);

  /**
   * "Not managed" → alan silinir. Diğer iki modda alan `{ value, mode }`
   * olarak yazılır; ilk kez yönetilmeye başlanan bir alan `fallback`
   * değerini alır — `reducer.ts`'in `createEmptyData()` varsayılanlarıyla
   * aynı sabitler kullanılıyor (bkz. çağıran yerler), yeni rastgele bir
   * varsayılan icat edilmedi.
   */
  function setMode<K extends FieldKey>(key: K, mode: ModeOption, fallback: FieldValue<K>) {
    setSavedAt(null); // kaydedilmiş belge artık ekrandakiyle aynı değil
    setDoc((prev) => {
      if (mode === 'unmanaged') {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      const current = prev[key];
      const value = current ? current.value : fallback;
      // Hesaplanan anahtar TypeScript'in ayırt edici birleşimi daraltmasını
      // engelliyor — `BrandDocument` sabit 8 alanlı bir arayüz, dinamik bir
      // `Record` değil; tip güvenliği `FieldValue<K>` ile girişte sağlanıyor.
      return { ...prev, [key]: { value, mode } } as BrandDocument;
    });
  }

  function setValue<K extends FieldKey>(key: K, value: FieldValue<K>) {
    setSavedAt(null); // kaydedilmiş belge artık ekrandakiyle aynı değil
    setDoc((prev) => {
      const current = prev[key];
      if (!current) return prev; // kontrol yalnız alan yönetilirken görünür
      return { ...prev, [key]: { value, mode: current.mode } } as BrandDocument;
    });
  }

  async function uploadLogo(file: File) {
    setLogoBusy(true);
    setLogoMessage(null);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('kind', 'logo');
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const body = (await res.json()) as { url?: string; error?: string; warning?: string };
      if (!res.ok || !body.url) {
        setLogoMessage(body.error ?? t.logoUploadFailed);
        return;
      }
      setValue('logoUrl', body.url);
      if (body.warning) setLogoMessage(`⚠️ ${body.warning}`);
    } catch {
      setLogoMessage(t.logoNetworkError);
    } finally {
      setLogoBusy(false);
    }
  }

  // Önizleme (spec: seedBrandDefaults YÖNETİLEN HER alanı — default + locked
  // — yeni bir imza tohumuna biner; applyBrand kilitlileri tekrar bindirir,
  // idempotent). effTemplate bindirilmiş verinin KENDİ templateId'si.
  const overlaid = useMemo(() => {
    const seeded = seedBrandDefaults(mergeWithEmpty(fixtures[0]!.data), doc);
    return applyBrand(seeded, doc);
  }, [doc]);

  const html = useMemo(
    () =>
      renderSignature(
        overlaid,
        overlaid.layout.templateId,
        iconBaseUrl ? { iconBaseUrl } : undefined,
      ),
    [overlaid, iconBaseUrl],
  );

  // Kontrast notları (review bulgusu #2): StyleStep'teki AYNI fonksiyon,
  // bindirilmiş renklere göre — org kilitlediği kötü bir renk burada da
  // uyarsın. Metinler Türkçe döner (builder ile aynı), çevrilmiyor — dil
  // göçü bu işin kapsamı dışında.
  const contrastNotes = useMemo(() => contrastWarnings(overlaid.visuals), [overlaid]);

  /**
   * Satır bazlı ipucu (review bulgusu #1, yarı 2): `parseBrandDocument` TEK
   * yetkili kaynak — Save/diyalog onun sonucuna göre kilitlenir. Buradaki
   * alan-bazlı kontroller yalnız HANGİ satırın ipucu göstereceğini bulmak
   * için; parseBrandDocument'ın reddettiği her durumu birebir kapsamaları
   * gerekmez (ör. bozuk CTA URL söz dizimi burada yakalanmaz ama yine de
   * Save pasif kalır — parseBrandDocument onu zaten reddeder).
   */
  const fieldErrors = useMemo(() => {
    const errs: Partial<Record<FieldKey, string>> = {};
    if (doc.logoUrl && !doc.logoUrl.value.trim()) {
      errs.logoUrl = t.fieldErrors.logoUrl;
    }
    if (doc.cta && (!doc.cta.value.label.trim() || !doc.cta.value.url.trim())) {
      errs.cta = t.fieldErrors.cta;
    }
    for (const key of ['brandColor', 'textColor', 'mutedColor'] as const) {
      const f = doc[key];
      if (f && !isValidBrandHex(f.value)) errs[key] = t.fieldErrors.invalidHex;
    }
    return errs;
  }, [doc, t]);

  const isValid = useMemo(() => parseBrandDocument(doc) !== null, [doc]);

  function openDialog() {
    if (!isValid) return; // yönetilen-ama-eksik alan varken diyalog açılmaz
    setError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    if (busy) return;
    setError(null);
    setDialogOpen(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: doc }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(
          body.error === 'invalid_input'
            ? t.saveDialog.errors.invalid_input
            : body.error === 'forbidden'
              ? t.saveDialog.errors.forbidden
              : t.saveDialog.errors.generic,
        );
        return;
      }
      setDialogOpen(false);
      setSavedAt(
        new Date().toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
      toast('success', t.savedToast);
    } catch {
      setError(t.saveDialog.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      {/* Üst aksiyon çubuğu — temanın product-add başlığı: solda ad, sağda kaydet */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h4 className="mb-1">{t.heading}</h4>
          <p className="text-body-secondary mb-0">{t.subtitle}</p>
        </div>
        <div className="d-flex align-items-center gap-3">
          {savedAt && !dialogOpen && (
            <span className="badge bg-label-success">{t.savedBadge(savedAt)}</span>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={openDialog}
            disabled={!isValid}
          >
            <i className="icon-base ti tabler-device-floppy me-1" aria-hidden="true" />
            {t.saveButton}
          </button>
        </div>
      </div>

      <div className="row g-4">
        {/* 6/6 bölünme (Hüseyin, 2026-08-14): önizleme büyük olsun */}
        <div className="col-xl-6">
          <GroupCard title={t.groups.design} icon="tabler-layout">
              <FieldRow
                label={t.fields.template}
                labelFor="brand-templateId"
                mode={doc.templateId?.mode ?? 'unmanaged'}
                onMode={(m) => setMode('templateId', m, TEMPLATE_IDS[0]!)}
              >
                {doc.templateId && (
                  <select
                    id="brand-templateId"
                    className="form-select w-auto"
                    value={doc.templateId.value}
                    onChange={(e) => setValue('templateId', e.target.value)}
                  >
                    {TEMPLATE_IDS.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                )}
              </FieldRow>

              <FieldRow
                label={t.fields.font}
                labelFor="brand-fontFamily"
                mode={doc.fontFamily?.mode ?? 'unmanaged'}
                onMode={(m) => setMode('fontFamily', m, WEB_SAFE_FONTS[0])}
                divider={false}
              >
                {doc.fontFamily && (
                  <select
                    id="brand-fontFamily"
                    className="form-select w-auto"
                    value={doc.fontFamily.value}
                    onChange={(e) =>
                      setValue('fontFamily', e.target.value as (typeof WEB_SAFE_FONTS)[number])
                    }
                  >
                    {WEB_SAFE_FONTS.map((f) => (
                      <option key={f} value={f}>
                        {f.split(',')[0]}
                      </option>
                    ))}
                  </select>
                )}
              </FieldRow>
          </GroupCard>

          <GroupCard title={t.groups.colors} icon="tabler-palette">
              <FieldRow
                label={t.fields.brandColor}
                labelFor="brand-brandColor"
                mode={doc.brandColor?.mode ?? 'unmanaged'}
                onMode={(m) => setMode('brandColor', m, BRAND.primary)}
              >
                {doc.brandColor && (
                  <>
                    <ColorControl
                      fieldId="brand-brandColor"
                      value={doc.brandColor.value}
                      onChange={(v) => setValue('brandColor', v)}
                    />
                    {fieldErrors.brandColor && (
                      <small className="text-danger d-block mt-1">{fieldErrors.brandColor}</small>
                    )}
                  </>
                )}
              </FieldRow>

              <FieldRow
                label={t.fields.textColor}
                labelFor="brand-textColor"
                mode={doc.textColor?.mode ?? 'unmanaged'}
                onMode={(m) => setMode('textColor', m, '#333333')}
              >
                {doc.textColor && (
                  <>
                    <ColorControl
                      fieldId="brand-textColor"
                      value={doc.textColor.value}
                      onChange={(v) => setValue('textColor', v)}
                    />
                    {fieldErrors.textColor && (
                      <small className="text-danger d-block mt-1">{fieldErrors.textColor}</small>
                    )}
                  </>
                )}
              </FieldRow>

              <FieldRow
                label={t.fields.mutedColor}
                labelFor="brand-mutedColor"
                mode={doc.mutedColor?.mode ?? 'unmanaged'}
                onMode={(m) => setMode('mutedColor', m, '#666666')}
                divider={false}
              >
                {doc.mutedColor && (
                  <>
                    <ColorControl
                      fieldId="brand-mutedColor"
                      value={doc.mutedColor.value}
                      onChange={(v) => setValue('mutedColor', v)}
                    />
                    {fieldErrors.mutedColor && (
                      <small className="text-danger d-block mt-1">{fieldErrors.mutedColor}</small>
                    )}
                  </>
                )}
              </FieldRow>
          </GroupCard>

          <GroupCard title={t.groups.content} icon="tabler-photo">
              <FieldRow
                label={t.fields.logo}
                mode={doc.logoUrl?.mode ?? 'unmanaged'}
                onMode={(m) => setMode('logoUrl', m, '')}
              >
                {doc.logoUrl && (
                  <>
                    <div className="form-text mb-2">{t.logoHint}</div>
                    {doc.logoUrl.value ? (
                      <div className="d-flex align-items-center flex-wrap gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={doc.logoUrl.value}
                          alt={t.fields.logo}
                          style={{ maxHeight: 48, maxWidth: 160 }}
                          className="border rounded p-1"
                        />
                        <code className="text-truncate" style={{ maxWidth: 260 }}>
                          {doc.logoUrl.value}
                        </code>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => {
                            setValue('logoUrl', '');
                            setLogoMessage(null);
                          }}
                        >
                          {t.remove}
                        </button>
                      </div>
                    ) : (
                      <input
                        type="file"
                        className="form-control"
                        accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                        disabled={logoBusy}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadLogo(f);
                          e.target.value = '';
                        }}
                      />
                    )}
                    {logoBusy && <small className="text-body-secondary d-block mt-1">{t.logoUploading}</small>}
                    {logoMessage && (
                      <small className="text-body-secondary d-block mt-1">{logoMessage}</small>
                    )}
                    {fieldErrors.logoUrl && (
                      <small className="text-danger d-block mt-1">{fieldErrors.logoUrl}</small>
                    )}
                  </>
                )}
              </FieldRow>

              <FieldRow
                label={t.fields.cta}
                mode={doc.cta?.mode ?? 'unmanaged'}
                onMode={(m) => setMode('cta', m, { label: '', url: '' })}
              >
                {doc.cta && (
                  <>
                    <div className="row g-2">
                      <div className="col-sm-5">
                        <input
                          className="form-control"
                          placeholder={t.ctaLabelPlaceholder}
                          aria-label={t.ctaLabelAria}
                          value={doc.cta.value.label}
                          onChange={(e) =>
                            setValue('cta', { ...doc.cta!.value, label: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-sm-7">
                        <input
                          className="form-control"
                          placeholder={t.ctaUrlPlaceholder}
                          aria-label={t.ctaUrlAria}
                          value={doc.cta.value.url}
                          onChange={(e) =>
                            setValue('cta', { ...doc.cta!.value, url: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    {fieldErrors.cta && (
                      <small className="text-danger d-block mt-1">{fieldErrors.cta}</small>
                    )}
                  </>
                )}
              </FieldRow>

              <FieldRow
                label={t.fields.disclaimer}
                labelFor="brand-disclaimer"
                mode={doc.disclaimer?.mode ?? 'unmanaged'}
                onMode={(m) => setMode('disclaimer', m, '')}
                divider={false}
              >
                {doc.disclaimer && (
                  <textarea
                    id="brand-disclaimer"
                    className="form-control"
                    rows={3}
                    value={doc.disclaimer.value}
                    onChange={(e) => setValue('disclaimer', e.target.value)}
                  />
                )}
              </FieldRow>
          </GroupCard>
        </div>

        <div className="col-xl-6">
          {/* Önizleme yapışkan: uzun formda kaydırınca da gözün önünde */}
          <div style={{ position: 'sticky', top: 90 }}>
            <div className="card mb-4">
              <div className="card-header pb-2">
                <h5 className="card-title mb-1">{t.preview.title}</h5>
                <p className="card-subtitle mb-0">{t.preview.subtitle}</p>
              </div>
              <div className="card-body">
                {contrastNotes.length > 0 && (
                  <div role="alert" className="alert alert-warning py-2">
                    {contrastNotes.map((w) => (
                      <div key={w} className="small">
                        ⚠️ {w}
                      </div>
                    ))}
                  </div>
                )}
                <Preview html={html} textColor={overlaid.visuals.textColor} chrome="theme" />
              </div>
            </div>

            <div className="card">
              <div className="card-header pb-2">
                <h5 className="card-title mb-0">{t.howModes.title}</h5>
              </div>
              <div className="card-body d-grid gap-3">
                <div className="d-flex align-items-start gap-2">
                  <span className="badge bg-label-secondary flex-shrink-0">
                    {t.modeLabel.unmanaged}
                  </span>
                  <small className="text-body-secondary">{t.howModes.unmanagedNote}</small>
                </div>
                <div className="d-flex align-items-start gap-2">
                  <span className="badge bg-label-info flex-shrink-0">{t.modeLabel.default}</span>
                  <small className="text-body-secondary">{t.howModes.defaultNote}</small>
                </div>
                <div className="d-flex align-items-start gap-2">
                  <span className="badge bg-label-success flex-shrink-0">
                    {t.modeLabel.locked}
                  </span>
                  <small className="text-body-secondary">{t.howModes.lockedNote}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {dialogOpen && (
        <ConfirmDialog
          title={t.saveDialog.title}
          onCancel={closeDialog}
          onConfirm={save}
          confirmLabel={busy ? t.saveDialog.saving : c.save}
          cancelLabel={c.cancel}
          busy={busy}
        >
          <p>{t.saveDialog.affects(liveSignatures)}</p>
          <p>{t.saveDialog.appliesFrom}</p>
          {error && (
            <p className="text-danger mb-0" role="alert">
              {error}
            </p>
          )}
        </ConfirmDialog>
      )}
    </section>
  );
}
