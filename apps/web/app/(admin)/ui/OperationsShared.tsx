import Link from 'next/link';
import type { ReactNode } from 'react';

import { adminCommon } from '../../../lib/i18n/dict/admin-common';
import type { Lang } from '../../../lib/i18n/types';

export function OperationsKpiStrip({ children }: { children: ReactNode }) {
  return <div className="card mb-6"><div className="card-body"><div className="row g-0">{children}</div></div></div>;
}

export function OperationsKpi({
  label,
  value,
  support,
  icon,
  tone,
  last = false,
}: {
  label: string;
  value: string;
  support: string;
  icon: string;
  tone: string;
  last?: boolean;
}) {
  return (
    <div className="col-12 col-sm-6 col-xl-3 mm-operations-kpi">
      <div className={`d-flex align-items-center justify-content-between gap-3 px-2 px-sm-4 py-3 py-xl-0${last ? '' : ' border-end mm-operations-kpi-divider'}`}>
        <div className="min-w-0"><small className="text-body-secondary d-block mb-1">{label}</small><h4 className="mb-1 text-truncate">{value}</h4><small className="text-body-secondary d-block text-truncate">{support}</small></div>
        <span className="avatar flex-shrink-0"><span className={`avatar-initial rounded bg-label-${tone} text-${tone}`}><i className={`icon-base ti ${icon} icon-24px`} aria-hidden="true" /></span></span>
      </div>
    </div>
  );
}

export function OperationsSectionHeader({ title, support, action }: { title: string; support?: string; action?: ReactNode }) {
  return <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4"><div><h5 className="mb-1">{title}</h5>{support && <p className="text-body-secondary mb-0">{support}</p>}</div>{action}</div>;
}

export function SourceNotice({ title, body, tone = 'info', icon = 'tabler-database' }: { title: string; body: string; tone?: string; icon?: string }) {
  return <div className={`alert alert-${tone} d-flex align-items-start gap-3 mb-0`} role="note"><i className={`icon-base ti ${icon} icon-24px mt-1`} aria-hidden="true" /><div><h6 className="alert-heading mb-1">{title}</h6><p className="mb-0">{body}</p></div></div>;
}

export function EmptyWorkbench({ icon, title, body, actionHref, actionLabel }: { icon: string; title: string; body: string; actionHref?: string; actionLabel?: string }) {
  return <div className="card"><div className="card-body text-center py-10"><span className="avatar avatar-xl mb-4"><span className="avatar-initial rounded bg-label-primary"><i className={`icon-base ti ${icon} icon-32px`} aria-hidden="true" /></span></span><h4>{title}</h4><p className="text-body-secondary mx-auto mb-5" style={{ maxWidth: '38rem' }}>{body}</p>{actionHref && actionLabel && <Link href={actionHref} className="btn btn-primary">{actionLabel}<i className="icon-base ti tabler-arrow-right ms-2" aria-hidden="true" /></Link>}</div></div>;
}

export function InitialAvatar({ label, tone = 'primary', square = false }: { label: string; tone?: string; square?: boolean }) {
  const initials = label.split(/[@\s&]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
  return <span className="avatar avatar-sm flex-shrink-0"><span className={`avatar-initial ${square ? 'rounded' : 'rounded-circle'} bg-label-${tone} text-${tone}`}>{initials}</span></span>;
}

export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat('en', { style: 'currency', currency, minimumFractionDigits: 2 }).format(cents / 100);
}

export function formatCompactDate(value: string | null, lang: Lang = 'en'): string {
  if (!value) return adminCommon[lang].notRecorded;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return adminCommon[lang].notRecorded;
  return date.toLocaleDateString(lang, { day: '2-digit', month: 'short', year: 'numeric' });
}

/** AdminActionLogView emsali: 'en' → en-GB dateStyle-medium/timeStyle-short, 'tr' → tr-TR aynı stiller. */
export function formatDateTime(value: string | null, lang: Lang = 'en'): string {
  if (!value) return adminCommon[lang].notRecorded;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return adminCommon[lang].unknownTime;
  const locale = lang === 'tr' ? 'tr-TR' : 'en-GB';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
