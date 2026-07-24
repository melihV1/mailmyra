'use client';

import type { CSSProperties, ReactNode } from 'react';

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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
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
        onChange={(e) => onChange(e.target.value)}
      />
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
