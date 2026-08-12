'use client';

import type { CSSProperties, ReactNode } from 'react';

import styles from './builder.module.css';

export const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: '#6d6e71',
  marginBottom: 4,
};

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #d5d5d5',
  borderRadius: 6,
  fontSize: 14,
  boxSizing: 'border-box',
};

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  locked,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  /** Marka ayarlarından yönetiliyor — kontrol pasif, kilit ipucu KENDİSİ görünür. */
  locked?: boolean;
  /** Yalnız kontrolü pasifleştirir, ipucu basmaz — birden çok kontrolün TEK
   *  bir paylaşılan ipucu altında toplandığı durumlar için (ör. CTA çifti:
   *  iki alan aynı `cta` kilidine bağlı, ipucu grupta bir kez gösterilir). */
  disabled?: boolean;
}) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={labelStyle}>
        {label}
        {required ? ' *' : ''}
      </span>
      <input
        style={inputStyle}
        value={value}
        placeholder={placeholder}
        required={required}
        aria-required={required || undefined}
        disabled={locked || disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      {locked && <span className={styles.lockHint}>🔒 Marka ayarlarından yönetiliyor</span>}
    </label>
  );
}

export function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <legend style={{ fontSize: 13, fontWeight: 600, padding: '0 6px' }}>{title}</legend>
      {children}
    </fieldset>
  );
}
