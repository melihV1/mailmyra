interface Window {
  start: number;
  count: number;
}

/** Bellek içi sabit pencere. Tek Node süreci varsayımı (spec'e kayıtlı). */
export function createRateLimiter(opts: { limit: number; windowMs: number }) {
  const windows = new Map<string, Window>();
  return {
    check(key: string, now: number): boolean {
      const w = windows.get(key);
      if (!w || now - w.start >= opts.windowMs) {
        windows.set(key, { start: now, count: 1 });
        return true;
      }
      if (w.count >= opts.limit) return false;
      w.count += 1;
      return true;
    },
  };
}
