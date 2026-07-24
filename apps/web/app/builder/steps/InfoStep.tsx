'use client';

import type { SignatureData } from '@mailmyra/renderer';
import type { BuilderAction } from '../reducer';
import { TextField, FieldGroup, labelStyle, inputStyle } from '../fields';

export function InfoStep({
  data,
  dispatch,
}: {
  data: SignatureData;
  dispatch: (a: BuilderAction) => void;
}) {
  const extras = data.extras ?? {};
  const customFields = extras.customFields ?? [];

  function setCustomField(i: number, patch: Partial<{ label: string; value: string; url: string }>) {
    const next = customFields.map((f, j) => (j === i ? { ...f, ...patch } : f));
    dispatch({ type: 'patchExtras', value: { customFields: next } });
  }

  return (
    <div>
      <FieldGroup title="Kimlik">
        <TextField
          label="Ad Soyad"
          required
          value={data.identity.fullName}
          onChange={(v) => dispatch({ type: 'patchIdentity', value: { fullName: v } })}
        />
        <TextField
          label="Ünvan"
          value={data.identity.jobTitle ?? ''}
          onChange={(v) => dispatch({ type: 'patchIdentity', value: { jobTitle: v || undefined } })}
        />
        <TextField
          label="Departman"
          value={data.identity.department ?? ''}
          onChange={(v) => dispatch({ type: 'patchIdentity', value: { department: v || undefined } })}
        />
        <TextField
          label="Şirket"
          value={data.identity.company ?? ''}
          onChange={(v) => dispatch({ type: 'patchIdentity', value: { company: v || undefined } })}
        />
      </FieldGroup>

      <FieldGroup title="İletişim">
        <TextField
          label="E-posta"
          value={data.contact.email ?? ''}
          onChange={(v) => dispatch({ type: 'patchContact', value: { email: v || undefined } })}
        />
        <TextField
          label="Telefon"
          value={data.contact.phone ?? ''}
          onChange={(v) => dispatch({ type: 'patchContact', value: { phone: v || undefined } })}
        />
        <TextField
          label="Mobil"
          value={data.contact.mobile ?? ''}
          onChange={(v) => dispatch({ type: 'patchContact', value: { mobile: v || undefined } })}
        />
        <TextField
          label="Web sitesi"
          value={data.contact.website ?? ''}
          onChange={(v) => dispatch({ type: 'patchContact', value: { website: v || undefined } })}
        />
        <TextField
          label="Adres"
          value={data.contact.address ?? ''}
          onChange={(v) => dispatch({ type: 'patchContact', value: { address: v || undefined } })}
        />
      </FieldGroup>

      <FieldGroup title="CTA Butonu">
        <TextField
          label="Buton metni"
          placeholder="Görüşme Ayarla"
          value={extras.ctaLabel ?? ''}
          onChange={(v) => dispatch({ type: 'patchExtras', value: { ctaLabel: v || undefined } })}
        />
        <TextField
          label="Buton bağlantısı"
          placeholder="https://..."
          value={extras.ctaUrl ?? ''}
          onChange={(v) => dispatch({ type: 'patchExtras', value: { ctaUrl: v || undefined } })}
        />
      </FieldGroup>

      <FieldGroup title="Özel Alanlar">
        {customFields.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Etiket"
              value={f.label}
              onChange={(e) => setCustomField(i, { label: e.target.value })}
            />
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Değer"
              value={f.value}
              onChange={(e) => setCustomField(i, { value: e.target.value })}
            />
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="URL (opsiyonel)"
              value={f.url ?? ''}
              onChange={(e) => setCustomField(i, { url: e.target.value || undefined })}
            />
            <button
              type="button"
              onClick={() =>
                dispatch({
                  type: 'patchExtras',
                  value: { customFields: customFields.filter((_, j) => j !== i) },
                })
              }
            >
              Sil
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            dispatch({
              type: 'patchExtras',
              value: { customFields: [...customFields, { label: '', value: '' }] },
            })
          }
        >
          + Alan ekle
        </button>
      </FieldGroup>

      <FieldGroup title="Yasal Metin">
        <label style={{ display: 'block' }}>
          <span style={labelStyle}>Feragatname / gizlilik notu</span>
          <textarea
            style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
            value={extras.disclaimer ?? ''}
            onChange={(e) =>
              dispatch({ type: 'patchExtras', value: { disclaimer: e.target.value || undefined } })
            }
          />
        </label>
      </FieldGroup>
    </div>
  );
}
