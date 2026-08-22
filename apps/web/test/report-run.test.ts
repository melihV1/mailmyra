import { describe, expect, it } from 'vitest';

import { MemoryMailer } from '../lib/mail/memory';
import { runDueReports } from '../lib/reports/run';
import type { ReportBuilder, ReportsDb } from '../lib/reports/types';

const NOW = new Date(Date.UTC(2026, 7, 21, 7, 15));

const okBuilder: ReportBuilder = async (_db, window) => ({
  reportId: 'test-report',
  title: 'Test report',
  window,
  sections: [{ heading: 'S', items: [{ label: 'A', value: '1' }] }],
  table: { columns: ['C'], rows: [['x'], ['y']] },
});

const tablelessBuilder: ReportBuilder = async (_db, window) => ({
  reportId: 'test-report',
  title: 'Test report',
  window,
  sections: [{ heading: 'S', items: [{ label: 'A', value: '1' }] }],
});

interface Schedule {
  id: string;
  reportId: string;
  cadence: string;
  format: string;
  recipients: Array<{ email: string }>;
}

/** Rapor defterlerini kaydeden sahte db. */
function fakeDb(schedules: Schedule[]) {
  let seq = 0;
  const executions: Array<Record<string, unknown> & { id: string }> = [];
  const deliveries: Array<Record<string, unknown>> = [];
  const scheduleUpdates: Array<{ where: { id: string }; data: { nextRunAt: Date } }> = [];
  let findManyArgs: unknown;

  const db = {
    reportSchedule: {
      findMany: (args: unknown) => {
        findManyArgs = args;
        return Promise.resolve(schedules);
      },
      update: (args: { where: { id: string }; data: { nextRunAt: Date } }) => {
        scheduleUpdates.push(args);
        return Promise.resolve({});
      },
    },
    reportExecution: {
      create: (args: { data: Record<string, unknown> }) => {
        const row = { id: `e${++seq}`, ...args.data };
        executions.push(row);
        return Promise.resolve({ id: row.id });
      },
      update: (args: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = executions.find((e) => e.id === args.where.id);
        if (row) Object.assign(row, args.data);
        return Promise.resolve(row);
      },
    },
    reportDelivery: {
      create: (args: { data: Record<string, unknown> }) => {
        deliveries.push(args.data);
        return Promise.resolve(args.data);
      },
    },
  };
  return {
    db: db as unknown as ReportsDb,
    executions,
    deliveries,
    scheduleUpdates,
    getFindManyArgs: () => findManyArgs,
  };
}

const schedule = (over: Partial<Schedule> = {}): Schedule => ({
  id: 's1',
  reportId: 'test-report',
  cadence: 'weekly',
  format: 'digest',
  recipients: [{ email: 'mail@voldi.net' }],
  ...over,
});

const BUILDERS = { 'test-report': okBuilder };

