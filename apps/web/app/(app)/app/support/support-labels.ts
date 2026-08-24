import type { CustomerCaseCategory, CustomerCaseStatus } from '../../../../lib/repo/support';

/**
 * Ticket v1 etiketleri. Durumun MÜŞTERİ dili dürüst ama iç jargonsuz:
 * `escalated` müşteriye "In progress" — vaka işleniyor gerçeği söylenir,
 * iç eskalasyon mutfağı anlatılmaz (spec §2.4).
 */
export const TICKET_CATEGORIES: ReadonlyArray<{ value: CustomerCaseCategory; label: string }> = [
  { value: 'billing', label: 'Billing' },
  { value: 'builder', label: 'Builder' },
  { value: 'export', label: 'Export' },
  { value: 'access', label: 'Access' },
  { value: 'account', label: 'Account' },
];

export const CASE_STATUS_LOOKS: Record<CustomerCaseStatus, { label: string; tone: string }> = {
  open: { label: 'Open', tone: 'info' },
  waiting_customer: { label: 'Awaiting your reply', tone: 'warning' },
  escalated: { label: 'In progress', tone: 'primary' },
  resolved: { label: 'Resolved', tone: 'success' },
};
