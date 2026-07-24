'use client';

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { renderSignature } from '@mailmyra/renderer';
import { builderReducer, createEmptyData } from './reducer';
import { saveDraft, loadDraft, clearDraft } from '../../lib/draft';
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

export function BuilderClient({ gated }: { gated: boolean }) {
  const [data, dispatch] = useReducer(builderReducer, undefined, createEmptyData);
  const [step, setStep] = useState<StepId>('info');
  const [mobilePane, setMobilePane] = useState<'edit' | 'preview'>('edit');
  const [savedVisible, setSavedVisible] = useState(false);
  const loadedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Açılışta taslağı yükle (30 gün TTL draft.ts içinde).
  useEffect(() => {
    const draft = loadDraft(window.localStorage, Date.now());
    if (draft) dispatch({ type: 'load', value: draft });
    loadedRef.current = true;
  }, []);

  // Debounce'lu taslak kaydı + "Taslak kaydedildi" göstergesi.
  useEffect(() => {
    if (!loadedRef.current) return;
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

  const html = useMemo(() => renderSignature(data, data.layout.templateId), [data]);

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
      {step === 'style' && <StyleStep data={data} dispatch={dispatch} />}
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
      <ExportButtons html={html} filename="mailmyra-imza" gated={gated} />
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
