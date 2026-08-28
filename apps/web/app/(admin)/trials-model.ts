import { adminCustomers } from '../../lib/i18n/dict/admin-customers';
import type { Lang } from '../../lib/i18n/types';

export const TRIAL_WINDOW_DAYS = 7;
export const DAY_MS = 24 * 60 * 60 * 1000;

export type TrialFocus = 'all' | 'ending' | 'expired' | 'over' | 'active';
export type TrialSort = 'attention' | 'trial_end' | 'seat_usage' | 'recent_activity';

export interface TrialEntitlementRow {
  id: string;
  name: string;
  entitlementState: string;
  activeSeats: number;
  entitledSeats: number;
  trialEndsAt: string | null;
  memberCount: number;
  childCount: number;
  lastActivityAt: string | null;
  createdAt: string;
}

export interface TrialFacts {
  isTrial: boolean;
  isActiveTrial: boolean;
  isEndingSoon: boolean;
  isExpired: boolean;
  isOverEntitlement: boolean;
  hasMissingEndDate: boolean;
  trialEndMs: number | null;
  utilization: number;
  urgency: number;
}

export interface TrialSummary {
  activeTrials: number;
  endingSoon: number;
  expired: number;
  overEntitlement: number;
  missingEndDate: number;
}

export interface TrialTimeline {
  elapsedDays: number;
  totalDays: number;
  remainingDays: number;
  percent: number;
  tone: 'info' | 'warning' | 'danger';
}

function parseDate(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getTrialFacts(row: TrialEntitlementRow, now: number): TrialFacts {
  const trialEndMs = parseDate(row.trialEndsAt);
  const isTrial = row.entitlementState === 'trial';
  const isExpired = isTrial && trialEndMs !== null && trialEndMs <= now;
  const isEndingSoon =
    isTrial &&
    trialEndMs !== null &&
    trialEndMs > now &&
    trialEndMs <= now + TRIAL_WINDOW_DAYS * DAY_MS;
  const hasMissingEndDate = isTrial && trialEndMs === null;
  const isActiveTrial = isTrial && !isExpired;
  const isOverEntitlement = row.activeSeats > row.entitledSeats;
  const utilization =
    row.entitledSeats > 0 ? Math.round((row.activeSeats / row.entitledSeats) * 100) : 0;

  let urgency = 0;
  if (isExpired) urgency = 5;
  else if (row.entitlementState === 'past_due' || isOverEntitlement) urgency = 4;
  else if (isEndingSoon) urgency = 3;
  else if (hasMissingEndDate) urgency = 2;
  else if (isActiveTrial) urgency = 1;

  return {
    isTrial,
    isActiveTrial,
    isEndingSoon,
    isExpired,
    isOverEntitlement,
    hasMissingEndDate,
    trialEndMs,
    utilization,
    urgency,
  };
}

export function summarizeTrials(rows: readonly TrialEntitlementRow[], now: number): TrialSummary {
  return rows.reduce<TrialSummary>(
    (summary, row) => {
      const facts = getTrialFacts(row, now);
      if (facts.isActiveTrial) summary.activeTrials += 1;
      if (facts.isEndingSoon) summary.endingSoon += 1;
      if (facts.isExpired) summary.expired += 1;
      if (facts.isOverEntitlement) summary.overEntitlement += 1;
      if (facts.hasMissingEndDate) summary.missingEndDate += 1;
      return summary;
    },
    { activeTrials: 0, endingSoon: 0, expired: 0, overEntitlement: 0, missingEndDate: 0 },
  );
}

export function matchesTrialFocus(
  row: TrialEntitlementRow,
  focus: TrialFocus,
  now: number,
): boolean {
  const facts = getTrialFacts(row, now);
  if (focus === 'ending') return facts.isEndingSoon;
  if (focus === 'expired') return facts.isExpired;
  if (focus === 'over') return facts.isOverEntitlement;
  if (focus === 'active') return facts.isActiveTrial;
  return true;
}

export function sortTrialRows(
  rows: readonly TrialEntitlementRow[],
  sort: TrialSort,
  now: number,
): TrialEntitlementRow[] {
  return [...rows].sort((a, b) => {
    const af = getTrialFacts(a, now);
    const bf = getTrialFacts(b, now);

    if (sort === 'trial_end') {
      return (af.trialEndMs ?? Number.MAX_SAFE_INTEGER) - (bf.trialEndMs ?? Number.MAX_SAFE_INTEGER);
    }
    if (sort === 'seat_usage') {
      return bf.utilization - af.utilization || a.name.localeCompare(b.name);
    }
    if (sort === 'recent_activity') {
      return (parseDate(b.lastActivityAt) ?? 0) - (parseDate(a.lastActivityAt) ?? 0);
    }
    return bf.urgency - af.urgency ||
      (af.trialEndMs ?? Number.MAX_SAFE_INTEGER) -
        (bf.trialEndMs ?? Number.MAX_SAFE_INTEGER) ||
      a.name.localeCompare(b.name);
  });
}

export function describeTrialWindow(
  row: TrialEntitlementRow,
  now: number,
  lang: Lang = 'en',
): { label: string; tone: 'info' | 'warning' | 'danger' | 'secondary'; date: string | null } {
  const t = adminCustomers[lang].trialWindow;
  const facts = getTrialFacts(row, now);
  const date = row.trialEndsAt?.slice(0, 10) ?? null;

  if (!facts.isTrial) return { label: t.notATrial, tone: 'secondary', date: null };
  if (facts.hasMissingEndDate) return { label: t.endDateMissing, tone: 'warning', date: null };

  const end = facts.trialEndMs ?? now;
  if (facts.isExpired) {
    const elapsed = Math.floor((now - end) / DAY_MS);
    return {
      label: elapsed === 0 ? t.expiredToday : t.expiredDaysAgo(elapsed),
      tone: 'danger',
      date,
    };
  }

  const remaining = Math.max(1, Math.ceil((end - now) / DAY_MS));
  return {
    label: remaining === 1 ? t.endsWithin24h : t.endsInDays(remaining),
    tone: facts.isEndingSoon ? 'warning' : 'info',
    date,
  };
}

export function getTrialTimeline(
  row: TrialEntitlementRow,
  now: number,
): TrialTimeline | null {
  const facts = getTrialFacts(row, now);
  const createdMs = parseDate(row.createdAt);
  const trialEndMs = facts.trialEndMs;

  if (!facts.isTrial || createdMs === null || trialEndMs === null || trialEndMs <= createdMs) {
    return null;
  }

  const durationMs = trialEndMs - createdMs;
  const elapsedMs = Math.min(durationMs, Math.max(0, now - createdMs));
  const totalDays = Math.max(1, Math.ceil(durationMs / DAY_MS));
  const elapsedDays = Math.min(totalDays, Math.max(0, Math.floor(elapsedMs / DAY_MS)));
  const remainingDays = Math.max(0, Math.ceil((trialEndMs - now) / DAY_MS));
  const percent = facts.isExpired
    ? 100
    : Math.min(100, Math.max(0, Math.round((elapsedMs / durationMs) * 100)));

  return {
    elapsedDays,
    totalDays,
    remainingDays,
    percent,
    tone: facts.isExpired ? 'danger' : facts.isEndingSoon ? 'warning' : 'info',
  };
}
