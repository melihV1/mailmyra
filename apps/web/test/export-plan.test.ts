import { describe, expect, it } from 'vitest';

import { exportPlan } from '../lib/export-plan';

const row = (
  id: string,
  status: 'draft' | 'active' | 'inactive',
  signatureNames: string[] = [],
) => ({ id, status, signatureNames });

describe('exportPlan', () => {
  it('with no selection, scopes to live senders and counts their files', () => {
    const plan = exportPlan(
      [row('a', 'active', ['X']), row('b', 'active', ['X', 'Y']), row('c', 'draft', ['X'])],
      [],
    );
    // Taslak kapsama hiç girmez (kapı: export yalnız yayındakine).
    expect(plan).toEqual({ senderCount: 2, fileCount: 3, unassigned: 0, unpublished: 0 });
  });

  it('counts live-but-unassigned senders as skipped', () => {
    const plan = exportPlan([row('a', 'active', ['X']), row('b', 'active')], []);
    expect(plan).toEqual({ senderCount: 1, fileCount: 1, unassigned: 1, unpublished: 0 });
  });

  it('with a selection, scopes to it and reports non-live picks', () => {
    const plan = exportPlan(
      [row('a', 'active', ['X']), row('b', 'draft', ['X']), row('c', 'inactive', ['X'])],
      ['a', 'b', 'c'],
    );
    expect(plan).toEqual({ senderCount: 1, fileCount: 1, unassigned: 0, unpublished: 2 });
  });

  it('ignores unselected rows entirely when a selection exists', () => {
    const plan = exportPlan([row('a', 'active', ['X']), row('b', 'active', ['X'])], ['a']);
    expect(plan).toEqual({ senderCount: 1, fileCount: 1, unassigned: 0, unpublished: 0 });
  });
});
