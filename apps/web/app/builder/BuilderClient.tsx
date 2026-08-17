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

const STEPS = [
  { id: 'info', title: 'Details', icon: 'tabler-user' },
  { id: 'visuals', title: 'Images', icon: 'tabler-photo' },
  { id: 'social', title: 'Social', icon: 'tabler-share' },
  { id: 'style', title: 'Style', icon: 'tabler-palette' },
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
  // Kayıtlı veri (reducer state, autosave gövdesi) HİÇ değişmez — kilit
  // kalkınca kişinin girdiği ham değer geri görünür. `applied` iki yerde
  // kullanılır: (1) önizleme/export çıktısı, (2) kilitli kontrollerin
  // GÖSTERDİĞİ değer — aksi halde disabled bir renk/CTA/logo alanı, marka
  // değiştikten sonra ekranda hâlâ eski kişisel değeri gösterip önizlemeyle
  // çelişir. Adımlar yalnız `locked.has(alan) ? applied... : data...` sorar.
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
    if (!window.confirm('This clears the saved draft and resets the form. Continue?')) return;
    clearDraft(window.localStorage);
    dispatch({ type: 'reset' });
  }

  const editPane = (
    <div className="card">
      {/* Adım seçici — temanın nav-pills'i (Brand ekranındaki segmented
          kontrolün kardeşi); eski elle boyanmış sekmeler gitti. */}
      <div className="card-header pb-0">
        <ul className="nav nav-pills flex-wrap gap-1 mb-3" role="tablist">
          {STEPS.map((s) => (
            <li className="nav-item" key={s.id}>
              <button
                type="button"
                className={`nav-link${step === s.id ? ' active' : ''}`}
                aria-current={step === s.id ? 'page' : undefined}
                onClick={() => setStep(s.id)}
              >
                <i className={`icon-base ti ${s.icon} icon-18px me-2`} aria-hidden="true" />
                {s.title}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card-body">
        {step === 'info' && (
          <InfoStep data={data} applied={applied} dispatch={dispatch} locked={locked} />
        )}
        {step === 'visuals' && (
          <VisualsStep data={data} applied={applied} dispatch={dispatch} locked={locked} />
        )}
        {step === 'social' && <SocialStep data={data} dispatch={dispatch} />}
        {step === 'style' && (
          <StyleStep
            data={data}
            applied={applied}
            dispatch={dispatch}
            iconLowContrast={iconLowContrast}
            locked={locked}
          />
        )}
      </div>

      <div className="card-footer d-flex flex-wrap align-items-center justify-content-between gap-2">
        <button type="button" className="btn btn-label-secondary btn-sm" onClick={resetAll}>
          <i className="icon-base ti tabler-refresh me-1" aria-hidden="true" />
          Clear and start over
        </button>
        {/* Kayıt durumu: kayıtlı imzada gerçek zaman damgası, anonim
            taslakta yalnız "kaydedildi" — eski davranış AYNEN. */}
        <span
          className={`badge ${saveFailed ? 'bg-label-danger' : 'bg-label-success'}`}
          style={{
            opacity: signatureId ? (savedAt || saveFailed ? 1 : 0) : savedVisible ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        >
          {signatureId
            ? saveFailed
              ? 'Could not save — check your connection'
              : `Saved · ${savedAt ?? ''}`
            : 'Draft saved'}
        </span>
      </div>
    </div>
  );

  const previewPane = (
    <div className="card" style={{ position: 'sticky', top: '1.5rem' }}>
      <div className="card-header pb-2">
        <div className="card-title mb-0">
          <h5 className="mb-1">Live preview</h5>
          <p className="card-subtitle mb-0">Exactly what recipients get.</p>
        </div>
      </div>
      <div className="card-body">
        <Preview html={html} textColor={applied.visuals.textColor} chrome="theme" />
      </div>
      <div className="card-footer">
        <ExportButtons
          html={html}
          filename="mailmyra-signature"
          gated={gated}
          disabled={exportDisabled}
          chrome="theme"
          disabledNote={
            exportDisabled
              ? iconsFailed
                ? 'Could not build the icons — try again'
                : 'Preparing icons…'
              : undefined
          }
        />
        {iconsNeeded && iconsFailed && exportDisabled && (
          <button
            type="button"
            className="btn btn-label-warning btn-sm w-100 mt-2"
            onClick={() => setRetryTick((n) => n + 1)}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h4 className="mb-1">Signature builder</h4>
          <p className="text-body-secondary mb-0">
            Fill in the details on the left — the preview updates as you type.
          </p>
        </div>
        <a href="/app/signatures" className="btn btn-label-secondary">
          <i className="icon-base ti tabler-arrow-left me-1" aria-hidden="true" />
          Back to panel
        </a>
      </div>

      {/* Mobilde iki panel yan yana sığmaz: eski düzenle/önizle geçişi
          korundu, yalnız tema diline çevrildi (lg altında görünür). */}
      <ul className="nav nav-pills mb-4 d-lg-none" role="tablist">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link${mobilePane === 'edit' ? ' active' : ''}`}
            onClick={() => setMobilePane('edit')}
          >
            Edit
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link${mobilePane === 'preview' ? ' active' : ''}`}
            onClick={() => setMobilePane('preview')}
          >
            Preview
          </button>
        </li>
      </ul>

      <div className="row g-4">
        <div className={`col-lg-7 col-xl-8${mobilePane === 'preview' ? ' d-none d-lg-block' : ''}`}>
          {editPane}
        </div>
        <div className={`col-lg-5 col-xl-4${mobilePane === 'edit' ? ' d-none d-lg-block' : ''}`}>
          {previewPane}
        </div>
      </div>
    </div>
  );
}
