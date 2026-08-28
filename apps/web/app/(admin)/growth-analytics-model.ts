import type { Lang } from '../../lib/i18n/types';
import type { ProductAnalyticsSnapshot } from './product-analytics-model';

const DAY = 86_400_000;

export type GrowthLeadStage = 'new' | 'qualified' | 'scheduled' | 'won' | 'lost';

export type GrowthLeadRow = {
  id: string;
  company: string;
  contact: string;
  source: string;
  seats: number;
  stage: GrowthLeadStage;
  createdAt: string;
  nextStep: string;
};

export type ContentPageRecord = {
  route: string;
  title: string;
  kind: 'marketing' | 'legal';
  metadata: boolean;
  indexable: boolean;
  owner: string;
};

export type MediaAssetRecord = {
  path: string;
  label: string;
  format: 'SVG' | 'PNG';
  purpose: string;
  tone: string;
};

export type LegalContentRecord = {
  route: string;
  label: string;
  code: 'privacy' | 'terms' | 'kvkk' | 'dpa';
  published: boolean;
  acceptanceTracked: boolean;
  support: string;
};

export type GrowthPreviewData = {
  leads: GrowthLeadRow[];
};

export const CONTENT_PAGE_REGISTRY: ContentPageRecord[] = [
  { route: '/', title: 'Mailmyra — Kurumsal e-posta imzası yönetimi', kind: 'marketing', metadata: true, indexable: true, owner: 'Marketing' },
  { route: '/privacy', title: 'Privacy Policy — Mailmyra', kind: 'legal', metadata: true, indexable: true, owner: 'Legal' },
  { route: '/terms', title: 'Terms of Service — Mailmyra', kind: 'legal', metadata: true, indexable: true, owner: 'Legal' },
  { route: '/kvkk', title: 'KVKK Aydınlatma Metni — Mailmyra', kind: 'legal', metadata: true, indexable: true, owner: 'Legal' },
];

export const MEDIA_ASSET_REGISTRY: MediaAssetRecord[] = [
  { path: '/brand/logo-ikonlu.svg', label: 'Primary logo', format: 'SVG', purpose: 'Light surfaces', tone: 'primary' },
  { path: '/brand/logo-ikonlu-white.svg', label: 'Inverse logo', format: 'SVG', purpose: 'Dark surfaces', tone: 'info' },
  { path: '/brand/ikon-white.svg', label: 'Inverse mark', format: 'SVG', purpose: 'Compact dark UI', tone: 'secondary' },
  { path: '/brand/mailmyra-logo.png', label: 'Raster logo', format: 'PNG', purpose: 'Email-safe fallback', tone: 'warning' },
];

export const LEGAL_CONTENT_REGISTRY: LegalContentRecord[] = [
  { route: '/privacy', label: 'Privacy policy', code: 'privacy', published: true, acceptanceTracked: true, support: 'Public route and acceptance evidence exist.' },
  { route: '/terms', label: 'Terms of service', code: 'terms', published: true, acceptanceTracked: true, support: 'Public route and acceptance evidence exist.' },
  { route: '/kvkk', label: 'KVKK notice', code: 'kvkk', published: true, acceptanceTracked: false, support: 'Public disclosure route; not an acceptance document type.' },
  { route: '', label: 'Data processing agreement', code: 'dpa', published: false, acceptanceTracked: true, support: 'Acceptance type exists, but no public content route is registered.' },
];

function monthKey(value: string) {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string, lang: Lang = 'en') {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, 1)).toLocaleDateString(lang, { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

export function registrationSeries(source: ProductAnalyticsSnapshot, now: number, months = 8, lang: Lang = 'en') {
  const rows = Array.from({ length: months }, (_, index) => {
    const date = new Date(now);
    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCMonth(date.getUTCMonth() - (months - index - 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    return { key, label: monthLabel(key, lang), value: 0 };
  });
  const map = new Map(rows.map((row) => [row.key, row]));
  source.organizations.forEach((org) => {
    const row = map.get(monthKey(org.createdAt));
    if (row) row.value += 1;
  });
  return rows;
}

export function growthLifecycle(source: ProductAnalyticsSnapshot) {
  const organizations = source.organizations.length;
  const memberReady = source.organizations.filter((org) => org.memberCount > 0).length;
  const designed = source.organizations.filter((org) => org.signatureCount > 0).length;
  const published = source.organizations.filter((org) => org.activeSenderCount > 0).length;
  const exported = source.organizations.filter((org) => org.exportedSenderCount > 0).length;
  const values = [organizations, memberReady, designed, published, exported] as const;
  const labels = ['Workspace', 'Member ready', 'Signature saved', 'Sender live', 'Export evidenced'];
  return labels.map((label, index) => {
    const value = values[index] ?? 0;
    const previous = index === 0 ? organizations : values[index - 1] ?? 0;
    return {
      key: label.toLowerCase().replaceAll(' ', '-'),
      label,
      value,
      rate: organizations ? Math.round((value / organizations) * 100) : 0,
      stepRate: index === 0 ? 100 : previous ? Math.round((value / previous) * 100) : 0,
    };
  });
}

export function growthFacts(source: ProductAnalyticsSnapshot, now: number) {
  const lifecycle = growthLifecycle(source);
  const recentOrganizations = source.organizations.filter((org) => now - new Date(org.createdAt).getTime() <= 30 * DAY).length;
  const recentSignals = source.events.filter((event) => now - new Date(event.createdAt).getTime() <= 30 * DAY).length;
  const activeOrganizations = source.organizations.filter((org) => org.activeSenderCount > 0).length;
  const exportOrganizations = source.organizations.filter((org) => org.exportedSenderCount > 0).length;
  return {
    organizations: source.organizations.length,
    recentOrganizations,
    recentSignals,
    activeOrganizations,
    exportOrganizations,
    activationRate: lifecycle[0]?.value ? lifecycle[3]?.rate ?? 0 : 0,
    exportRate: lifecycle[0]?.value ? lifecycle[4]?.rate ?? 0 : 0,
  };
}

export function momentumRows(source: ProductAnalyticsSnapshot, now: number) {
  return source.organizations.map((org) => {
    const age = Math.max(0, Math.floor((now - new Date(org.createdAt).getTime()) / DAY));
    const milestones = Number(org.memberCount > 0) + Number(org.signatureCount > 0) + Number(org.activeSenderCount > 0) + Number(org.exportedSenderCount > 0);
    const recent = org.lastActivityAt ? Math.max(0, Math.floor((now - new Date(org.lastActivityAt).getTime()) / DAY)) : null;
    const score = milestones * 20 + (recent !== null && recent <= 30 ? 20 : 0);
    return { ...org, age, milestones, recent, score };
  }).sort((a, b) => b.score - a.score || b.activeSenderCount - a.activeSenderCount);
}

export function groupLeads(rows: GrowthLeadRow[]) {
  const stages: GrowthLeadStage[] = ['new', 'qualified', 'scheduled', 'won', 'lost'];
  return stages.map((stage) => ({ stage, rows: rows.filter((row) => row.stage === stage) }));
}
