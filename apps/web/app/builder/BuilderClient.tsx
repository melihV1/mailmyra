'use client';

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { renderSignature } from '@mailmyra/renderer';
import { builderReducer, createEmptyData, mergeWithEmpty } from './reducer';
import { saveDraft, loadDraft, clearDraft } from '../../lib/draft';
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

export function BuilderClient({ gated, iconBaseUrl }: { gated: boolean; iconBaseUrl: string }) {
  const [data, dispatch] = useReducer(builderReducer, undefined, createEmptyData);
  const [step, setStep] = useState<StepId>('info');
  const [mobilePane, setMobilePane] = useState<'edit' | 'preview'>('edit');
  const [savedVisible, setSavedVisible] = useState(false);
  const loadedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Açılışta taslağı yükle (30 gün TTL draft.ts içinde). `loadDraft` şekil
  // doğrulaması yapsa da (bkz. draft.ts) eksik bir alt-alan render sırasında
  // çökmeye yol açabilir — `mergeWithEmpty` taslağı `createEmptyData()`
  // varsayılanlarıyla tamamlayarak bu çökme dikişini kapatır.
  useEffect(() => {
    const draft = loadDraft(window.localStorage, Date.now());
    if (draft) dispatch({ type: 'load', value: mergeWithEmpty(draft) });
    loadedRef.current = true;
  }, []);

  // Debounce'lu taslak kaydı + "Taslak kaydedildi" göstergesi.
  useEffect(() => {
    if (!loadedRef.current) return;
    if (JSON.stringify(data) === JSON.stringify(createEmptyData())) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDraft(window.localStorage, data, Date.now());
      setSavedVisible(true);
      setTimeout(() => setSavedVisible(false), 2000);
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data]);

  const html = useMemo(
    () =>
      renderSignature(
        data,
        data.layout.templateId,
        iconBaseUrl ? { iconBaseUrl } : undefined,
      ),
    [data, iconBaseUrl],
  );

  // İkon hazırlığı (spec §3d): outline/mono + sosyal varken brandColor/iconStyle
  // değişimlerinde 500ms debounce ile /api/icons çağrılır.
  // EXPORT KİLİDİ SENKRON TÜRETİLİR: `readyColor` yalnız sunucunun "yazıldı"
  // dediği rengi tutar ve kilit `readyColor !== brandColor` karşılaştırmasıyla
  // AYNI render içinde hesaplanır — effect'in bir sonraki kareyi beklemesi
  // butonları tek bir commit için bile açık bırakamaz. (Pazarlıksız kural:
  // kopyalanan HTML'de asla henüz-yazılmamış ikon URL'i olamaz.)
  const iconsNeeded = Boolean(iconBaseUrl) && needsGeneratedIcons(data);
  const [readyColor, setReadyColor] = useState<string | null>(null);
  const [iconsFailed, setIconsFailed] = useState(false);
  const [iconLowContrast, setIconLowContrast] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const iconsSeq = useRef(0);

  useEffect(() => {
    if (!iconsNeeded) {
      iconsSeq.current += 1; // uçuştaki cevap dönerse yok sayılsın
      setIconsFailed(false);
      setIconLowContrast(false);
      return;
    }
    if (data.visuals.brandColor === readyColor) {
      // Zaten onaylanmış renge dönüş — sunucu yalnız dedup yapar, gereksiz
      // POST atma; olası eski bir hata durumunu da temizle.
      setIconsFailed(false);
      return;
    }
    const color = data.visuals.brandColor;
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
          setIconLowContrast(Boolean(body.lowContrast));
        } else {
          setIconsFailed(true);
        }
      } catch {
        if (seq === iconsSeq.current) setIconsFailed(true);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [iconsNeeded, data.visuals.brandColor, retryTick, readyColor]);

  const exportDisabled = iconsNeeded && readyColor !== data.visuals.brandColor;

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
      {step === 'info' && <InfoStep data={data} dispatch={dispatch} />}
      {step === 'visuals' && <VisualsStep data={data} dispatch={dispatch} />}
      {step === 'social' && <SocialStep data={data} dispatch={dispatch} />}
      {step === 'style' && <StyleStep data={data} dispatch={dispatch} iconLowContrast={iconLowContrast} />}
      <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button type="button" onClick={resetAll}>
          Temizle / sıfırdan başla
        </button>
        <span
          style={{
            fontSize: 13,
            color: '#2e7d32',
            opacity: savedVisible ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        >
          Taslak kaydedildi ✓
        </span>
      </div>
    </div>
  );

  const previewPane = (
    <div className={styles.previewPane}>
      <Preview html={html} />
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
