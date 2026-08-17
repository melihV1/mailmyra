import { describe, expect, it } from 'vitest';

import {
  EMPTY_FILTERS,
  filterSignatures,
  hasActiveFilters,
  templateOptions,
  type SignatureFilterState,
} from '../lib/signature-filter';

const row = (
  id: string,
  name: string,
  templateId: string,
  day: number,
  senderId: string | null = null,
) => ({ id, name, templateId, updatedAt: new Date(2026, 7, day), senderId });

const state = (patch: Partial<SignatureFilterState> = {}): SignatureFilterState => ({
  ...EMPTY_FILTERS,
  ...patch,
});

const ids = (rows: Array<{ id: string }>) => rows.map((r) => r.id);

const ROWS = [
  row('a', 'Sales EU', 'classic-horizontal', 3, 's1'),
  row('b', 'Support', 'stacked-minimal', 1),
  row('c', 'sales US', 'classic-horizontal', 2, 's2'),
];

describe('filterSignatures', () => {
  it('defaults to newest first and keeps every row', () => {
    expect(ids(filterSignatures(ROWS, EMPTY_FILTERS))).toEqual(['a', 'c', 'b']);
  });

  it('sorts oldest first and by name A–Z', () => {
    expect(ids(filterSignatures(ROWS, state({ sort: 'oldest' })))).toEqual(['b', 'c', 'a']);
    // Ad sıralaması harf büyüklüğüne takılmamalı: "sales US" < "Support".
    expect(ids(filterSignatures(ROWS, state({ sort: 'name' })))).toEqual(['a', 'c', 'b']);
  });

  it('searches the name case-insensitively', () => {
    expect(ids(filterSignatures(ROWS, state({ query: '  SALES ' })))).toEqual(['a', 'c']);
  });

  it('searches the template name too', () => {
    expect(ids(filterSignatures(ROWS, state({ query: 'stacked' })))).toEqual(['b']);
  });

  it('splits assigned from unassigned', () => {
    expect(ids(filterSignatures(ROWS, state({ assignment: 'assigned' })))).toEqual(['a', 'c']);
    expect(ids(filterSignatures(ROWS, state({ assignment: 'unassigned' })))).toEqual(['b']);
  });

  it('narrows to one template', () => {
    expect(ids(filterSignatures(ROWS, state({ templateId: 'stacked-minimal' })))).toEqual(['b']);
  });

  it('applies every filter at once', () => {
    const out = filterSignatures(
      ROWS,
      state({ query: 'sales', assignment: 'assigned', templateId: 'classic-horizontal' }),
    );
    expect(ids(out)).toEqual(['a', 'c']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterSignatures(ROWS, state({ query: 'nope' }))).toEqual([]);
  });

  it('never reorders the array it was given', () => {
    const input = [...ROWS];
    filterSignatures(input, state({ sort: 'oldest' }));
    expect(ids(input)).toEqual(['a', 'b', 'c']);
  });
});

describe('templateOptions', () => {
  it('lists each template once, alphabetically', () => {
    expect(templateOptions(ROWS)).toEqual(['classic-horizontal', 'stacked-minimal']);
  });
});

describe('hasActiveFilters', () => {
  it('ignores sorting — a sort choice is not something to clear', () => {
    expect(hasActiveFilters(state({ sort: 'name' }))).toBe(false);
  });

  it('sees search, assignment and template', () => {
    expect(hasActiveFilters(state({ query: 'x' }))).toBe(true);
    expect(hasActiveFilters(state({ assignment: 'unassigned' }))).toBe(true);
    expect(hasActiveFilters(state({ templateId: 'stacked-minimal' }))).toBe(true);
  });

  it('treats whitespace-only search as empty', () => {
    expect(hasActiveFilters(state({ query: '   ' }))).toBe(false);
  });
});
