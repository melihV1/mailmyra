import type { ReportWindow } from './types';

/**
 * Kadans penceresi: end = koşu anı. monthly JS `setUTCMonth` kullanır —
 * ay sonu taşması (31 Mar − 1 ay → 3 Mar) bilinen JS davranışı, personel
 * özeti için kabul (spec). Bilinmeyen kadans aylık sayılır — sessiz hata
 * yok, `nextPlannedRun` ile aynı tavır (lib/report-schedule.ts).
 */
export function reportWindow(cadence: string, end: Date): ReportWindow {
  const start = new Date(end);
  if (cadence === 'daily') start.setUTCDate(start.getUTCDate() - 1);
  else if (cadence === 'weekly') start.setUTCDate(start.getUTCDate() - 7);
  else start.setUTCMonth(start.getUTCMonth() - 1);
  return { start, end: new Date(end) };
}

/** Konu satırı ve digest başlığı için: `2026-08-14 → 2026-08-21` (UTC gün). */
export function windowLabel(window: ReportWindow): string {
  const day = (d: Date) => d.toISOString().slice(0, 10);
  return `${day(window.start)} → ${day(window.end)}`;
}
