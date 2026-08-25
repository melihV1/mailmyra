'use client';

import type { SignatureData } from '@mailmyra/renderer';
import type { BuilderAction } from '../reducer';
import { TextField, FieldGroup, LockHint } from '../fields';
import type { BrandFieldName } from '../../../lib/brand-apply';
import { builder as builderDict } from '../../../lib/i18n/dict/builder';
import { useLang } from '../../../lib/i18n/LangProvider';

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
  const t = builderDict[useLang()].steps.info;
  const extras = data.extras ?? {};
  const appliedExtras = applied.extras ?? {};
  const customFields = extras.customFields ?? [];

  function setCustomField(i: number, patch: Partial<{ label: string; value: string; url: string }>) {
    const next = customFields.map((f, j) => (j === i ? { ...f, ...patch } : f));
    dispatch({ type: 'patchExtras', value: { customFields: next } });
  }

  return (
    <div>
      <FieldGroup title={t.identity.groupTitle} icon="tabler-user" first>
        <TextField
          label={t.identity.fullName}
          required
          value={data.identity.fullName}
          onChange={(v) => dispatch({ type: 'patchIdentity', value: { fullName: v } })}
        />
        <TextField
          label={t.identity.jobTitle}
          value={data.identity.jobTitle ?? ''}
          onChange={(v) => dispatch({ type: 'patchIdentity', value: { jobTitle: v || undefined } })}
        />
        <TextField
          label={t.identity.department}
          value={data.identity.department ?? ''}
          onChange={(v) => dispatch({ type: 'patchIdentity', value: { department: v || undefined } })}
        />
        <TextField
          label={t.identity.company}
          value={data.identity.company ?? ''}
          onChange={(v) => dispatch({ type: 'patchIdentity', value: { company: v || undefined } })}
        />
      </FieldGroup>

      <FieldGroup title={t.contact.groupTitle} icon="tabler-address-book">
        <TextField
          label={t.contact.email} type="email"
          value={data.contact.email ?? ''}
          onChange={(v) => dispatch({ type: 'patchContact', value: { email: v || undefined } })}
        />
        <TextField
          label={t.contact.phone}
          value={data.contact.phone ?? ''}
          onChange={(v) => dispatch({ type: 'patchContact', value: { phone: v || undefined } })}
        />
        <TextField
          label={t.contact.mobile}
          value={data.contact.mobile ?? ''}
          onChange={(v) => dispatch({ type: 'patchContact', value: { mobile: v || undefined } })}
        />
        <TextField
          label={t.contact.website} type="url"
          value={data.contact.website ?? ''}
          onChange={(v) => dispatch({ type: 'patchContact', value: { website: v || undefined } })}
        />
        <TextField
          label={t.contact.address} wide
          value={data.contact.address ?? ''}
          onChange={(v) => dispatch({ type: 'patchContact', value: { address: v || undefined } })}
        />
      </FieldGroup>

      <FieldGroup title={t.cta.groupTitle} icon="tabler-hand-click">
        <TextField
          label={t.cta.buttonLabel}
          placeholder={t.cta.buttonLabelPlaceholder}
          value={locked.has('cta') ? (appliedExtras.ctaLabel ?? '') : (extras.ctaLabel ?? '')}
          onChange={(v) => dispatch({ type: 'patchExtras', value: { ctaLabel: v || undefined } })}
          disabled={locked.has('cta')}
        />
        <TextField
          label={t.cta.buttonLink}
          placeholder={t.cta.buttonLinkPlaceholder}
          value={locked.has('cta') ? (appliedExtras.ctaUrl ?? '') : (extras.ctaUrl ?? '')}
          onChange={(v) => dispatch({ type: 'patchExtras', value: { ctaUrl: v || undefined } })}
          disabled={locked.has('cta')}
        />
        {locked.has('cta') && (
          <div className="col-12">
            <LockHint />
          </div>
        )}
      </FieldGroup>

      <FieldGroup title={t.customFields.groupTitle} icon="tabler-list-details">
        {customFields.map((f, i) => (
          <div key={i} className="col-12 d-flex flex-wrap align-items-center gap-2">
            <input
              className="form-control flex-grow-1"
              style={{ minWidth: 140 }}
              placeholder={t.customFields.labelPlaceholder}
              aria-label={t.customFields.labelAria(i + 1)}
              value={f.label}
              onChange={(e) => setCustomField(i, { label: e.target.value })}
            />
            <input
              className="form-control flex-grow-1"
              style={{ minWidth: 140 }}
              placeholder={t.customFields.valuePlaceholder}
              aria-label={t.customFields.valueAria(i + 1)}
              value={f.value}
              onChange={(e) => setCustomField(i, { value: e.target.value })}
            />
            <input
              className="form-control flex-grow-1"
              style={{ minWidth: 140 }}
              placeholder={t.customFields.urlPlaceholder}
              aria-label={t.customFields.linkAria(i + 1)}
              value={f.url ?? ''}
              onChange={(e) => setCustomField(i, { url: e.target.value || undefined })}
            />
            <button
              type="button"
              className="btn btn-icon btn-label-danger flex-shrink-0"
              aria-label={t.customFields.deleteAria(i + 1)}
              onClick={() =>
                dispatch({
                  type: 'patchExtras',
                  value: { customFields: customFields.filter((_, j) => j !== i) },
                })
              }
            >
              <i className="icon-base ti tabler-trash" aria-hidden="true" />
            </button>
          </div>
        ))}
        <div className="col-12">
        <button
          type="button"
          className="btn btn-label-primary btn-sm"
          onClick={() =>
            dispatch({
              type: 'patchExtras',
              value: { customFields: [...customFields, { label: '', value: '' }] },
            })
          }
        >
          <i className="icon-base ti tabler-plus me-1" aria-hidden="true" />
          {t.customFields.addField}
        </button>
        </div>
      </FieldGroup>

      <FieldGroup title={t.legal.groupTitle} icon="tabler-scale">
        <div className="col-12">
          <label className="form-label">{t.legal.label}</label>
          <textarea
            className="form-control"
            rows={3}
            value={locked.has('disclaimer') ? (appliedExtras.disclaimer ?? '') : (extras.disclaimer ?? '')}
            disabled={locked.has('disclaimer')}
            onChange={(e) =>
              dispatch({ type: 'patchExtras', value: { disclaimer: e.target.value || undefined } })
            }
          />
          {locked.has('disclaimer') && <LockHint />}
        </div>
      </FieldGroup>
    </div>
  );
}
