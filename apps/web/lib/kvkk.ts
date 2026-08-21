/**
 * KVKK saf matematiği — admin.ts'te olamaz (numaralandırma testi her
 * export'tan personel kapısı bekler; report-schedule.ts emsali).
 * Kanuni yanıt süresi: KVKK md. 13 — başvurudan itibaren 30 gün.
 */
export const KVKK_STATUTORY_DAYS = 30;

export function statutoryDueDate(receivedAt: Date): Date {
  return new Date(receivedAt.getTime() + KVKK_STATUTORY_DAYS * 24 * 60 * 60 * 1000);
}
