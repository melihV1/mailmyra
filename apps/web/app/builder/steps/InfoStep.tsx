'use client';

import type { SignatureData } from '@mailmyra/renderer';
import type { BuilderAction } from '../reducer';
import { TextField, FieldGroup, labelStyle, inputStyle } from '../fields';
import type { BrandFieldName } from '../../../lib/brand-apply';
import styles from '../builder.module.css';

export function InfoStep({
  data,
  applied,
  dispatch,
  locked = new Set<BrandFieldName>(),
}: {
  data: SignatureData;
  /** `applyBrand(data, brand)` çıktısı — CTA/disclaimer kilitliyken
   *  GÖSTERİLEN değer buradan okunur (bkz. StyleStep aynı desen). */
  applied: SignatureData;
  dispatch: (a: BuilderAction) => void;
  /** Marka ayarlarından yönetilen alan adları — o kontroller pasif. */
  locked?: Set<BrandFieldName>;
}) {
  const extras = data.extras ?? {};
  const appliedExtras = applied.extras ?? {};
  const customFields = extras.customFields ?? [];

  function setCustomField(i: number, patch: Partial<{ label: string; value: string; url: string }>) {
    const next = customFields.map((f, j) => (j === i ? { ...f, ...patch } : f));
    dispatch({ type: 'patchExtras', value: { customFields: next } });
  }

  return (
    <div>
      <FieldGroup title="Identity">
        <TextField
          label="Full name"
          required
          value={data.identity.fullName}
          onChange={(v) => dispatch({ type: 'patchIdentity', value: { fullName: v } })}
        />
        <TextField
          label="Job title"
          value={data.identity.jobTitle ?? ''}
          onChange={(v) => dispatch({ type: 'patchIdentity', value: { jobTitle: v || undefined } })}
        />
        <TextField
          label="Department"
          value={data.identity.department ?? ''}
          onChange={(v) => dispatch({ type: 'patchIdentity', value: { department: v || undefined } })}
        />
        <TextField
          label="Company"
          value={data.identity.company ?? ''}
          onChange={(v) => dispatch({ type: 'patchIdentity', value: { company: v || undefined } })}
        />
      </FieldGroup>

      <FieldGroup title="Contact">
        <TextField
          label="E-mail"
          value={data.contact.email ?? ''}
          onChange={(v) => dispatch({ type: 'patchContact', value: { email: v || undefined } })}
        />
        <TextField
          label="Phone"
          value={data.contact.phone ?? ''}
          onChange={(v) => dispatch({ type: 'patchContact', value: { phone: v || undefined } })}
        />
        <TextField
          label="Mobile"
          value={data.contact.mobile ?? ''}
          onChange={(v) => dispatch({ type: 'patchContact', value: { mobile: v || undefined } })}
        />
        <TextField
          label="Website"
          value={data.contact.website ?? ''}
          onChange={(v) => dispatch({ type: 'patchContact', value: { website: v || undefined } })}
        />
        <TextField
          label="Address"
          value={data.contact.address ?? ''}
          onChange={(v) => dispatch({ type: 'patchContact', value: { address: v || undefined } })}
        />
      </FieldGroup>

      <FieldGroup title="Call to action">
        <TextField
          label="Button label"
          placeholder="Book a meeting"
          value={locked.has('cta') ? (appliedExtras.ctaLabel ?? '') : (extras.ctaLabel ?? '')}
          onChange={(v) => dispatch({ type: 'patchExtras', value: { ctaLabel: v || undefined } })}
          disabled={locked.has('cta')}
        />
        <TextField
          label="Button link"
          placeholder="https://..."
          value={locked.has('cta') ? (appliedExtras.ctaUrl ?? '') : (extras.ctaUrl ?? '')}
          onChange={(v) => dispatch({ type: 'patchExtras', value: { ctaUrl: v || undefined } })}
          disabled={locked.has('cta')}
        />
        {locked.has('cta') && (
          <span className={styles.lockHint}>🔒 Managed in brand settings</span>
        )}
      </FieldGroup>

      <FieldGroup title="Custom fields">
        {customFields.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Label"
              aria-label={`Custom field ${i + 1} label`}
              value={f.label}
              onChange={(e) => setCustomField(i, { label: e.target.value })}
            />
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Value"
              aria-label={`Custom field ${i + 1} value`}
              value={f.value}
              onChange={(e) => setCustomField(i, { value: e.target.value })}
            />
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="URL (optional)"
              aria-label={`Custom field ${i + 1} link`}
              value={f.url ?? ''}
              onChange={(e) => setCustomField(i, { url: e.target.value || undefined })}
            />
            <button
              type="button"
              aria-label={`Delete custom field ${i + 1}`}
              onClick={() =>
                dispatch({
                  type: 'patchExtras',
                  value: { customFields: customFields.filter((_, j) => j !== i) },
                })
              }
            >
              Delete
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
          + Add field
        </button>
      </FieldGroup>

      <FieldGroup title="Legal text">
        <label style={{ display: 'block' }}>
          <span style={labelStyle}>Disclaimer / confidentiality note</span>
          <textarea
            style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
            value={locked.has('disclaimer') ? (appliedExtras.disclaimer ?? '') : (extras.disclaimer ?? '')}
            disabled={locked.has('disclaimer')}
            onChange={(e) =>
              dispatch({ type: 'patchExtras', value: { disclaimer: e.target.value || undefined } })
            }
          />
          {locked.has('disclaimer') && (
            <span className={styles.lockHint}>🔒 Managed in brand settings</span>
          )}
        </label>
      </FieldGroup>
    </div>
  );
}
