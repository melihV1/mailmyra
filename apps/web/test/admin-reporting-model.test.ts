import { describe, expect, it } from 'vitest';

import { getReportCoverage, REPORT_LIBRARY, summarizeSchedules, type ReportSchedule } from '../app/(admin)/reporting-model';

const NOW = Date.UTC(2026, 7, 20, 9, 0);

describe('admin reporting model', () => {
  it('reports source coverage without treating partial definitions as ready', () => {
    // 2026-08-22: support-operations kaynağı geldi, 6/6 'ready' oldu.
    expect(getReportCoverage(REPORT_LIBRARY)).toEqual({ ready: 6, partial: 0, percent: 100 });
  });

  it('summarizes delivery state and next-day workload', () => {
    const rows: ReportSchedule[] = [
      { id: 'a', reportId: 'r', reportName: 'A', cadence: 'daily', nextRunAt: new Date(NOW + 60 * 60 * 1000).toISOString(), recipients: ['a@example.com'], format: 'CSV', owner: 'Ops', status: 'active', lastRunAt: null, lastRunStatus: null },
      { id: 'b', reportId: 'r', reportName: 'B', cadence: 'weekly', nextRunAt: new Date(NOW + 48 * 60 * 60 * 1000).toISOString(), recipients: ['b@example.com'], format: 'PDF', owner: 'Ops', status: 'attention', lastRunAt: new Date(NOW).toISOString(), lastRunStatus: 'failed' },
    ];
    expect(summarizeSchedules(rows, NOW)).toEqual({ total: 2, active: 1, attention: 1, next24h: 1 });
  });
});
