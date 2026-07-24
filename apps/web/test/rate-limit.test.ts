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
});
