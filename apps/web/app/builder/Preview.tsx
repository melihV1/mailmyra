'use client';

import { useState } from 'react';
import { contrastRatio } from '@mailmyra/renderer';
import { wrapPreviewDoc } from '../../components/preview-doc';
import { builder as builderDict } from '../../lib/i18n/dict/builder';
import { useLang } from '../../lib/i18n/LangProvider';
import type { Lang } from '../../lib/i18n/types';

const DARK_BG = '#1a1a1a';
/** WCAG "büyük metin" alt sınırı — altı pratikte "kutu boş görünüyor" demek. */
const READABLE_ON_DARK = 3;

/**
 * Koyu önizleme neden boş görünüyor, oradayken açıkla. StyleStep'in kalıcı
 * koyu-zemin uyarısı bilerek kaldırılmıştı (hiçbir renk iki zeminde birden
 * uyarısız kalamıyor); bu not o kararı geri almaz — yalnız koyu kipte, o
 * anki metin rengi için görünür.
 *
 * `lang` opsiyonel, varsayılan 'en' — preview-dark-note.test.ts'in tek
 * argümanlı çağrıları İngilizce metni BİREBİR almaya devam eder (B-Task 8).
 */
export function darkPreviewNote(textColor: string, lang: Lang = 'en'): string | null {
  try {
    if (contrastRatio(textColor, DARK_BG) >= READABLE_ON_DARK) return null;
  } catch {
    return null; // geçersiz hex — renk seçici geçerli üretir, bozuk girişte sessiz
  }
  return builderDict[lang].preview.darkNoteFn;
}

export function Preview({
  html,
  textColor,
  chrome = 'plain',
}: {
  html: string;
  textColor: string;
  /** 'theme': Vuexy panelinde kullanım — düğmeler tema dili + EN etiket.
   *  'plain' (varsayılan): builder'ın mevcut hâli, DEĞİŞMEDİ. */
  chrome?: 'plain' | 'theme';
}) {
  const lang = useLang();
  const t = builderDict[lang];
  const [dark, setDark] = useState(false);
  const note = dark ? darkPreviewNote(textColor, lang) : null;
  return (
    <div>
      {chrome === 'theme' ? (
        <div
          className="btn-group btn-group-sm mb-3"
          role="group"
          aria-label={t.preview.backgroundAria}
        >
          <button
            type="button"
            className={`btn ${dark ? 'btn-outline-primary' : 'btn-primary'}`}
            aria-pressed={!dark}
            onClick={() => setDark(false)}
          >
            <i className="icon-base ti tabler-sun icon-14px me-1" aria-hidden="true" />
            {t.preview.light}
          </button>
          <button
            type="button"
            className={`btn ${dark ? 'btn-primary' : 'btn-outline-primary'}`}
            aria-pressed={dark}
            onClick={() => setDark(true)}
          >
            <i className="icon-base ti tabler-moon-stars icon-14px me-1" aria-hidden="true" />
            {t.preview.dark}
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setDark(false)} disabled={!dark}>
            {t.preview.light}
          </button>
          <button type="button" onClick={() => setDark(true)} disabled={dark}>
            {t.preview.dark}
          </button>
        </div>
      )}
      {note &&
        (chrome === 'theme' ? (
          <div className="alert alert-warning py-2 small" role="note">
            {t.preview.darkNoteAlert}
          </div>
        ) : (
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#8a6d1a' }}>{note}</p>
        ))}
      {/* allow-same-origin ŞART (2026-08-15): sandbox="" iframe'i opak
          origin'dir ve Chrome PNA opak→localhost görsel isteklerini keser —
          dev'de fixture/ikon görselleri sessizce kırılıyordu. Script'ler
          yine yasak (allow-scripts YOK); CSS yalıtımı iframe'in doğası. */}
      {/* Tema kipinde iframe kendi "kağıt" yüzeyinde durur (builder-theme.css):
          noktalı zemin + gölge. Plain kip /dev/render'ın hâli, DEĞİŞMEDİ. */}
      <div
        className={chrome === 'theme' ? 'mm-preview-surface' : undefined}
        data-dark={chrome === 'theme' ? String(dark) : undefined}
      >
        <iframe
          title={t.preview.iframeTitle}
          sandbox="allow-same-origin"
          srcDoc={wrapPreviewDoc(html, dark ? '#1a1a1a' : '#ffffff')}
          style={
            chrome === 'theme'
              ? { width: '100%', minHeight: 420 }
              : {
                  width: '100%',
                  minHeight: 360,
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  background: dark ? '#1a1a1a' : '#fff',
                }
          }
        />
      </div>
    </div>
  );
}
