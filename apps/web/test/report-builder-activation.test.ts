import { describe, expect, it } from 'vitest';

import { buildProductActivation } from '../lib/reports/builders/product-activation';
import type { ReportsDb } from '../lib/reports/types';

const WINDOW = {
  start: new Date(Date.UTC(2026, 7, 14, 7, 15)),
  end: new Date(Date.UTC(2026, 7, 21, 7, 15)),
};

function fakeDb(overrides: { orgs?: unknown[]; sig?: unknown[]; pub?: unknown[]; exp?: unknown[] } = {}) {
  const calls: Record<string, unknown[]> = {};
  const capture = (name: string, value: unknown) => (args: unknown) => {
    (calls[name] ??= []).push(args);
    return Promise.resolve(value);
  };
  const db = {
    organization: {
      findMany: capture(
        'organization.findMany',
        overrides.orgs ?? [
          { id: 'o1', name: 'Acme', createdAt: new Date(Date.UTC(2026, 7, 15)) },
          { id: 'o2', name: 'Beta', createdAt: new Date(Date.UTC(2026, 7, 16)) },
          { id: 'o3', name: 'Cadde', createdAt: new Date(Date.UTC(2026, 7, 17)) },
          { id: 'o4', name: 'Dost', createdAt: new Date(Date.UTC(2026, 7, 18)) },
        ],
      ),
    },
    signature: { findMany: capture('signature.findMany', overrides.sig ?? [{ orgId: 'o1' }, { orgId: 'o2' }]) },
    senderIdentity: { findMany: capture('senderIdentity.findMany', overrides.pub ?? [{ orgId: 'o1' }]) },
    activityEvent: { findMany: capture('activityEvent.findMany', overrides.exp ?? [{ orgId: 'o1' }]) },
  };
  return { db: db as unknown as ReportsDb, calls };
}

describe('buildProductActivation', () => {
  it('computes cohort funnel with fixed denominators (KPI: activation-rate, export-evidence)', async () => {
    const { db } = fakeDb();
    const report = await buildProductActivation(db, WINDOW);

    const items = report.sections[0]!.items;
    expect(items).toContainEqual({ label: 'Workspaces created', value: '4' });
    expect(items).toContainEqual({ label: 'With saved signature', value: '2' });
    expect(items).toContainEqual({ label: 'With published sender', value: '1' });
    expect(items).toContainEqual({ label: 'With export evidence', value: '1' });
    expect(items).toContainEqual({ label: 'Activation rate', value: '50%' }); // 2/4, payda kohort
    expect(items).toContainEqual({ label: 'Export evidence rate', value: '50%' }); // 1/2, payda aktive
  });

  it('renders per-org yes/no rows', async () => {
    const { db } = fakeDb();
    const report = await buildProductActivation(db, WINDOW);

    expect(report.table?.columns).toEqual(['Organization', 'Created', 'Signature', 'Published', 'Export']);
    expect(report.table?.rows[0]).toEqual(['Acme', '2026-08-15', 'yes', 'yes', 'yes']);
    expect(report.table?.rows[2]).toEqual(['Cadde', '2026-08-17', 'no', 'no', 'no']);
  });

  it('handles the empty cohort without dividing by zero', async () => {
    const { db } = fakeDb({ orgs: [], sig: [], pub: [], exp: [] });
    const report = await buildProductActivation(db, WINDOW);

    expect(report.sections[0]!.items).toContainEqual({ label: 'Activation rate', value: '—' });
    expect(report.table?.rows).toEqual([]);
  });

  it('content boundary: sender/signature/export queries select ONLY orgId', async () => {
    const { db, calls } = fakeDb();
    await buildProductActivation(db, WINDOW);

    for (const name of ['signature.findMany', 'senderIdentity.findMany', 'activityEvent.findMany']) {
      const args = calls[name]?.[0] as { select: Record<string, unknown> };
      expect(Object.keys(args!.select)).toEqual(['orgId']);
    }
    const exportArgs = calls['activityEvent.findMany']?.[0] as { where: { type: unknown } };
    expect(exportArgs!.where.type).toEqual({ startsWith: 'export.' });
  });
});