describe('runDueReports', () => {
  it('selects only active schedules that are due or never planned', async () => {
    const f = fakeDb([]);
    await runDueReports({ db: f.db, mailer: new MemoryMailer(), now: NOW, builders: BUILDERS });

    expect(f.getFindManyArgs()).toMatchObject({
      where: { status: 'active', OR: [{ nextRunAt: null }, { nextRunAt: { lte: NOW } }] },
    });
  });

  it('runs a digest schedule end to end', async () => {
    const f = fakeDb([schedule()]);
    const mailer = new MemoryMailer();

    const summary = await runDueReports({ db: f.db, mailer, now: NOW, builders: BUILDERS });

    expect(summary).toEqual({ processed: 1, succeeded: 1, failed: 0 });
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]!.to).toBe('mail@voldi.net');
    expect(mailer.sent[0]!.kind).toBe('report');
    expect(mailer.sent[0]!.subject).toContain('Test report');
    expect(mailer.sent[0]!.attachments).toBeUndefined();

    expect(f.executions[0]).toMatchObject({ status: 'success', rowCount: 2, error: null });
    expect(f.deliveries).toEqual([
      { executionId: 'e1', recipientEmail: 'mail@voldi.net', status: 'sent', detail: null },
    ]);
    // nextRunAt her denemede ilerler — haftalık: bir sonraki Pazartesi 07:00 UTC.
    expect(f.scheduleUpdates).toHaveLength(1);
    expect(f.scheduleUpdates[0]!.data.nextRunAt.getTime()).toBeGreaterThan(NOW.getTime());
  });

  it('attaches the CSV for csv-format schedules', async () => {
    const f = fakeDb([schedule({ format: 'csv' })]);
    const mailer = new MemoryMailer();

    await runDueReports({ db: f.db, mailer, now: NOW, builders: BUILDERS });

    const att = mailer.sent[0]!.attachments;
    expect(att).toHaveLength(1);
    expect(att?.[0]!.filename).toBe('test-report-2026-08-21.csv');
    expect(att?.[0]!.contentType).toBe('text/csv');
    expect(att?.[0]!.content).toBe('C\r\nx\r\ny\r\n');
  });

  it('fails honestly: pdf format', async () => {
    const f = fakeDb([schedule({ format: 'pdf' })]);
    const summary = await runDueReports({ db: f.db, mailer: new MemoryMailer(), now: NOW, builders: BUILDERS });

    expect(summary.failed).toBe(1);
    expect(f.executions[0]).toMatchObject({ status: 'failed', error: 'format not implemented: pdf' });
    expect(f.scheduleUpdates).toHaveLength(1); // yine ilerler — fırtına yok
  });

  it('fails honestly: unknown report id', async () => {
    const f = fakeDb([schedule({ reportId: 'support-operations' })]);
    await runDueReports({ db: f.db, mailer: new MemoryMailer(), now: NOW, builders: BUILDERS });

    expect(f.executions[0]).toMatchObject({ status: 'failed', error: 'unknown report: support-operations' });
  });

  it('fails honestly: csv without tabular output', async () => {
    const f = fakeDb([schedule({ format: 'csv' })]);
    await runDueReports({
      db: f.db,
      mailer: new MemoryMailer(),
      now: NOW,
      builders: { 'test-report': tablelessBuilder },
    });

    expect(f.executions[0]).toMatchObject({ status: 'failed', error: 'report has no tabular output' });
  });

  it('fails honestly: no recipients', async () => {
    const f = fakeDb([schedule({ recipients: [] })]);
    await runDueReports({ db: f.db, mailer: new MemoryMailer(), now: NOW, builders: BUILDERS });

    expect(f.executions[0]).toMatchObject({ status: 'failed', error: 'schedule has no recipients' });
  });

  it('partial delivery failure marks the run failed but records every delivery', async () => {
    const f = fakeDb([
      schedule({ recipients: [{ email: 'iyi@voldi.net' }, { email: 'kotu@voldi.net' }] }),
    ]);
    const mailer = new MemoryMailer();
    const flaky = {
      kind: 'memory' as const,
      send: async (m: Parameters<MemoryMailer['send']>[0]) => {
        if (m.to === 'kotu@voldi.net') throw new Error('smtp down');
        return mailer.send(m);
      },
    };

    const summary = await runDueReports({ db: f.db, mailer: flaky, now: NOW, builders: BUILDERS });

    expect(summary.failed).toBe(1);
    expect(f.deliveries).toEqual([
      expect.objectContaining({ recipientEmail: 'iyi@voldi.net', status: 'sent' }),
      expect.objectContaining({ recipientEmail: 'kotu@voldi.net', status: 'failed', detail: 'smtp down' }),
    ]);
    expect(f.executions[0]).toMatchObject({ status: 'failed', error: '1 of 2 deliveries failed' });
  });

  it('isolates schedules: one failure does not stop the next', async () => {
    const f = fakeDb([schedule({ id: 's1', reportId: 'yok' }), schedule({ id: 's2' })]);
    const summary = await runDueReports({ db: f.db, mailer: new MemoryMailer(), now: NOW, builders: BUILDERS });

    expect(summary).toEqual({ processed: 2, succeeded: 1, failed: 1 });
    expect(f.executions.map((e) => e.status)).toEqual(['failed', 'success']);
    expect(f.scheduleUpdates.map((u) => u.where.id)).toEqual(['s1', 's2']);
  });

  it('dry-run builds but writes nothing and sends nothing', async () => {
    const f = fakeDb([schedule()]);
    const mailer = new MemoryMailer();

    const summary = await runDueReports({ db: f.db, mailer, now: NOW, dryRun: true, builders: BUILDERS });

    expect(summary).toEqual({ processed: 1, succeeded: 1, failed: 0 });
    expect(mailer.sent).toEqual([]);
    expect(f.executions).toEqual([]);
    expect(f.deliveries).toEqual([]);
    expect(f.scheduleUpdates).toEqual([]);
  });

  it('the default registry serves all six ready reports', async () => {
    const { REPORT_BUILDERS } = await import('../lib/reports/registry');
    expect(Object.keys(REPORT_BUILDERS).sort()).toEqual([
      'command-center',
      'customer-health',
      'product-activation',
      'revenue-collections',
      'security-evidence',
      'support-operations',
    ]);
  });
});
