'use client';

import { useState } from 'react';
import { wrapPreviewDoc } from '../../components/preview-doc';

export function Preview({ html }: { html: string }) {
  const [dark, setDark] = useState(false);
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
      <iframe
        title="signature-preview"
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
