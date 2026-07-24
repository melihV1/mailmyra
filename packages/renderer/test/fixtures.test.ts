import { describe, it, expect } from 'vitest';
import { fixtures } from '../src/fixtures/samples';

describe('fixtures', () => {
  it('exposes the full and minimal presets', () => {
    const ids = fixtures.map((f) => f.id);
    expect(ids).toContain('full');
    expect(ids).toContain('minimal');
  });
  it('every fixture has a non-empty name and a unique id', () => {
    const ids = new Set<string>();
    for (const f of fixtures) {
      expect(f.data.identity.fullName.length).toBeGreaterThan(0);
      expect(ids.has(f.id)).toBe(false);
      ids.add(f.id);
    }
  });
});
