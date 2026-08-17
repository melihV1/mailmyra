'use client';

import type { ReactNode } from 'react';

/**
 * Builder form primitifleri — Vuexy dili (2026-08-17). Eskiden satır içi
 * stil objeleriydi (`labelStyle`/`inputStyle`); artık temanın `form-label` /
 * `form-control` sınıfları. Alanlar ızgaraya oturur: `FieldGroup` bir
 * `row`, her alan varsayılan olarak yarım genişlik — temanın Edit User
 * modal'ındaki iki kolonlu form düzeni.
 */

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  locked,
  disabled,
  wide = false,
  type = 'text',
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
  /** Tam satır kaplasın (adres, uzun metinler). */
  wide?: boolean;
  type?: 'text' | 'email' | 'url' | 'tel';
}) {
  return (
    <div className={wide ? 'col-12' : 'col-12 col-md-6'}>
      <label className="form-label">
        {label}
        {required ? ' *' : ''}
      </label>
      <input
        type={type}
        className="form-control"
        value={value}
        placeholder={placeholder}
        required={required}
        aria-required={required || undefined}
        disabled={locked || disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      {locked && <LockHint />}
    </div>
  );
}

/** Marka kilidi ipucu — tek yerden, bütün adımlarda aynı görünür. */
export function LockHint() {
  return (
    <div className="form-text d-flex align-items-center gap-1">
      <i className="icon-base ti tabler-lock icon-14px" aria-hidden="true" />
      Managed in brand settings
    </div>
  );
}

/**
 * Alan kümesi. Başlık + ızgara; kart İÇİNDE yaşadığı için kendi kartını
 * açmaz (iç içe kart temada ağır durur), bölümler `hr` ile ayrılır.
 */
export function FieldGroup({
  title,
  icon,
  children,
  first = false,
}: {
  title: string;
  icon?: string;
  children: ReactNode;
  /** İlk grup üstünde ayraç olmasın. */
  first?: boolean;
}) {
  return (
    <>
      {!first && <hr className="my-6" />}
      <h6 className="d-flex align-items-center gap-2 text-body mb-4">
        {icon && <i className={`icon-base ti ${icon} icon-18px text-primary`} aria-hidden="true" />}
        {title}
      </h6>
      <div className="row g-4">{children}</div>
    </>
  );
}
