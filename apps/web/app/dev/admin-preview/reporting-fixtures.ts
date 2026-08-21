import type { ReportSchedule } from '../../(admin)/reporting-model';

import { previewNow } from './operations-fixtures';

const hour = 60 * 60 * 1000;
const day = 24 * hour;
const iso = (value: number) => new Date(value).toISOString();

export const previewReportSchedules: ReportSchedule[] = [
  { id: 'rs-1', reportId: 'command-center', reportName: 'Executive command center', cadence: 'weekly', nextRunAt: iso(previewNow + 4 * hour), recipients: ['leadership@mailmyra.com'], format: 'PDF', owner: 'Operations', status: 'active', lastRunAt: iso(previewNow - 7 * day), lastRunStatus: 'success' },
  { id: 'rs-2', reportId: 'revenue-collections', reportName: 'Revenue & collections', cadence: 'daily', nextRunAt: iso(previewNow + 14 * hour), recipients: ['finance@mailmyra.com', 'operations@mailmyra.com'], format: 'CSV', owner: 'Finance', status: 'active', lastRunAt: iso(previewNow - day), lastRunStatus: 'success' },
  { id: 'rs-3', reportId: 'security-evidence', reportName: 'Security evidence pack', cadence: 'monthly', nextRunAt: iso(previewNow + 11 * day), recipients: ['security@mailmyra.com'], format: 'PDF', owner: 'Security', status: 'attention', lastRunAt: iso(previewNow - 19 * day), lastRunStatus: 'failed' },
  { id: 'rs-4', reportId: 'product-activation', reportName: 'Product activation', cadence: 'weekly', nextRunAt: iso(previewNow + 3 * day), recipients: ['product@mailmyra.com'], format: 'Email digest', owner: 'Product', status: 'active', lastRunAt: iso(previewNow - 4 * day), lastRunStatus: 'success' },
  { id: 'rs-5', reportId: 'customer-health', reportName: 'Customer health', cadence: 'weekly', nextRunAt: iso(previewNow + 5 * day), recipients: ['success@mailmyra.com'], format: 'Email digest', owner: 'Customer success', status: 'paused', lastRunAt: iso(previewNow - 12 * day), lastRunStatus: 'success' },
];
