import { buildCommandCenter } from './builders/command-center';
import { buildCustomerHealth } from './builders/customer-health';
import { buildProductActivation } from './builders/product-activation';
import { buildRevenueCollections } from './builders/revenue-collections';
import { buildSecurityEvidence } from './builders/security-evidence';
import { buildSupportOperations } from './builders/support-operations';
import type { ReportBuilder } from './types';

/**
 * Koşturulabilir raporlar — REPORT_LIBRARY'deki 6 'ready' rapor
 * (2026-08-22: `support-operations` kaynağı geldi, 'partial'dan çıktı).
 */
export const REPORT_BUILDERS: Record<string, ReportBuilder> = {
  'command-center': buildCommandCenter,
  'revenue-collections': buildRevenueCollections,
  'product-activation': buildProductActivation,
  'customer-health': buildCustomerHealth,
  'security-evidence': buildSecurityEvidence,
  'support-operations': buildSupportOperations,
};

/**
 * Tablo çıktısı OLMAYAN raporlar — yalnız `sections`, `table` yok. CSV
 * formatıyla zamanlanamazlar (`admin.ts createReportSchedule` bekçisi).
 */
export const TABLELESS_REPORTS: readonly string[] = ['command-center'];
