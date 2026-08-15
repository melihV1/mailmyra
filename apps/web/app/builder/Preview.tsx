'use client';

import { useState } from 'react';
import { contrastRatio } from '@mailmyra/renderer';
import { wrapPreviewDoc } from '../../components/preview-doc';

const DARK_BG = '#1a1a1a';
/** WCAG "büyük metin" alt sınırı — altı pratikte "kutu boş görünüyor" demek. */
const READABLE_ON_DARK = 3;

/**
 * Koyu önizleme neden boş görünüyor, oradayken açıkla. StyleStep'in kalıcı
 * koyu-zemin uyarısı bilerek kaldırılmıştı (hiçbir renk iki zeminde birden
 * uyarısız kalamıyor); bu not o kararı geri almaz — yalnız koyu kipte, o
 * anki metin rengi için görünür.
 */
export function darkPreviewNote(textColor: string): string | null {
  try {
    if (contrastRatio(textColor, DARK_BG) >= READABLE_ON_DARK) return null;
  } catch {
    return null; // geçersiz hex — renk seçici geçerli üretir, bozuk girişte sessiz
  }
  return (
    'Metin rengin koyu zeminde okunmuyor. Çoğu e-posta istemcisi koyu modda ' +
    'renkleri kendisi uyarlar; bu önizleme uyarlamayan istemciyi gösterir.'
  );
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
  const [dark, setDark] = useState(false);
  const note = dark ? darkPreviewNote(textColor) : null;
  return (
    <div>
      {chrome === 'theme' ? (
        <div className="btn-group btn-group-sm mb-3" role="group" aria-label="Preview background">
          <button
            type="button"
            className={`btn ${dark ? 'btn-outline-primary' : 'btn-primary'}`}
            aria-pressed={!dark}
            onClick={() => setDark(false)}
          >
            <i className="icon-base ti tabler-sun icon-14px me-1" aria-hidden="true" />
            Light
          </button>
          <button
            type="button"
            className={`btn ${dark ? 'btn-primary' : 'btn-outline-primary'}`}
            aria-pressed={dark}
            onClick={() => setDark(true)}
          >
            <i className="icon-base ti tabler-moon-stars icon-14px me-1" aria-hidden="true" />
            Dark
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setDark(false)} disabled={!dark}>
            Açık zemin
          </button>
          <button type="button" onClick={() => setDark(true)} disabled={dark}>
            Koyu zemin
          </button>
        </div>
      )}
      {note &&
        (chrome === 'theme' ? (
          <div className="alert alert-warning py-2 small" role="note">
            Your text color is hard to read on a dark background. Most clients adapt colors in
            dark mode — this preview shows one that does not.
          </div>
        ) : (
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#8a6d1a' }}>{note}</p>
        ))}
      {/* allow-same-origin ŞART (2026-08-15): sandbox="" iframe'i opak
          origin'dir ve Chrome PNA opak→localhost görsel isteklerini keser —
          dev'de fixture/ikon görselleri sessizce kırılıyordu. Script'ler
          yine yasak (allow-scripts YOK); CSS yalıtımı iframe'in doğası. */}
      <iframe
        title="signature-preview"
        sandbox="allow-same-origin"
        srcDoc={wrapPreviewDoc(html, dark ? '#1a1a1a' : '#ffffff')}
        style={{
          width: '100%',
          minHeight: 360,
          border: '1px solid #ddd',
          borderRadius: 8,
          background: dark ? '#1a1a1a' : '#fff',
        }}
      />
    </div>
  );
}
