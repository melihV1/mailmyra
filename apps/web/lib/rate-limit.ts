interface RateWindow {
  start: number;
  count: number;
}

const DEFAULT_MAX_KEYS = 10_000;

/**
 * Bellek içi sabit pencere. Tek Node süreci varsayımı (spec'e kayıtlı).
 *
 * Bellek sınırı sert bir tavan (hard cap) ile sağlanır: `maxKeys`'e
 * ulaşıldığında, haritada henüz bulunmayan YENİ bir anahtar eklenmeden önce
 * en eski kayıt (Map'in insertion-order'ına göre, `keys().next().value`) O(1)
 * silinir. Süresi dolmuş kayıtları arayan bir süpürme YAPILMAZ — çoklu-IP
 * saldırısı gibi sürekli yüksek anahtar çeşitliliği altında hiçbir kayıt
 * süresi dolmadığı için böyle bir süpürme hiçbir şey silmez ve her istekte
 * O(n) tarama yapardı. Trade-off: baskı altında en eski anahtar, penceresi
 * henüz dolmamış olsa bile silinip sayacı sıfırlanabilir (canlı bir sayaç
 * erken reset olabilir). MVP ölçeğinde kabul edilir; karşılığında bellek
 * KESİN olarak `maxKeys` ile sınırlı kalır ve `check()` her zaman O(1)'dir.
 */
export function createRateLimiter(opts: { limit: number; windowMs: number; maxKeys?: number }) {
  const maxKeys = opts.maxKeys ?? DEFAULT_MAX_KEYS;
  const windows = new Map<string, RateWindow>();

  return {
    check(key: string, now: number): boolean {
      if (opts.limit <= 0) return false;

      const w = windows.get(key);
      let allowed: boolean;
      if (!w || now - w.start >= opts.windowMs) {
        if (!w && windows.size >= maxKeys) {
          const oldestKey = windows.keys().next().value;
          if (oldestKey !== undefined) windows.delete(oldestKey);
        }
        windows.set(key, { start: now, count: 1 });
        allowed = true;
      } else if (w.count >= opts.limit) {
        allowed = false;
      } else {
        w.count += 1;
        allowed = true;
      }

      return allowed;
    },
    size(): number {
      return windows.size;
    },
  };
}
