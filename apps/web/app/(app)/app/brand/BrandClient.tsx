'use client';

import { useMemo, useState } from 'react';
import { BRAND, TEMPLATE_IDS, fixtures, renderSignature } from '@mailmyra/renderer';

import { WEB_SAFE_FONTS, type BrandDocument, type BrandField, type BrandMode } from '../../../../lib/brand-doc';
import { applyBrand, seedBrandDefaults } from '../../../../lib/brand-apply';
import { mergeWithEmpty } from '../../../builder/reducer';
import { Preview } from '../../../builder/Preview';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import styles from './brand.module.css';

/**
 * Marka ekranı (Task 7). Sol sütun 8 alan satırı — her satırın kendi mod
 * seçicisi var: "Not managed" (alan `doc`'tan SİLİNİR) / "Default" /
 * "Locked" (spec §3/§4). Sağ sütun `fixtures[0]`'ın (renderer'ın kendi örnek
 * verisi) bindirilmiş hâlinin canlı önizlemesi.
 *
 * Renk alanları StyleStep'in `ColorField`'ı AYNEN, logo yükleme
 * VisualsStep'in `/api/upload` akışı AYNEN, onay diyaloğu paylaşılan
 * `ConfirmDialog` (Task 6) — üçü de buraya kopyalandı, yeni bir desen icat
 * edilmedi. "Not managed / Default / Locked" mod seçici ise bu ekrana özel:
 * builder'da eşdeğeri yok çünkü kilit kavramı yalnız marka belgesinde var.
 */

type FieldKey = keyof BrandDocument;
type ModeOption = 'unmanaged' | BrandMode;
type FieldValue<K extends FieldKey> = BrandDocument[K] extends BrandField<infer V> | undefined ? V : never;

const MODE_LABEL: Record<ModeOption, string> = {
  unmanaged: 'Not managed',
  default: 'Default',
  locked: 'Locked',
};

function ModeSelect({
  fieldId,
  label,
  value,
  onChange,
}: {
  fieldId: string;
  label: string;
  value: ModeOption;
  onChange: (mode: ModeOption) => void;
}) {
  return (
    <select
      id={`${fieldId}-mode`}
      className={styles.modeSelect}
      value={value}
      // InviteForm'daki `aria-label="Role"` deseni — bu seçicinin görünür
      // bir <label> eşleniği yok (satır başlığı ayrı bir alanı işaret ediyor).
      aria-label={`${label} management mode`}
      onChange={(e) => onChange(e.target.value as ModeOption)}
    >
      {(Object.keys(MODE_LABEL) as ModeOption[]).map((m) => (
        <option key={m} value={m}>
          {MODE_LABEL[m]}
        </option>
      ))}
    </select>
  );
}

