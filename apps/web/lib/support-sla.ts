/**
 * Destek SLA saati — SAF, kapısız (admin repo'sunun numaralandırma testi
 * her export'tan personel kapısı beklediği için oradan ayrı yaşar;
 * kvkk.ts / report-schedule.ts emsali).
 */
export const SUPPORT_SLA_HOURS = { urgent: 4, high: 24, normal: 48, low: 120 } as const;

export type SupportPriority = keyof typeof SUPPORT_SLA_HOURS;

export function slaDueDate(from: Date, priority: SupportPriority): Date {
  return new Date(from.getTime() + SUPPORT_SLA_HOURS[priority] * 60 * 60 * 1000);
}
