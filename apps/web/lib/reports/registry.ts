import { buildCommandCenter } from './builders/command-center';
import { buildCustomerHealth } from './builders/customer-health';
import { buildProductActivation } from './builders/product-activation';
import { buildRevenueCollections } from './builders/revenue-collections';
import { buildSecurityEvidence } from './builders/security-evidence';
import type { ReportBuilder } from './types';

/**
 * Koşturulabilir raporlar — REPORT_LIBRARY'deki 5 'ready' rapor.
 * `support-operations` BİLİNÇLİ yok: kaynağı 'partial' (reporting-model.ts);
 * zamanlanırsa çalıştırıcı dürüstçe "unknown report" der.
 */
export const REPORT_BUILDERS: Record<string, ReportBuilder> = {
  'command-center': buildCommandCenter,
  'revenue-collections': buildRevenueCollections,
  'product-activation': buildProductActivation,
  'customer-health': buildCustomerHealth,
  'security-evidence': buildSecurityEvidence,
};
