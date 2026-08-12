'use client';

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { renderSignature, contrastRatio } from '@mailmyra/renderer';
import { builderReducer, createEmptyData, mergeWithEmpty } from './reducer';
import { saveDraft, loadDraft, clearDraft } from '../../lib/draft';
import { applyBrand, lockedBrandFields } from '../../lib/brand-apply';
import type { BrandDocument } from '../../lib/brand-doc';
import { needsGeneratedIcons } from '../../lib/icon-readiness';
import { InfoStep } from './steps/InfoStep';
import { VisualsStep } from './steps/VisualsStep';
import { SocialStep } from './steps/SocialStep';
import { StyleStep } from './steps/StyleStep';
import { Preview } from './Preview';
import { ExportButtons } from '../../components/ExportButtons';
import styles from './builder.module.css';

const STEPS = [
  { id: 'info', title: 'Bilgiler' },
  { id: 'visuals', title: 'Görseller' },
  { id: 'social', title: 'Sosyal' },
  { id: 'style', title: 'Stil' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

export function BuilderClient({
  gated,
  iconBaseUrl,
  signatureId,
  initialData,
  initialName,
  brand = null,
}: {
  gated: false | 'login' | 'verify';
  iconBaseUrl: string;
  /** Doluysa builder kayıtlı bir imzayı düzenliyor: kaynak sunucu, taslak değil. */
  signatureId?: string;
  initialData?: unknown;
  initialName?: string;
  /** Yalnız düzenleme kipinde (?sig=) dolu — anonim builder'da hep null. */
  brand?: BrandDocument | null;
}) {
  const [data, dispatch] = useReducer(builderReducer, undefined, createEmptyData);
  // Kayıtlı veri HİÇ değişmez — bindirme yalnız önizleme/export çıktısına
  // işler. Kilit kalkınca kişinin girdiği ham değer geri görünür.
  const locked = useMemo(() => lockedBrandFields(brand), [brand]);
  const applied = useMemo(() => applyBrand(data, brand), [data, brand]);
  const [step, setStep] = useState<StepId>('info');
  const [mobilePane, setMobilePane] = useState<'edit' | 'preview'>('edit');
  const [savedVisible, setSavedVisible] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const loadedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Açılışta taslağı yükle (30 gün TTL draft.ts içinde). `loadDraft` şekil
  // doğrulaması yapsa da (bkz. draft.ts) eksik bir alt-alan render sırasında
  // çökmeye yol açabilir — `mergeWithEmpty` taslağı `createEmptyData()`
  // varsayılanlarıyla tamamlayarak bu çökme dikişini kapatır.
  useEffect(() => {
    if (signatureId) {
      // Düzenleme kipi: kaynak sunucudaki kayıt. localStorage taslağına
      // DOKUNULMAZ — o, oturumsuz ziyaretçinin emeği.
      if (initialData) dispatch({ type: 'load', value: mergeWithEmpty(initialData) });
      loadedRef.current = true;
      return;
    }
    const draft = loadDraft(window.localStorage, Date.now());
    if (draft) dispatch({ type: 'load', value: mergeWithEmpty(draft) });
    loadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce'lu taslak kaydı + "Taslak kaydedildi" göstergesi.
  useEffect(() => {
    if (!loadedRef.current) return;
    if (JSON.stringify(data) === JSON.stringify(createEmptyData())) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (signatureId) {
        // Otomatik kayıt sunucuya. Hata düzenlemeyi KİLİTLEMEZ (panel-brief
        // §2.5): şerit çıkar, veri elde durur, sonraki değişiklik yeniden dener.
        void fetch('/api/signatures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: signatureId, name: initialName ?? '', data }),
        }).then(
          (res) => {
            setSaveFailed(!res.ok);
            if (res.ok) {
              setSavedAt(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
            }
          },
          () => setSaveFailed(true),
        );
        return;
      }
      saveDraft(window.localStorage, data, Date.now());
      setSavedVisible(true);
      setTimeout(() => setSavedVisible(false), 2000);
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data]);

  // Bindirilmiş verinin şablonu kullanılır: templateId kilitliyse önizleme/
  // export de markanın şablonunu gösterir, kişinin ham seçimini değil.
  const html = useMemo(
    () =>
      renderSignature(
        applied,
        applied.layout.templateId,
        iconBaseUrl ? { iconBaseUrl } : undefined,
      ),
    [applied, iconBaseUrl],
  );

  // İkon hazırlığı (spec §3d): outline/mono + sosyal varken iconColor/iconStyle
  // değişimlerinde 500ms debounce ile /api/icons çağrılır.
  // EXPORT KİLİDİ SENKRON TÜRETİLİR: `readyColor` yalnız sunucunun "yazıldı"
  // dediği rengi tutar ve kilit `readyColor !== iconColor` karşılaştırmasıyla
  // AYNI render içinde hesaplanır — effect'in bir sonraki kareyi beklemesi
  // butonları tek bir commit için bile açık bırakamaz. (Pazarlıksız kural:
  // kopyalanan HTML'de asla henüz-yazılmamış ikon URL'i olamaz.)
  const iconsNeeded = Boolean(iconBaseUrl) && needsGeneratedIcons(data);
  const [readyColor, setReadyColor] = useState<string | null>(null);
  const [iconsFailed, setIconsFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const iconsSeq = useRef(0);

  useEffect(() => {
    if (!iconsNeeded) {
      iconsSeq.current += 1; // uçuştaki cevap dönerse yok sayılsın
      setIconsFailed(false);
      return;
    }
    if (data.visuals.iconColor === readyColor) {
      // Zaten onaylanmış renge dönüş — sunucu yalnız dedup yapar, gereksiz
      // POST atma; olası eski bir hata durumunu da temizle.
      setIconsFailed(false);
      return;
    }
    const color = data.visuals.iconColor;
    const seq = ++iconsSeq.current;
    setIconsFailed(false);
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/icons', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ color }),
        });
        const body = (await res.json()) as { ready?: boolean; lowContrast?: boolean };
        if (seq !== iconsSeq.current) return; // eski cevap — daha yenisi yolda
        if (res.ok && body.ready) {
          setReadyColor(color);
        } else {
          setIconsFailed(true);
        }
      } catch {
        if (seq === iconsSeq.current) setIconsFailed(true);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [iconsNeeded, data.visuals.iconColor, retryTick, readyColor]);

  const exportDisabled = iconsNeeded && readyColor !== data.visuals.iconColor;

  // Eşik burada yerelde tanımlıdır çünkü bu bir 'use client' bileşenidir;
  // gerçek kaynak `apps/web/lib/icons.ts` içindeki LOW_CONTRAST_ON_WHITE'dır
  // (o dosya `sharp`/`node:fs` içe aktardığı için tarayıcı paketine
  // katılamaz). İkisi manuel senkron tutulmalı.
  const ICON_LOW_CONTRAST_ON_WHITE = 3;

  // Düşük kontrast BİLGİ notu: iconColor'ın saf bir fonksiyonu, bu yüzden
  // render'da türetilir. Effect state'i olarak tutulursa stil değişimlerinde
  // bayatlıyordu: mono -> filled -> mono turunda not kalıcı olarak kayboluyor,
  // kullanıcı hiçbir uyarı görmeden soluk ikonlarla devam ediyordu. Uyarı,
  // degrade'i kaldırmanın TEK telafi mekanizması olduğu için bu kabul edilemez.
  const iconLowContrast =
    iconsNeeded && contrastRatio(data.visuals.iconColor, '#ffffff') < ICON_LOW_CONTRAST_ON_WHITE;

  function resetAll() {
    if (!window.confirm('Taslak silinecek ve form sıfırlanacak. Emin misin?')) return;
    clearDraft(window.localStorage);
    dispatch({ type: 'reset' });
  }

  const editPane = (
    <div>
      <nav className={styles.stepTabs}>
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`${styles.stepTab} ${step === s.id ? styles.stepTabActive : ''}`}
            onClick={() => setStep(s.id)}
          >
            {s.title}
          </button>
        ))}
      </nav>
      {step === 'info' && <InfoStep data={data} dispatch={dispatch} locked={locked} />}
      {step === 'visuals' && <VisualsStep data={data} dispatch={dispatch} locked={locked} />}
      {step === 'social' && <SocialStep data={data} dispatch={dispatch} />}
      {step === 'style' && (
        <StyleStep data={data} dispatch={dispatch} iconLowContrast={iconLowContrast} locked={locked} />
      )}
      <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button type="button" onClick={resetAll}>
          Temizle / sıfırdan başla
        </button>
        <span
          style={{
            fontSize: 13,
            color: '#2e7d32',
            opacity: signatureId ? (savedAt || saveFailed ? 1 : 0) : savedVisible ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        >
          {signatureId
            ? saveFailed
              ? 'Could not save — check your connection. Your edits are still here.'
              : `Saved · ${savedAt ?? ''}`
            : 'Taslak kaydedildi ✓'}
        </span>
      </div>
    </div>
  );

  const previewPane = (
    <div className={styles.previewPane}>
      <Preview html={html} textColor={applied.visuals.textColor} />
      <ExportButtons
        html={html}
        filename="mailmyra-imza"
        gated={gated}
        disabled={exportDisabled}
        disabledNote={
          exportDisabled
            ? iconsFailed
              ? 'İkonlar üretilemedi — tekrar deneyin'
              : 'İkonlar hazırlanıyor…'
            : undefined
        }
      />
      {iconsNeeded && iconsFailed && exportDisabled && (
        <button type="button" onClick={() => setRetryTick((n) => n + 1)}>
          Yeniden dene
        </button>
      )}
    </div>
  );

  return (
    <main className={styles.shell}>
      <h1 style={{ fontSize: 22 }}>İmza Oluşturucu</h1>

      <div className={styles.mobileTabs}>
        <button type="button" disabled={mobilePane === 'edit'} onClick={() => setMobilePane('edit')}>
          Düzenle
        </button>
        <button
          type="button"
          disabled={mobilePane === 'preview'}
          onClick={() => setMobilePane('preview')}
        >
          Önizle
        </button>
      </div>

      <div className={styles.columns}>
        <div className={mobilePane === 'preview' ? styles.mobileHidden : ''}>{editPane}</div>
        <div className={mobilePane === 'edit' ? styles.mobileHidden : ''}>{previewPane}</div>
      </div>
    </main>
  );
}
