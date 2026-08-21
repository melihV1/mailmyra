import type { PrismaClient } from '@prisma/client';

/**
 * Rapor veri katmanı — admin.ts'i KULLANMAZ (tasarım 2026-08-21):
 * numaralandırma testi her admin export'undan personel kapısı bekler,
 * çalıştırıcının personel oturumu yok. Builder'lar Prisma'ya doğrudan sorar.
 *
 * İÇERİK SINIRI (sert kural): rapora müşteri kişisel verisi ASLA girmez —
 * üye/gönderici e-postası, kişi adı, imza içeriği yok. İzinli: agregalar +
 * org düzeyi ticari veri (org adı, koltuk, fatura tutarı — listLeads emsali).
 */
export type ReportsDb = PrismaClient;

export interface ReportWindow {
  start: Date;
  end: Date;
}

export interface ReportSectionItem {
  label: string;
  value: string;
}

export interface ReportSection {
  heading: string;
  items: ReportSectionItem[];
}

export interface ReportTable {
  columns: string[];
  rows: Array<Array<string | number>>;
}

export interface ReportResult {
  reportId: string;
  /** REPORT_LIBRARY'deki adla aynı (reporting-model.ts). */
  title: string;
  window: ReportWindow;
  sections: ReportSection[];
  /** CSV eki için; yoksa csv formatlı zamanlama dürüstçe 'failed' olur. */
  table?: ReportTable;
}

export type ReportBuilder = (db: ReportsDb, window: ReportWindow) => Promise<ReportResult>;

/** ReportExecution.rowCount: tablo varsa satır sayısı, yoksa özet kalemleri. */
export function countRows(report: ReportResult): number {
  return report.table
    ? report.table.rows.length
    : report.sections.reduce((n, s) => n + s.items.length, 0);
}
