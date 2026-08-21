import type { GrowthLeadRow } from '../../(admin)/growth-analytics-model';
import { productPreviewNow } from './product-fixtures';

const day = 86_400_000;
const iso = (offset: number) => new Date(productPreviewNow + offset * day).toISOString();

export const growthPreviewLeads: GrowthLeadRow[] = [
  { id: 'l1', company: 'Mosaic Works', contact: 'Amelia Reed', source: 'Demo form', seats: 32, stage: 'new', createdAt: iso(-1), nextStep: 'Initial qualification' },
  { id: 'l2', company: 'Kite & Form', contact: 'Daniel Brooks', source: 'Referral', seats: 14, stage: 'new', createdAt: iso(-2), nextStep: 'Confirm team size' },
  { id: 'l3', company: 'Grayline Studio', contact: 'Mina Cole', source: 'Pricing page', seats: 48, stage: 'qualified', createdAt: iso(-5), nextStep: 'Share security pack' },
  { id: 'l4', company: 'Oriel Partners', contact: 'Jonas Hart', source: 'Contact form', seats: 85, stage: 'qualified', createdAt: iso(-7), nextStep: 'Map agency structure' },
  { id: 'l5', company: 'Alpine Freight', contact: 'Selin Moore', source: 'Demo form', seats: 120, stage: 'scheduled', createdAt: iso(-9), nextStep: 'Demo · 22 Aug, 14:00' },
  { id: 'l6', company: 'Juniper North', contact: 'Robert Lane', source: 'Partner', seats: 27, stage: 'scheduled', createdAt: iso(-11), nextStep: 'Demo · 23 Aug, 10:30' },
  { id: 'l7', company: 'Orchard Labs', contact: 'Nora Miles', source: 'Referral', seats: 64, stage: 'won', createdAt: iso(-24), nextStep: 'Handoff to onboarding' },
];