/** StyleStep'teki `ColorField` ile aynı: input[type=color] + hex kodu. */
function ColorControl({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <span className={styles.colorInline}>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <code className={styles.hex}>{value}</code>
    </span>
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
        setLogoMessage(body.error ?? 'Upload failed.');
        return;
      }
      setValue('logoUrl', body.url);
      if (body.warning) setLogoMessage(`⚠️ ${body.warning}`);
    } catch {
      setLogoMessage('Network error — try again.');
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

  function openDialog() {
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
            ? 'Some fields have an invalid value — check colors, links, and the CTA URL.'
            : body.error === 'forbidden'
              ? 'Only owners and admins can manage brand settings.'
              : 'Something went wrong. Please try again.',
        );
        return;
      }
      setDialogOpen(false);
      setSavedAt(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <header className={styles.head}>
        <h1 className={styles.title}>Brand</h1>
        <p className={styles.subtitle}>
          Set defaults new signatures start with, or lock a field so every sender in this
          workspace uses the same value.
        </p>
      </header>

      <div className={styles.layout}>
        <div>
          <div className={styles.fieldRow}>
            <div className={styles.fieldHead}>
              <label htmlFor="brand-templateId" className={styles.fieldLabel}>
                Template
              </label>
              <ModeSelect
                fieldId="brand-templateId"
                label="Template"
                value={doc.templateId?.mode ?? 'unmanaged'}
                onChange={(m) => setMode('templateId', m, TEMPLATE_IDS[0]!)}
              />
            </div>
            {doc.templateId && (
              <div className={styles.fieldControl}>
                <select
                  id="brand-templateId"
                  className={styles.textInput}
                  value={doc.templateId.value}
                  onChange={(e) => setValue('templateId', e.target.value)}
                >
                  {TEMPLATE_IDS.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldHead}>
              <label htmlFor="brand-brandColor" className={styles.fieldLabel}>
                Brand color
              </label>
              <ModeSelect
                fieldId="brand-brandColor"
                label="Brand color"
                value={doc.brandColor?.mode ?? 'unmanaged'}
                onChange={(m) => setMode('brandColor', m, BRAND.primary)}
              />
            </div>
            {doc.brandColor && (
              <div className={styles.fieldControl}>
                <ColorControl value={doc.brandColor.value} onChange={(v) => setValue('brandColor', v)} />
              </div>
            )}
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldHead}>
              <label htmlFor="brand-textColor" className={styles.fieldLabel}>
                Text color
              </label>
              <ModeSelect
                fieldId="brand-textColor"
                label="Text color"
                value={doc.textColor?.mode ?? 'unmanaged'}
                onChange={(m) => setMode('textColor', m, '#333333')}
              />
            </div>
            {doc.textColor && (
              <div className={styles.fieldControl}>
                <ColorControl value={doc.textColor.value} onChange={(v) => setValue('textColor', v)} />
              </div>
            )}
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldHead}>
              <label htmlFor="brand-mutedColor" className={styles.fieldLabel}>
                Secondary text color
              </label>
              <ModeSelect
                fieldId="brand-mutedColor"
                label="Secondary text color"
                value={doc.mutedColor?.mode ?? 'unmanaged'}
                onChange={(m) => setMode('mutedColor', m, '#666666')}
              />
            </div>
            {doc.mutedColor && (
              <div className={styles.fieldControl}>
                <ColorControl value={doc.mutedColor.value} onChange={(v) => setValue('mutedColor', v)} />
              </div>
            )}
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldHead}>
              <label htmlFor="brand-fontFamily" className={styles.fieldLabel}>
                Font
              </label>
              <ModeSelect
                fieldId="brand-fontFamily"
                label="Font"
                value={doc.fontFamily?.mode ?? 'unmanaged'}
                onChange={(m) => setMode('fontFamily', m, WEB_SAFE_FONTS[0])}
              />
            </div>
            {doc.fontFamily && (
              <div className={styles.fieldControl}>
                <select
                  id="brand-fontFamily"
                  className={styles.textInput}
                  value={doc.fontFamily.value}
                  onChange={(e) => setValue('fontFamily', e.target.value as (typeof WEB_SAFE_FONTS)[number])}
                >
                  {WEB_SAFE_FONTS.map((f) => (
                    <option key={f} value={f}>
                      {f.split(',')[0]}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldHead}>
              <span className={styles.fieldLabel}>Logo</span>
              <ModeSelect
                fieldId="brand-logoUrl"
                label="Logo"
                value={doc.logoUrl?.mode ?? 'unmanaged'}
                onChange={(m) => setMode('logoUrl', m, '')}
              />
            </div>
            {doc.logoUrl && (
              <div className={styles.fieldControl}>
                <span className={styles.fieldHint}>PNG, JPG or SVG · max 5MB · 360px/&lt;60KB target</span>
                {doc.logoUrl.value ? (
                  <div className={styles.uploadRow}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={doc.logoUrl.value} alt="Logo" className={styles.uploadPreview} />
                    <code className={styles.uploadUrl}>{doc.logoUrl.value}</code>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => {
                        setValue('logoUrl', '');
                        setLogoMessage(null);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                    disabled={logoBusy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadLogo(f);
                      e.target.value = '';
                    }}
                  />
                )}
                {logoBusy && <p className={styles.fieldMessage}>Uploading…</p>}
                {logoMessage && <p className={styles.fieldMessage}>{logoMessage}</p>}
              </div>
            )}
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldHead}>
              <span className={styles.fieldLabel}>Call to action</span>
              <ModeSelect
                fieldId="brand-cta"
                label="Call to action"
                value={doc.cta?.mode ?? 'unmanaged'}
                onChange={(m) => setMode('cta', m, { label: '', url: '' })}
              />
            </div>
            {doc.cta && (
              <div className={styles.fieldControl}>
                <div className={styles.ctaInputs}>
                  <input
                    className={styles.textInput}
                    placeholder="Label"
                    value={doc.cta.value.label}
                    onChange={(e) => setValue('cta', { ...doc.cta!.value, label: e.target.value })}
                  />
                  <input
                    className={styles.textInput}
                    placeholder="https://…"
                    value={doc.cta.value.url}
                    onChange={(e) => setValue('cta', { ...doc.cta!.value, url: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldHead}>
              <label htmlFor="brand-disclaimer" className={styles.fieldLabel}>
                Legal disclaimer
              </label>
              <ModeSelect
                fieldId="brand-disclaimer"
                label="Legal disclaimer"
                value={doc.disclaimer?.mode ?? 'unmanaged'}
                onChange={(m) => setMode('disclaimer', m, '')}
              />
            </div>
            {doc.disclaimer && (
              <div className={styles.fieldControl}>
                <textarea
                  id="brand-disclaimer"
                  className={`${styles.textInput} ${styles.textarea}`}
                  value={doc.disclaimer.value}
                  onChange={(e) => setValue('disclaimer', e.target.value)}
                />
              </div>
            )}
          </div>

          <div className={styles.saveBar}>
            <button type="button" className={styles.primary} onClick={openDialog}>
              Save brand settings
            </button>
            {savedAt && !dialogOpen && <span className={styles.savedNote}>Saved · {savedAt}</span>}
          </div>
        </div>

        <div className={styles.previewCol}>
          <Preview html={html} textColor={overlaid.visuals.textColor} />
        </div>
      </div>

      {dialogOpen && (
        <ConfirmDialog
          title="Save brand settings"
          onCancel={closeDialog}
          onConfirm={save}
          confirmLabel={busy ? 'Saving…' : 'Save'}
          busy={busy}
        >
          <p>
            {`This will affect ${liveSignatures} live signature${liveSignatures === 1 ? '' : 's'}.`}
          </p>
          <p>Changes apply from the next export — e-mails already sent do not change.</p>
          {error && <p className={styles.dialogError}>{error}</p>}
        </ConfirmDialog>
      )}
    </section>
  );
}
