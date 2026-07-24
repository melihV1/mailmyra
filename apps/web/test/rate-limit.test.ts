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
  it('evicts the oldest key once size reaches maxKeys, keeping size bounded', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 2 });
    expect(rl.check('a', 0)).toBe(true);
    expect(rl.check('b', 0)).toBe(true);
    expect(rl.size()).toBe(2);
    // Neither 'a' nor 'b' has expired (windowMs: 1000, still at t=0), so a
    // sweep-of-expired-entries mechanism would evict nothing here. The hard
    // cap must still bound memory regardless: inserting a 3rd distinct key
    // evicts the oldest entry ('a', inserted first) to make room.
    expect(rl.check('c', 0)).toBe(true);
    expect(rl.size()).toBe(2);
    // Evicted key 'a' behaves as fresh: allowed again despite limit: 1 and
    // no time having passed.
    expect(rl.check('a', 0)).toBe(true);
    expect(rl.size()).toBe(2);
  });
  it('never evicts when re-checking keys already in the map', () => {
    const rl = createRateLimiter({ limit: 5, windowMs: 1000, maxKeys: 2 });
    expect(rl.check('a', 0)).toBe(true);
    expect(rl.check('b', 0)).toBe(true);
    expect(rl.size()).toBe(2);
    // Map is already at maxKeys. Re-checking existing keys within their
    // window must never trigger eviction, even at cap.
    expect(rl.check('a', 1)).toBe(true);
    expect(rl.check('b', 2)).toBe(true);
    expect(rl.size()).toBe(2);
    expect(rl.check('a', 3)).toBe(true);
    expect(rl.check('b', 4)).toBe(true);
    expect(rl.size()).toBe(2);
  });
});
