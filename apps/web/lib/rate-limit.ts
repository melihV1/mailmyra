interface RateWindow {
  start: number;
  count: number;
}

const DEFAULT_MAX_KEYS = 10_000;

/** Bellek içi sabit pencere. Tek Node süreci varsayımı (spec'e kayıtlı). */
export function createRateLimiter(opts: { limit: number; windowMs: number; maxKeys?: number }) {
  const maxKeys = opts.maxKeys ?? DEFAULT_MAX_KEYS;
  const windows = new Map<string, RateWindow>();

  function sweepExpired(now: number): void {
    for (const [key, w] of windows) {
      if (now - w.start >= opts.windowMs) {
        windows.delete(key);
      }
    }
  }

  return {
    check(key: string, now: number): boolean {
      if (opts.limit <= 0) return false;

      const w = windows.get(key);
      let allowed: boolean;
      if (!w || now - w.start >= opts.windowMs) {
        windows.set(key, { start: now, count: 1 });
        allowed = true;
      } else if (w.count >= opts.limit) {
        allowed = false;
      } else {
        w.count += 1;
        allowed = true;
      }

      if (windows.size > maxKeys) {
        sweepExpired(now);
      }

      return allowed;
    },
    size(): number {
      return windows.size;
    },
  };
}
