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

export function Preview({ html, textColor }: { html: string; textColor: string }) {
  const [dark, setDark] = useState(false);
  const note = dark ? darkPreviewNote(textColor) : null;
  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => setDark(false)} disabled={!dark}>
          Açık zemin
        </button>
        <button type="button" onClick={() => setDark(true)} disabled={dark}>
          Koyu zemin
        </button>
      </div>
      {note && (
        <p style={{ margin: '0 0 8px', fontSize: 13, color: '#8a6d1a' }}>{note}</p>
      )}
      <iframe
        title="signature-preview"
        sandbox=""
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
