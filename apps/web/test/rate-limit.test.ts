import { describe, it, expect } from 'vitest';
import { createRateLimiter } from '../lib/rate-limit';

describe('createRateLimiter', () => {
  it('allows up to limit within the window, then rejects', () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 3_600_000 });
    const t0 = 1_000_000;
    expect(rl.check('1.2.3.4', t0)).toBe(true);
    expect(rl.check('1.2.3.4', t0 + 1)).toBe(true);
    expect(rl.check('1.2.3.4', t0 + 2)).toBe(true);
    expect(rl.check('1.2.3.4', t0 + 3)).toBe(false);
  });
  it('resets after the window passes', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(rl.check('a', 0)).toBe(true);
    expect(rl.check('a', 500)).toBe(false);
    expect(rl.check('a', 1001)).toBe(true);
  });
  it('tracks keys independently', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(rl.check('a', 0)).toBe(true);
    expect(rl.check('b', 0)).toBe(true);
  });
  it('rejects even the first request when limit is 0', () => {
    const rl = createRateLimiter({ limit: 0, windowMs: 1000 });
    expect(rl.check('a', 0)).toBe(false);
    expect(rl.check('a', 1)).toBe(false);
    expect(rl.check('a', 2000)).toBe(false);
  });
  it('sweeps expired entries once the map exceeds maxKeys, bounding memory', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 2 });
    expect(rl.check('a', 0)).toBe(true);
    expect(rl.check('b', 0)).toBe(true);
    expect(rl.size()).toBe(2);
    // Both 'a' and 'b' windows expire by t=1000. A 3rd key pushes size past
    // maxKeys, which should trigger a sweep of expired entries.
    expect(rl.check('c', 1000)).toBe(true);
    // 'a' and 'b' were expired at the time of the sweep and should have been
    // evicted, leaving only 'c'.
    expect(rl.size()).toBe(1);
    // Evicted keys behave as fresh: allowed again despite limit: 1.
    expect(rl.check('a', 1000)).toBe(true);
  });
});
