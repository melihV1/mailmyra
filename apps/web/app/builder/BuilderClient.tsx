'use client';

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { renderSignature, contrastRatio } from '@mailmyra/renderer';
import { builderReducer, createEmptyData, mergeWithEmpty } from './reducer';
import { saveDraft, loadDraft, clearDraft } from '../../lib/draft';
import { applyBrand, lockedBrandFields } from '../../lib/brand-apply';
import type { BrandDocument } from '../../lib/brand-doc';
import { needsGeneratedIcons } from '../../lib/icon-readiness';
import { builder as builderDict } from '../../lib/i18n/dict/builder';
import { useLang } from '../../lib/i18n/LangProvider';
import { InfoStep } from './steps/InfoStep';
import { VisualsStep } from './steps/VisualsStep';
import { SocialStep } from './steps/SocialStep';
import { StyleStep } from './steps/StyleStep';
import { Preview } from './Preview';
import { ExportButtons } from '../../components/ExportButtons';
import { SaveDialog } from './SaveDialog';
import { LangToggle } from './LangToggle';
import './builder-theme.css';

const STEPS = [
  { id: 'info', icon: 'tabler-user' },
  { id: 'visuals', icon: 'tabler-photo' },
  { id: 'social', icon: 'tabler-share' },
  { id: 'style', icon: 'tabler-palette' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

export function BuilderClient({
  gated,
  iconBaseUrl,
  signedIn = false,
  signatureId,
  initialData,
  initialName,
  brand = null,
}: {
  gated: false | 'login' | 'verify';
  iconBaseUrl: string;
  /** Oturum var mı — "Save to my signatures" düğmesinin hedefini belirler. */
  signedIn?: boolean;
  /** Doluysa builder kayıtlı bir imzayı düzenliyor: kaynak sunucu, taslak değil. */
  signatureId?: string;
  initialData?: unknown;
  initialName?: string;
  /** Yalnız düzenleme kipinde (?sig=) dolu — anonim builder'da hep null. */
  brand?: BrandDocument | null;
}) {
  const lang = useLang();
  const t = builderDict[lang];
  const [data, dispatch] = useReducer(builderReducer, undefined, createEmptyData);
  // Kayıtlı veri (reducer state, autosave gövdesi) HİÇ değişmez — kilit
  // kalkınca kişinin girdiği ham değer geri görünür. `applied` iki yerde
  // kullanılır: (1) önizleme/export çıktısı, (2) kilitli kontrollerin
  // GÖSTERDİĞİ değer — aksi halde disabled bir renk/CTA/logo alanı, marka
  // değiştikten sonra ekranda hâlâ eski kişisel değeri gösterip önizlemeyle
  // çelişir. Adımlar yalnız `locked.has(alan) ? applied... : data...` sorar.
  const locked = useMemo(() => lockedBrandFields(brand), [brand]);
  const applied = useMemo(() => applyBrand(data, brand), [data, brand]);
  const router = useRouter();
  /* Kaydedilmiş imzanın kimliği. Prop'tan başlar; anonim oturumda
     "Save" başarılı olunca DOLAR ve o andan itibaren otomatik kayıt
     devreye girer — kullanıcı ikinci kez kaydete basmak zorunda kalmaz. */
  const [savedId, setSavedId] = useState<string | undefined>(signatureId);
  const [savedName, setSavedName] = useState<string | undefined>(initialName);
  const [saveOpen, setSaveOpen] = useState(false);
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
      if (savedId) {
        // Otomatik kayıt sunucuya. Hata düzenlemeyi KİLİTLEMEZ (panel-brief
        // §2.5): şerit çıkar, veri elde durur, sonraki değişiklik yeniden dener.
        void fetch('/api/signatures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: savedId, name: savedName ?? '', data }),
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
    // `savedId`/`savedName` bilerek bağımlılıkta: kayıt sonrası ilk
    // değişiklikte taslak yerine sunucuya yazılsın.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, savedId, savedName]);

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
    const iconTimer = setTimeout(async () => {
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
    return () => clearTimeout(iconTimer);
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
    if (!window.confirm(t.client.editPane.resetConfirm)) return;
    clearDraft(window.localStorage);
    dispatch({ type: 'reset' });
  }

  const saveAction = () => {
    // Oturumsuzken kaydedilecek yer yok: taslak localStorage'da duruyor,
    // kullanıcıyı girişe gönderiyoruz ve dönüşte builder'a düşüyor.
    if (!signedIn) {
      router.push('/login?next=/builder');
      return;
    }
    setSaveOpen(true);
  };

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
                {t.client.steps[s.id]}
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
          {t.client.editPane.clearButton}
        </button>
        {/* Kayıt durumu: kayıtlı imzada gerçek zaman damgası, anonim
            taslakta yalnız "kaydedildi" — eski davranış AYNEN. */}
        <span
          className={`badge ${saveFailed ? 'bg-label-danger' : 'bg-label-success'}`}
          style={{
            opacity: savedId ? (savedAt || saveFailed ? 1 : 0) : savedVisible ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        >
          {savedId
            ? saveFailed
              ? t.client.editPane.saveFailedStatus
              : t.client.editPane.savedStatus(savedAt ?? '')
            : t.client.editPane.draftSavedLocally}
        </span>
      </div>
    </div>
  );

  const previewPane = (
    <div className="card mm-preview-card">
      <div className="card-header pb-2">
        <div className="card-title mb-0">
          <h5 className="mb-1">{t.client.previewPane.heading}</h5>
          <p className="card-subtitle mb-0">{t.client.previewPane.subtitle}</p>
        </div>
      </div>
      <div className="card-body">
        {/* Boş formda iframe bomboş bir kutu olarak duruyordu — "bozuk mu?"
            sorusunu doğuruyor. Ad girilene kadar ne olacağını anlatan bir
            durum gösteriyoruz (ad zaten zorunlu alan). */}
        {applied.identity.fullName.trim() ? (
          <Preview html={html} textColor={applied.visuals.textColor} chrome="theme" />
        ) : (
          <div className="text-center py-5">
            <div className="avatar avatar-lg mx-auto mb-3">
              <span className="avatar-initial rounded-circle bg-label-primary">
                <i className="icon-base ti tabler-signature icon-26px" aria-hidden="true" />
              </span>
            </div>
            <h6 className="mb-1">{t.client.previewPane.emptyTitle}</h6>
            <p className="text-body-secondary mb-0 small">{t.client.previewPane.emptyBody}</p>
          </div>
        )}
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
                ? t.client.previewPane.iconsBuildFailed
                : t.client.previewPane.preparingIcons
              : undefined
          }
        />
        {iconsNeeded && iconsFailed && exportDisabled && (
          <button
            type="button"
            className="btn btn-label-warning btn-sm w-100 mt-2"
            onClick={() => setRetryTick((n) => n + 1)}
          >
            {t.client.previewPane.tryAgain}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="container-fluid flex-grow-1 container-p-y mm-builder">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h4 className="mb-1">{t.client.header.heading}</h4>
          <p className="text-body-secondary mb-0">{t.client.header.subtitle}</p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <LangToggle />
          {savedId ? (
            /* Kayıtlı imza: otomatik kayıt zaten çalışıyor, düğme yerine
               nereye kaydedildiğini söyleyen bir bağlantı. */
            <a href="/app/signatures" className="btn btn-label-success">
              <i className="icon-base ti tabler-check me-1" aria-hidden="true" />
              {t.client.header.savedLink}
            </a>
          ) : (
            <button type="button" className="btn btn-primary" onClick={saveAction}>
              <i className="icon-base ti tabler-device-floppy me-1" aria-hidden="true" />
              {signedIn ? t.client.header.saveButton : t.client.header.signInToSave}
            </button>
          )}
          <a href="/app/signatures" className="btn btn-label-secondary">
            <i className="icon-base ti tabler-arrow-left me-1" aria-hidden="true" />
            {t.client.header.backToPanel}
          </a>
        </div>
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
            {t.client.mobileTabs.edit}
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link${mobilePane === 'preview' ? ' active' : ''}`}
            onClick={() => setMobilePane('preview')}
          >
            {t.client.mobileTabs.preview}
          </button>
        </li>
      </ul>

      <div className="row g-4">
        <div className={`col-lg-6${mobilePane === 'preview' ? ' d-none d-lg-block' : ''}`}>
          {editPane}
        </div>
        <div className={`col-lg-6${mobilePane === 'edit' ? ' d-none d-lg-block' : ''}`}>
          {previewPane}
        </div>
      </div>

      {saveOpen && (
        <SaveDialog
          data={data}
          onCancel={() => setSaveOpen(false)}
          onSaved={(id, name) => {
            setSaveOpen(false);
            setSavedId(id);
            setSavedName(name);
            setSavedAt(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
            // Sayfa yenilenirse kayıtlı imza yüklensin; taslak da temizlenir
            // ki aynı içerik iki yerde iki ayrı gerçek olarak yaşamasın.
            clearDraft(window.localStorage);
            router.replace(`/builder?sig=${id}`);
          }}
        />
      )}
    </div>
  );
}
