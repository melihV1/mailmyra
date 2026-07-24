# Hafta 2 — Builder + Görsel Boru Hattı Implementasyon Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Step-tab builder, canlı önizleme, görsel yükleme + CDN boru hattı ve bayraklı export kapısını TDD ile kurmak.

**Architecture:** `apps/web` büyür: `/api/upload` route handler'ı (sharp işleme + FsStorageAdapter), saf lib modülleri (rate-limit, draft, export-gate, image-pipeline), `useReducer` tabanlı builder UI + iframe önizleme. `packages/renderer`'a yalnızca `contrastRatio` eklenir. Tüm iş mantığı saf/test-edilebilir modüllerde; React bileşenleri ince kalır.

**Tech Stack:** Mevcut stack + `sharp` (görsel işleme, apps/web bağımlılığı), vitest apps/web'e de eklenir.

## Global Constraints

- Bu makinede pnpm **`corepack pnpm ...`** olarak çağrılır (pnpm global kurulu değil).
- CLAUDE.md e-posta HTML kısıtları ve **Görsel Boyut Politikası** aynen geçerli: 5MB limit, kabul PNG/JPG/SVG, ret WebP/GIF, SVG→PNG zorunlu, 2x çıktı logo 360px/<60KB · avatar 180px/<40KB · el imzası 300px/<50KB, şeffaflık→PNG yoksa JPG, dosya adı benzersiz+değişmez (hash).
- Bütçe aşımı: **kabul et + `warning` alanı** (reddetme).
- Export: `ClipboardItem` + `text/html` (asla `writeText`); `EXPORT_REQUIRES_AUTH` bayrağı (varsayılan **true**; env'de `false` yazılıysa kapalı).
- Taslak: yalnızca metin + CDN URL (asla `data:`), 30 gün TTL, görünür kayıt göstergesi + temizle.
- Kontrast: `textColor` < **4.5** veya `mutedColor` < **3** → uyar; **hem `#ffffff` hem `#1a1a1a`** zemine karşı.
- `cleanup-orphans`: yalnızca elle, `--dry-run` destekli.
- sharp `limitInputPixels: 4096 * 4096`.
- Renderer saf kalır (DOM/React yok). TypeScript strict. Kod/commit İngilizce.
- Yeni şablon YAZILMAZ (Outlook Classic kararı).

---

### Task 1: `contrastRatio` (renderer)

**Files:**
- Modify: `packages/renderer/src/utils/color.ts`
- Modify: `packages/renderer/src/index.ts`
- Test: `packages/renderer/test/color.test.ts` (mevcut dosyaya ekleme)

**Interfaces:**
- Produces: `contrastRatio(a: string, b: string): number` — WCAG oranı 1..21, hex girdiler; `index.ts`'ten re-export edilir (builder kullanacak).

- [ ] **Step 1: Başarısız testi ekle** — `packages/renderer/test/color.test.ts` sonuna:

```ts
import { contrastRatio } from '../src/utils/color';

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });
  it('is 1 for identical colors', () => {
    expect(contrastRatio('#719ad1', '#719ad1')).toBeCloseTo(1, 5);
  });
  it('is symmetric', () => {
    expect(contrastRatio('#1a1a1a', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#1a1a1a'),
      5,
    );
  });
  it('brand blue on white is below 4.5 (known mid-contrast)', () => {
    const r = contrastRatio('#719ad1', '#ffffff');
    expect(r).toBeGreaterThan(2);
    expect(r).toBeLessThan(4.5);
  });
});
```

(Not: dosyanın başındaki mevcut import satırına `contrastRatio` eklenebilir; ayrı import da geçerlidir.)

- [ ] **Step 2: Kırmızıyı doğrula** — Run: `corepack pnpm --filter @mailmyra/renderer test color` → FAIL (`contrastRatio` export yok).

- [ ] **Step 3: Implementasyon** — `color.ts`'e ekle (mevcut `relativeLuminance` kullanılır):

```ts
/** WCAG 2.x kontrast oranı (1..21). Girdiler hex renk. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}
```

`packages/renderer/src/index.ts`'e ekle:

```ts
export { contrastRatio } from './utils/color';
```

- [ ] **Step 4: Yeşili doğrula** — Run: `corepack pnpm --filter @mailmyra/renderer test` → tümü PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/utils/color.ts packages/renderer/src/index.ts packages/renderer/test/color.test.ts
git commit -m "feat(renderer): add WCAG contrastRatio util"
```

---

### Task 2: apps/web vitest + `export-gate`

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/lib/export-gate.ts`
- Test: `apps/web/test/export-gate.test.ts`

**Interfaces:**
- Produces: `isExportGated(env?: NodeJS.ProcessEnv): boolean` — yalnızca `'false'` değeri kapıyı kapatır; her diğer durum (undefined dahil) **true**.

- [ ] **Step 1: vitest kurulumunu ekle** — `apps/web/package.json` scripts'e `"test": "vitest run"`, devDependencies'e `"vitest": "^3.0.0"` ekle. `apps/web/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['test/**/*.test.ts'] },
});
```

Run: `corepack pnpm install`

- [ ] **Step 2: Başarısız test** — `apps/web/test/export-gate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isExportGated } from '../lib/export-gate';

describe('isExportGated', () => {
  it('defaults to gated when env is missing', () => {
    expect(isExportGated({} as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
  it('is open only for the literal string false', () => {
    expect(isExportGated({ EXPORT_REQUIRES_AUTH: 'false' } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isExportGated({ EXPORT_REQUIRES_AUTH: 'FALSE' } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isExportGated({ EXPORT_REQUIRES_AUTH: 'true' } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(isExportGated({ EXPORT_REQUIRES_AUTH: '0' } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});
```

- [ ] **Step 3: Kırmızıyı doğrula** — Run: `corepack pnpm --filter web test` → FAIL (modül yok).

- [ ] **Step 4: Implementasyon** — `apps/web/lib/export-gate.ts`:

```ts
/** İş modeli kararı koda gömülmez: yalnızca 'false' kapıyı kapatır. */
export function isExportGated(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.EXPORT_REQUIRES_AUTH?.toLowerCase() !== 'false';
}
```

- [ ] **Step 5: Yeşil + commit**

Run: `corepack pnpm --filter web test` → PASS.

```bash
git add apps/web/package.json apps/web/vitest.config.ts apps/web/lib/export-gate.ts apps/web/test/export-gate.test.ts pnpm-lock.yaml
git commit -m "feat(web): add vitest and export gate flag"
```

---

### Task 3: `rate-limit`

**Files:**
- Create: `apps/web/lib/rate-limit.ts`
- Test: `apps/web/test/rate-limit.test.ts`

**Interfaces:**
- Produces: `createRateLimiter(opts: { limit: number; windowMs: number; maxKeys?: number }): { check(key: string, now: number): boolean; size(): number }` — `true` = izinli. Bellek içi sabit pencere. `maxKeys` (varsayılan `10_000`) map büyüklüğünü **sert bir tavan** ile sınırlar: haritada henüz bulunmayan yeni bir anahtar eklenmeden önce, `windows.size >= maxKeys` ise en eski kayıt (insertion-order, O(1)) silinir — süresi dolmuş kayıtları arayan bir süpürme YAPILMAZ (çoklu-IP baskısı altında hiçbir şey süresi dolmamış olabilir, bu yüzden süpürme gerçek bir sınır sağlamaz). `size()` map'teki anahtar sayısını döner (test/gözlemlenebilirlik için). `limit <= 0` ise `check` her zaman `false` döner.

- [ ] **Step 1: Başarısız test** — `apps/web/test/rate-limit.test.ts`:

```ts
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
```

- [ ] **Step 2: Kırmızıyı doğrula** — Run: `corepack pnpm --filter web test rate-limit` → FAIL (eski sweep tabanlı implementasyona karşı: "evicts the oldest key..." testi kırmızı — 3. anahtar eklenince map 3'e büyüyor, hiçbir kayıt süresi dolmadığı için süpürme hiçbir şey silmiyor, `size()` 2 yerine 3 dönüyor).

- [ ] **Step 3: Implementasyon** — `apps/web/lib/rate-limit.ts`:

```ts
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
```

- [ ] **Step 4: Yeşil + commit**

Run: `corepack pnpm --filter web test rate-limit` → PASS (6/6).

```bash
git add apps/web/lib/rate-limit.ts apps/web/test/rate-limit.test.ts
git commit -m "fix(web): bound rate limiter memory and honor zero limit"
```

---

### Task 4: `storage` (FsStorageAdapter + dirSize) + env iskeleti

**Files:**
- Create: `apps/web/lib/storage.ts`
- Create: `.env.example` (kök)
- Modify: `.gitignore` (kök) — `.env*.local` eklenir
- Test: `apps/web/test/storage.test.ts`

**Interfaces:**
- Produces:
  - `interface StorageAdapter { save(filename: string, buffer: Buffer): Promise<{ url: string }> }`
  - `class FsStorageAdapter implements StorageAdapter` — `constructor(writePath: string, publicUrl: string)`; var olan dosyayı **yeniden yazmaz** (değişmezlik), atomik dışlayıcı oluşturma (`wx`) ile TOCTOU'suz; `filename` bare basename olarak doğrulanır (yol ayırıcı veya `..` içeremez) — path traversal reddedilir.
  - `dirSizeBytes(dir: string): Promise<number>` — kota kontrolü için.
  - `getStorageAdapter(env?): FsStorageAdapter` — `CDN_WRITE_PATH`/`CDN_PUBLIC_URL` yoksa açıklayıcı hata fırlatır.

- [ ] **Step 1: Başarısız test** — `apps/web/test/storage.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FsStorageAdapter, dirSizeBytes, getStorageAdapter } from '../lib/storage';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mailmyra-storage-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('FsStorageAdapter', () => {
  it('writes the file and returns the public url', async () => {
    const adapter = new FsStorageAdapter(dir, 'https://cdn.mailmyra.com');
    const res = await adapter.save('a3f9c2e1.png', Buffer.from('img'));
    expect(res.url).toBe('https://cdn.mailmyra.com/a3f9c2e1.png');
    expect(readFileSync(join(dir, 'a3f9c2e1.png'), 'utf8')).toBe('img');
  });
  it('never overwrites an existing file (immutability)', async () => {
    const adapter = new FsStorageAdapter(dir, 'https://cdn.mailmyra.com');
    writeFileSync(join(dir, 'x.png'), 'original');
    await adapter.save('x.png', Buffer.from('new-content'));
    expect(readFileSync(join(dir, 'x.png'), 'utf8')).toBe('original');
  });
  it('creates the write path if missing', async () => {
    const nested = join(dir, 'deep/cdn');
    const adapter = new FsStorageAdapter(nested, 'https://cdn.mailmyra.com');
    await adapter.save('y.png', Buffer.from('z'));
    expect(existsSync(join(nested, 'y.png'))).toBe(true);
  });
});

describe('FsStorageAdapter — path traversal', () => {
  it('rejects a filename with a parent-directory segment', async () => {
    const adapter = new FsStorageAdapter(dir, 'https://cdn.mailmyra.com');
    await expect(adapter.save('../evil.png', Buffer.from('x'))).rejects.toThrow();
    expect(existsSync(join(dir, '..', 'evil.png'))).toBe(false);
  });
  it('rejects a filename containing a path separator', async () => {
    const adapter = new FsStorageAdapter(dir, 'https://cdn.mailmyra.com');
    await expect(adapter.save('a/b.png', Buffer.from('x'))).rejects.toThrow();
    expect(existsSync(join(dir, 'a', 'b.png'))).toBe(false);
  });
  it('rejects a filename that looks like an absolute path', async () => {
    const adapter = new FsStorageAdapter(dir, 'https://cdn.mailmyra.com');
    await expect(adapter.save('/abs.png', Buffer.from('x'))).rejects.toThrow();
    expect(existsSync(join(dir, 'abs.png'))).toBe(false);
  });
});

describe('FsStorageAdapter — atomic exclusive write (TOCTOU)', () => {
  it('resolves successfully and keeps the original content when the file already exists', async () => {
    const adapter = new FsStorageAdapter(dir, 'https://cdn.mailmyra.com');
    writeFileSync(join(dir, 'atomic.png'), 'original');
    const res = await adapter.save('atomic.png', Buffer.from('different-content'));
    expect(res.url).toBe('https://cdn.mailmyra.com/atomic.png');
    expect(readFileSync(join(dir, 'atomic.png'), 'utf8')).toBe('original');
  });
  it('handles concurrent saves to the same new filename without interleaving corruption', async () => {
    const adapter = new FsStorageAdapter(dir, 'https://cdn.mailmyra.com');
    const contents = ['one', 'two', 'three', 'four', 'five'];
    const results = await Promise.all(
      contents.map((c) => adapter.save('concurrent.png', Buffer.from(c))),
    );
    for (const r of results) {
      expect(r.url).toBe('https://cdn.mailmyra.com/concurrent.png');
    }
    expect(existsSync(join(dir, 'concurrent.png'))).toBe(true);
    const final = readFileSync(join(dir, 'concurrent.png'), 'utf8');
    expect(contents).toContain(final);
  });
});

describe('dirSizeBytes', () => {
  it('sums file sizes, 0 for missing dir', async () => {
    writeFileSync(join(dir, 'a.bin'), Buffer.alloc(10));
    writeFileSync(join(dir, 'b.bin'), Buffer.alloc(5));
    expect(await dirSizeBytes(dir)).toBe(15);
    expect(await dirSizeBytes(join(dir, 'yok'))).toBe(0);
  });
});

describe('getStorageAdapter', () => {
  it('throws a clear error when env is missing', () => {
    expect(() => getStorageAdapter({} as NodeJS.ProcessEnv)).toThrow(/CDN_WRITE_PATH/);
  });
});
```

- [ ] **Step 2: Kırmızıyı doğrula** — Run: `corepack pnpm --filter web test storage` → FAIL.

- [ ] **Step 3: Implementasyon** — `apps/web/lib/storage.ts`:

```ts
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface StorageAdapter {
  save(filename: string, buffer: Buffer): Promise<{ url: string }>;
}

const SAFE_FILENAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * `filename` sunucu dosya sistemine doğrudan iletilir. Bare basename dışında
 * her şey (yol ayırıcı veya üst dizin geçişi) reddedilir — CDN dizini dışına
 * yazma girişimlerine karşı.
 */
function assertSafeFilename(filename: string): void {
  if (
    !SAFE_FILENAME_RE.test(filename) ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('..')
  ) {
    throw new Error(
      `Invalid CDN filename: "${filename}". Must be a bare basename matching ${SAFE_FILENAME_RE} with no path separators or "..".`,
    );
  }
}

export class FsStorageAdapter implements StorageAdapter {
  constructor(
    private readonly writePath: string,
    private readonly publicUrl: string,
  ) {}

  async save(filename: string, buffer: Buffer): Promise<{ url: string }> {
    assertSafeFilename(filename);
    await mkdir(this.writePath, { recursive: true });
    const target = join(this.writePath, filename);
    // İçerik-adresli dosyalar değişmezdir: var olanı asla yeniden yazma.
    // TOCTOU'suz atomik dışlayıcı oluşturma: 'wx' iki işlemi (kontrol + yazma)
    // tek bir atomik syscall'a indirger. EEXIST => dosya zaten var, başarı
    // say (mevcut içerik korunur); başka bir hata ise yeniden fırlat.
    try {
      await writeFile(target, buffer, { flag: 'wx' });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    }
    return { url: `${this.publicUrl.replace(/\/$/, '')}/${filename}` };
  }
}

export async function dirSizeBytes(dir: string): Promise<number> {
  let total = 0;
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return 0;
  }
  for (const name of entries) {
    const s = await stat(join(dir, name));
    if (s.isFile()) total += s.size;
  }
  return total;
}

export function getStorageAdapter(env: NodeJS.ProcessEnv = process.env): FsStorageAdapter {
  const writePath = env.CDN_WRITE_PATH;
  const publicUrl = env.CDN_PUBLIC_URL;
  if (!writePath || !publicUrl) {
    throw new Error('CDN_WRITE_PATH and CDN_PUBLIC_URL must be set (see .env.example)');
  }
  return new FsStorageAdapter(writePath, publicUrl);
}
```

- [ ] **Step 4: env iskeleti** — Kök `.env.example`:

```
# Görsel CDN (apps/web)
CDN_WRITE_PATH=./apps/web/public/cdn-dev
CDN_PUBLIC_URL=http://localhost:3000/cdn-dev
EXPORT_REQUIRES_AUTH=false
UPLOAD_RATE_LIMIT_PER_HOUR=20
CDN_DISK_QUOTA_MB=5120
ORPHAN_TTL_DAYS=7
```

`.gitignore`'a iki satır ekle: `.env*.local` ve `apps/web/public/cdn-dev/`

- [ ] **Step 5: Yeşil + commit**

Run: `corepack pnpm --filter web test storage` → PASS.

```bash
git add apps/web/lib/storage.ts apps/web/test/storage.test.ts .env.example .gitignore
git commit -m "feat(web): add fs storage adapter with immutable writes"
```

---

### Task 5: `image-pipeline` (doğrulama + sharp işleme + adlandırma)

**Files:**
- Modify: `apps/web/package.json` — dependencies'e `"sharp": "^0.34.0"`
- Create: `apps/web/lib/image-pipeline.ts`
- Test: `apps/web/test/image-pipeline.test.ts`

**Interfaces:**
- Produces:
  - `type UploadKind = 'logo' | 'avatar' | 'handSignature'`
  - `class PipelineError extends Error { status: number; constructor(status: number, message: string, options?: ErrorOptions) }`
  - `processImage(input: Buffer, kind: UploadKind): Promise<{ buffer: Buffer; filename: string; width: number; height: number; warning?: string }>`
  - `KIND_TARGETS` sabiti (test ve UI metinleri için export).

- [ ] **Step 1: sharp'ı ekle** — `apps/web/package.json` dependencies'e `"sharp": "^0.34.0"` ekle, Run: `corepack pnpm install`

- [ ] **Step 2: Başarısız test** — `apps/web/test/image-pipeline.test.ts` (test görselleri sharp ile üretilir — gerçek kod, mock yok):

```ts
import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { processImage, PipelineError } from '../lib/image-pipeline';

// --- test girdileri ---
async function pngWithAlpha(px = 800): Promise<Buffer> {
  return sharp({
    create: { width: px, height: px, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 0.5 } },
  })
    .png()
    .toBuffer();
}
async function opaqueJpeg(w = 900, h = 500): Promise<Buffer> {
  return sharp({
    create: { width: w, height: h, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    .jpeg()
    .toBuffer();
}
async function webpImage(): Promise<Buffer> {
  return sharp({ create: { width: 50, height: 50, channels: 3, background: { r: 0, g: 0, b: 0 } } })
    .webp()
    .toBuffer();
}
// Şeffaf zeminli SVG: rasterize sonucu alfa kanallı → politika gereği PNG çıkmalı.
const svgImage = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><circle cx="200" cy="200" r="150" fill="#719ad1"/></svg>',
);
// Meşru büyük SVG logo: declared 1400x1400. Sabit density:300 ile rasterize
// edilirse efektif limit ~980px'e düşer ve limitInputPixels'e takılır — bu
// YANLIŞTIR, çünkü 1400x1400 makul bir logo boyutudur ve kabul edilmelidir.
const largeSvgImage = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1400"><circle cx="700" cy="700" r="600" fill="#719ad1"/></svg>',
);
const gifImage = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(20)]);
// Geçerli PNG magic byte'ları + bozuk gövde: format sniff'i geçer, sharp decode'da patlar.
const corruptPng = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('bu gecerli bir PNG govdesi degil, tamamen bozuk veri'),
]);

// Deterministik seeded PRNG (mulberry32) — Math.random KULLANILMAZ.
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 360x360 RGBA gürültü PNG'si: sıkıştırma bütçeye sığmaz → warning yolu tetiklenir.
async function noisePng(size = 360): Promise<Buffer> {
  const channels = 4;
  const rand = mulberry32(1337);
  const raw = Buffer.alloc(size * size * channels);
  for (let i = 0; i < raw.length; i++) raw[i] = Math.floor(rand() * 256);
  raw[3] = 128; // en az bir yarı-saydam alfa piksel garantisi
  return sharp(raw, { raw: { width: size, height: size, channels } })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

describe('processImage — doğrulama', () => {
  it('rejects oversized input with 413', async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 1);
    await expect(processImage(big, 'logo')).rejects.toMatchObject({ status: 413 });
  });
  it('rejects webp with 400', async () => {
    await expect(processImage(await webpImage(), 'logo')).rejects.toMatchObject({ status: 400 });
  });
  it('rejects gif with 400', async () => {
    await expect(processImage(gifImage, 'logo')).rejects.toMatchObject({ status: 400 });
  });
  it('rejects unknown bytes with 400', async () => {
    await expect(processImage(Buffer.from('not an image'), 'logo')).rejects.toMatchObject({ status: 400 });
  });
  it('rejects corrupt input (valid PNG magic bytes, garbage body) with 400', async () => {
    await expect(processImage(corruptPng, 'logo')).rejects.toMatchObject({ status: 400 });
  });
});

describe('processImage — işleme', () => {
  it('converts SVG to PNG output', async () => {
    const res = await processImage(svgImage, 'logo');
    expect(res.filename).toMatch(/^[0-9a-f]{8}\.png$/);
    const meta = await sharp(res.buffer).metadata();
    expect(meta.format).toBe('png');
  });
  it('resizes to the kind target on the long edge (logo 360)', async () => {
    const res = await processImage(await opaqueJpeg(900, 500), 'logo');
    expect(Math.max(res.width, res.height)).toBe(360);
  });
  it('avatar targets 180px', async () => {
    const res = await processImage(await pngWithAlpha(800), 'avatar');
    expect(Math.max(res.width, res.height)).toBe(180);
  });
  it('does not upscale smaller inputs', async () => {
    const res = await processImage(await opaqueJpeg(100, 80), 'logo');
    expect(Math.max(res.width, res.height)).toBe(100);
  });
  it('keeps alpha inputs as png, opaque as jpg', async () => {
    const a = await processImage(await pngWithAlpha(), 'avatar');
    expect(a.filename).toMatch(/\.png$/);
    const o = await processImage(await opaqueJpeg(), 'avatar');
    expect(o.filename).toMatch(/\.jpg$/);
  });
  it('same content yields same filename, different content differs', async () => {
    const x = await processImage(svgImage, 'logo');
    const y = await processImage(svgImage, 'logo');
    expect(x.filename).toBe(y.filename);
    const z = await processImage(await opaqueJpeg(), 'logo');
    expect(z.filename).not.toBe(x.filename);
  });
  it('rejects absurd pixel dimensions with 400 (limitInputPixels)', async () => {
    const huge = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="99999" height="99999"><rect width="99999" height="99999" fill="red"/></svg>',
    );
    await expect(processImage(huge, 'logo')).rejects.toMatchObject({ status: 400 });
  });
  it('accepts a legitimate large declared-size SVG (1400x1400) and resizes to target', async () => {
    const res = await processImage(largeSvgImage, 'logo');
    expect(Math.max(res.width, res.height)).toBe(360);
  });
  it('rasterizes small declared SVGs up to the kind target (density boost)', async () => {
    const tiny = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="#719ad1"/></svg>',
    );
    const res = await processImage(tiny, 'logo');
    expect(Math.max(res.width, res.height)).toBe(360);
  });
  it('handSignature targets 300px', async () => {
    const res = await processImage(await opaqueJpeg(900, 400), 'handSignature');
    expect(Math.max(res.width, res.height)).toBe(300);
  });
});

describe('processImage — bütçe aşımı (warning)', () => {
  it('accepts an over-budget noisy PNG with a warning instead of rejecting', async () => {
    const res = await processImage(await noisePng(360), 'logo');
    expect(res.filename).toMatch(/\.png$/);
    expect(res.warning).toBeDefined();
    expect(res.buffer.length).toBeGreaterThan(60_000);
  });
});
```

- [ ] **Step 3: Kırmızıyı doğrula** — Run: `corepack pnpm --filter web test image-pipeline` → FAIL (eski `density: 300`-her-girdiye implementasyonuna karşı: "accepts a legitimate large declared-size SVG (1400x1400)..." testi kırmızı — librsvg rasterize'ı declared_px × density/72 yaptığından 1400 × 300/72 ≈ 5833px, `limitInputPixels` (4096×4096) sınırını aşıyor ve `PipelineError(400)` fırlatıyor. Diğer 14 test (corrupt-input, handSignature, over-budget warning dahil) bu implementasyona karşı da zaten yeşildi — SVG density hatası yalnızca büyük declared boyutlu SVG'leri etkiliyor).

- [ ] **Step 4: Implementasyon** — `apps/web/lib/image-pipeline.ts`:

```ts
import { createHash } from 'node:crypto';
import sharp from 'sharp';

export type UploadKind = 'logo' | 'avatar' | 'handSignature';

export const KIND_TARGETS: Record<UploadKind, { px: number; budgetBytes: number }> = {
  logo: { px: 360, budgetBytes: 60_000 },
  avatar: { px: 180, budgetBytes: 40_000 },
  handSignature: { px: 300, budgetBytes: 50_000 },
};

const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_PIXELS = 4096 * 4096;
const JPEG_QUALITY_LADDER = [80, 60, 40];

export class PipelineError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

type Format = 'png' | 'jpeg' | 'svg' | 'webp' | 'gif' | 'unknown';

function detectFormat(buf: Buffer): Format {
  if (buf.length >= 8 && buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 4 && buf.subarray(0, 4).toString('ascii') === 'GIF8') return 'gif';
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  )
    return 'webp';
  const head = buf.subarray(0, 1024).toString('utf8').trimStart().toLowerCase();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'svg';
  return 'unknown';
}

async function compressToBudget(
  pipeline: sharp.Sharp,
  hasAlpha: boolean,
  budgetBytes: number,
): Promise<{ buffer: Buffer; ext: 'png' | 'jpg'; warning?: string }> {
  if (hasAlpha) {
    const buffer = await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer();
    return buffer.length <= budgetBytes
      ? { buffer, ext: 'png' }
      : {
          buffer,
          ext: 'png',
          warning: `Görsel önerilen boyutu aşıyor (${Math.round(buffer.length / 1024)}KB) — e-postaları yavaşlatabilir.`,
        };
  }
  let best: Buffer | null = null;
  for (const quality of JPEG_QUALITY_LADDER) {
    best = await pipeline.jpeg({ quality }).toBuffer();
    if (best.length <= budgetBytes) return { buffer: best, ext: 'jpg' };
  }
  return {
    buffer: best!,
    ext: 'jpg',
    warning: `Görsel önerilen boyutu aşıyor (${Math.round(best!.length / 1024)}KB) — e-postaları yavaşlatabilir.`,
  };
}

export async function processImage(
  input: Buffer,
  kind: UploadKind,
): Promise<{ buffer: Buffer; filename: string; width: number; height: number; warning?: string }> {
  if (input.length > MAX_INPUT_BYTES) {
    throw new PipelineError(413, 'Dosya 5MB sınırını aşıyor.');
  }
  const format = detectFormat(input);
  if (format === 'webp' || format === 'gif') {
    throw new PipelineError(400, 'WebP ve GIF kabul edilmez. PNG, JPG veya SVG yükleyin.');
  }
  if (format === 'unknown') {
    throw new PipelineError(400, 'Dosya görsel olarak tanınamadı. PNG, JPG veya SVG yükleyin.');
  }

  const target = KIND_TARGETS[kind];

  // GİRDİ BÖLGESİ: decode/probe adımları. Beklenen hatalar (limitInputPixels,
  // bozuk dosya) burada yakalanıp 400'e eşlenir — cause korunarak.
  let resized: sharp.Sharp;
  let hasAlpha: boolean;
  try {
    let base: sharp.Sharp;
    if (format === 'svg') {
      // SVG için density'yi declared boyuta göre hesapla: librsvg rasterize'ı
      // declared_px × density/72 yapar. density:300 sabit kullanılırsa büyük
      // (ama makul) declared boyutlu SVG'ler limitInputPixels'e takılır.
      // Önce varsayılan density (72) ile sadece declared boyutu prob'la —
      // gerçekten saçma declared boyut burada zaten fırlatır (bomba koruması).
      const probeMeta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata();
      const longEdge = Math.max(probeMeta.width ?? 1, probeMeta.height ?? 1);
      // Declared boyut hedeften büyük/eşitse varsayılan density yeter (aşağıda
      // zaten küçültülecek). Küçükse rasterize'ı hedef long edge'e getirecek
      // density hesapla — küçük declared SVG'ler için vektör kalitesini korur.
      const density = longEdge >= target.px ? 72 : (72 * target.px) / longEdge;
      base = sharp(input, { limitInputPixels: MAX_PIXELS, density });
    } else {
      // Raster girdilerde density parametresi anlamsız/zararlı — hiç geçilmez.
      base = sharp(input, { limitInputPixels: MAX_PIXELS });
    }
    resized = base.resize({
      width: target.px,
      height: target.px,
      fit: 'inside',
      withoutEnlargement: true,
    });
    const probe = await resized.clone().png().toBuffer({ resolveWithObject: true });
    const stats = await sharp(probe.data).stats();
    hasAlpha = !stats.isOpaque;
  } catch (e) {
    if (e instanceof PipelineError) throw e;
    throw new PipelineError(400, 'Görsel işlenemedi: boyutlar çok büyük veya dosya bozuk.', { cause: e });
  }

  // İŞLEME BÖLGESİ: burada yakalama YOK. Beklenmeyen bir hata gerçek bir bug'dır
  // ve route handler'ın PipelineError-olmayan yolundan (500) geçmelidir.
  const { buffer, ext, warning } = await compressToBudget(resized.clone(), hasAlpha, target.budgetBytes);
  const meta = await sharp(buffer).metadata();
  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 8);
  return {
    buffer,
    filename: `${hash}.${ext}`,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    warning,
  };
}
```

- [ ] **Step 5: Yeşili doğrula** — Run: `corepack pnpm --filter web test image-pipeline` → tümü PASS (16/16). Not: `compressToBudget`'ın `warning` dönüşü artık gerçek bir test tarafından da tetikleniyor (seeded-PRNG gürültü PNG'si, düz renkli fixture'ların aksine sıkıştırılamıyor) — önceki "testte üretilen görseller sığdığı için warning undefined olur" notu artık geçerli değil.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/image-pipeline.ts apps/web/test/image-pipeline.test.ts
git commit -m "fix(web): svg-aware density, error zones and budget-warning coverage in pipeline"
```

**Kod incelemesi sonrası düzeltmeler (bu Task 5 bloğu geriye dönük güncellendi):**
1. **SVG density.** `density: 300` artık TÜM girdilere değil, yalnızca SVG'ye ve declared boyuta göre hesaplanarak uygulanıyor — librsvg `declared_px × density/72` rasterize ettiğinden sabit `density:300`, ~980px üstü declared boyutlu (ama tamamen makul, örn. 1400×1400) SVG logoları `limitInputPixels`'e takılıp yanlışlıkla reddediyordu. Raster (PNG/JPEG) girdilerde `density` artık hiç geçilmiyor.
2. **Hata bölgeleri.** Tek try/catch, GİRDİ (decode/probe) ve İŞLEME (compress/hash) olarak ikiye ayrıldı. Yalnızca girdi bölgesindeki hatalar `PipelineError(400, …, { cause: e })`'e eşleniyor; işleme bölgesindeki beklenmeyen hatalar artık yakalanmıyor ve route handler'ın genel (500) yoluna düşüyor.
3. **Bütçe-aşımı `warning` kapsamı.** Deterministik (seeded PRNG, `Math.random` yok) 360×360 gürültü PNG testi eklendi — `warning` alanının gerçekten dolduğunu ve reddetmediğini commit edilmiş bir testle kanıtlıyor.
4. **Ek testler (minor bulgular):** `handSignature` (300px) ve bozuk-gövdeli-ama-geçerli-magic-byte'lı PNG (400 red) testleri eklendi.

---

### Task 6: `POST /api/upload`

**Files:**
- Create: `apps/web/app/api/upload/route.ts`
- Test: `apps/web/test/upload-route.test.ts`

**Interfaces:**
- Consumes: `processImage`, `PipelineError` (Task 5); `getStorageAdapter`, `dirSizeBytes` (Task 4); `createRateLimiter` (Task 3).
- Produces: `POST(req: Request): Promise<Response>` — 200: `{ url, width, height, bytes, warning? }`; hatalar: 400/413/429/507 `{ error }`. Üretim dosyasında test-only export YOKTUR; testler `vi.resetModules()` + dinamik import ile modül-seviyesi limiter'ı sıfırlar.

- [ ] **Step 1: Başarısız test** — `apps/web/test/upload-route.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

type PostFn = (req: Request) => Promise<Response>;
let POST: PostFn;
let dir: string;
beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'mailmyra-upload-'));
  process.env.CDN_WRITE_PATH = dir;
  process.env.CDN_PUBLIC_URL = 'http://cdn.test';
  process.env.UPLOAD_RATE_LIMIT_PER_HOUR = '5';
  process.env.CDN_DISK_QUOTA_MB = '5120';
  // Modül-seviyesi limiter'ı sıfırla: test-only export yerine modülü yeniden yükle.
  vi.resetModules();
  ({ POST } = await import('../app/api/upload/route'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

async function makeRequest(file: Blob | null, kind: string, ip = '9.9.9.9'): Promise<Request> {
  const form = new FormData();
  if (file) form.set('file', file, 'test.png');
  form.set('kind', kind);
  return new Request('http://localhost/api/upload', {
    method: 'POST',
    body: form,
    headers: { 'x-forwarded-for': ip },
  });
}

async function pngBlob(): Promise<Blob> {
  const buf = await sharp({
    create: { width: 300, height: 300, channels: 3, background: { r: 1, g: 2, b: 3 } },
  })
    .png()
    .toBuffer();
  return new Blob([buf], { type: 'image/png' });
}

describe('POST /api/upload', () => {
  it('uploads a valid png and returns a cdn url', async () => {
    const res = await POST(await makeRequest(await pngBlob(), 'avatar'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toMatch(/^http:\/\/cdn\.test\/[0-9a-f]{8}\.(png|jpg)$/);
    expect(body.width).toBeGreaterThan(0);
  });
  it('rejects a missing file with 400', async () => {
    const res = await POST(await makeRequest(null, 'avatar'));
    expect(res.status).toBe(400);
  });
  it('rejects an invalid kind with 400', async () => {
    const res = await POST(await makeRequest(await pngBlob(), 'banner'));
    expect(res.status).toBe(400);
  });
  it('enforces the per-ip rate limit with 429', async () => {
    for (let i = 0; i < 5; i++) {
      await POST(await makeRequest(await pngBlob(), 'avatar', '5.5.5.5'));
    }
    const res = await POST(await makeRequest(await pngBlob(), 'avatar', '5.5.5.5'));
    expect(res.status).toBe(429);
  });
  it('enforces the disk quota with 507', async () => {
    process.env.CDN_DISK_QUOTA_MB = '0';
    const res = await POST(await makeRequest(await pngBlob(), 'avatar'));
    expect(res.status).toBe(507);
  });
});
```

- [ ] **Step 2: Kırmızıyı doğrula** — Run: `corepack pnpm --filter web test upload-route` → FAIL (modül yok).

- [ ] **Step 3: Implementasyon** — `apps/web/app/api/upload/route.ts`:

```ts
import { createRateLimiter } from '../../../lib/rate-limit';
import { processImage, PipelineError, type UploadKind } from '../../../lib/image-pipeline';
import { getStorageAdapter, dirSizeBytes } from '../../../lib/storage';

const KINDS: UploadKind[] = ['logo', 'avatar', 'handSignature'];

const limiter = createRateLimiter({
  limit: Number(process.env.UPLOAD_RATE_LIMIT_PER_HOUR ?? 20),
  windowMs: 60 * 60 * 1000,
});

function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

export async function POST(req: Request): Promise<Response> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (!limiter.check(ip, Date.now())) {
    return jsonError(429, 'Çok fazla yükleme. Bir saat sonra tekrar deneyin.');
  }

  const writePath = process.env.CDN_WRITE_PATH;
  if (!writePath || !process.env.CDN_PUBLIC_URL) {
    return jsonError(500, 'Sunucu yapılandırması eksik (CDN_WRITE_PATH / CDN_PUBLIC_URL).');
  }
  const quotaBytes = Number(process.env.CDN_DISK_QUOTA_MB ?? 5120) * 1024 * 1024;
  if ((await dirSizeBytes(writePath)) >= quotaBytes) {
    return jsonError(507, 'Depolama kotası doldu. Yönetici ile iletişime geçin.');
  }

  const form = await req.formData();
  const file = form.get('file');
  const kind = form.get('kind');
  if (!(file instanceof Blob)) return jsonError(400, 'Dosya bulunamadı.');
  if (typeof kind !== 'string' || !KINDS.includes(kind as UploadKind)) {
    return jsonError(400, 'Geçersiz görsel türü.');
  }

  const input = Buffer.from(await file.arrayBuffer());
  try {
    const result = await processImage(input, kind as UploadKind);
    const { url } = await getStorageAdapter().save(result.filename, result.buffer);
    return Response.json({
      url,
      width: result.width,
      height: result.height,
      bytes: result.buffer.length,
      warning: result.warning,
    });
  } catch (e) {
    if (e instanceof PipelineError) return jsonError(e.status, e.message);
    throw e;
  }
}
```

- [ ] **Step 4: Yeşil + tüm suite** — Run: `corepack pnpm --filter web test` → tümü PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/upload apps/web/test/upload-route.test.ts
git commit -m "feat(web): add upload API with rate limit and disk quota"
```

**Kod incelemesi sonrası düzeltmeler (bu Task 6 bloğu geriye dönük güncellendi):**
1. **Missing-env 500 branch coverage.** Route'da `CDN_WRITE_PATH` kontrolü yapılıyor ama testte bu 500 durumu doğrulanmıyordu. Eklenen test:

```ts
it('returns 500 when CDN env config is missing', async () => {
  delete process.env.CDN_WRITE_PATH;
  const res = await POST(await makeRequest(await pngBlob(), 'avatar'));
  expect(res.status).toBe(500);
  const body = await res.json();
  expect(body.error).toContain('CDN_WRITE_PATH');
});
```

Not: `beforeEach` her testten sonra `CDN_WRITE_PATH` yeniden ayarladığı için silme işlemi güvenli — sonraki testleri etkilemez.

---

### Task 7: `cleanup-orphans` (elle, --dry-run)

**Files:**
- Create: `apps/web/lib/cleanup.ts`
- Create: `apps/web/scripts/cleanup-orphans.ts`
- Modify: `apps/web/package.json` — scripts'e `"cleanup": "tsx scripts/cleanup-orphans.ts"`, devDependencies'e `"tsx": "^4.19.2"`
- Test: `apps/web/test/cleanup.test.ts`

**Interfaces:**
- Consumes: yok (saf fs).
- Produces: `cleanupOrphans(dir: string, ttlDays: number, opts: { dryRun: boolean; now: number }): Promise<{ candidates: string[]; deleted: string[] }>` — `dryRun` true ise `deleted` boş kalır.

- [ ] **Step 1: Başarısız test** — `apps/web/test/cleanup.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, utimesSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanupOrphans } from '../lib/cleanup';

const DAY = 24 * 60 * 60 * 1000;
let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mailmyra-cleanup-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function makeFile(name: string, ageDays: number, now: number): string {
  const p = join(dir, name);
  writeFileSync(p, 'x');
  const mtime = new Date(now - ageDays * DAY);
  utimesSync(p, mtime, mtime);
  return p;
}

describe('cleanupOrphans', () => {
  it('deletes files older than ttl, keeps newer ones', async () => {
    const now = Date.now();
    const old = makeFile('old.png', 10, now);
    const fresh = makeFile('fresh.png', 2, now);
    const res = await cleanupOrphans(dir, 7, { dryRun: false, now });
    expect(res.deleted).toEqual(['old.png']);
    expect(existsSync(old)).toBe(false);
    expect(existsSync(fresh)).toBe(true);
  });
  it('dry-run lists candidates but deletes nothing', async () => {
    const now = Date.now();
    const old = makeFile('old.png', 10, now);
    const res = await cleanupOrphans(dir, 7, { dryRun: true, now });
    expect(res.candidates).toEqual(['old.png']);
    expect(res.deleted).toEqual([]);
    expect(existsSync(old)).toBe(true);
  });
});
```

- [ ] **Step 2: Kırmızıyı doğrula** — Run: `corepack pnpm --filter web test cleanup` → FAIL.

- [ ] **Step 3: Implementasyon** — `apps/web/lib/cleanup.ts`:

```ts
import { readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * TTL'den eski dosyaları bulur ve (dryRun değilse) siler.
 * Hafta 4'te DB referans kontrolü eklenecek — sahadaki URL asla silinmez.
 */
export async function cleanupOrphans(
  dir: string,
  ttlDays: number,
  opts: { dryRun: boolean; now: number },
): Promise<{ candidates: string[]; deleted: string[] }> {
  const candidates: string[] = [];
  const deleted: string[] = [];
  let entries: string[] = [];
  try {
    entries = await readdir(dir);
  } catch {
    return { candidates, deleted };
  }
  for (const name of entries) {
    const p = join(dir, name);
    const s = await stat(p);
    if (!s.isFile()) continue;
    if (opts.now - s.mtimeMs > ttlDays * DAY_MS) {
      candidates.push(name);
      if (!opts.dryRun) {
        await unlink(p);
        deleted.push(name);
      }
    }
  }
  return { candidates, deleted };
}
```

`apps/web/scripts/cleanup-orphans.ts`:

```ts
import { cleanupOrphans } from '../lib/cleanup';

const dir = process.env.CDN_WRITE_PATH;
if (!dir) {
  console.error('CDN_WRITE_PATH tanımlı değil.');
  process.exit(1);
}
const ttlDays = Number(process.env.ORPHAN_TTL_DAYS ?? 7);
const dryRun = process.argv.includes('--dry-run');

const res = await cleanupOrphans(dir, ttlDays, { dryRun, now: Date.now() });
if (dryRun) {
  console.log(`[dry-run] ${res.candidates.length} dosya silinecekti:`);
  for (const f of res.candidates) console.log('  -', f);
} else {
  console.log(`${res.deleted.length} dosya silindi:`);
  for (const f of res.deleted) console.log('  -', f);
}
```

- [ ] **Step 4: package.json güncelle + kur** — scripts: `"cleanup": "tsx scripts/cleanup-orphans.ts"`, devDeps: `"tsx": "^4.19.2"`. Run: `corepack pnpm install`

- [ ] **Step 5: Yeşil + commit**

Run: `corepack pnpm --filter web test cleanup` → PASS.

```bash
git add apps/web/lib/cleanup.ts apps/web/scripts/cleanup-orphans.ts apps/web/test/cleanup.test.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): add manual orphan cleanup script with dry-run"
```

---

### Task 8: `draft` (localStorage taslak)

**Files:**
- Create: `apps/web/lib/draft.ts`
- Test: `apps/web/test/draft.test.ts`

**Interfaces:**
- Consumes: `SignatureData` (`@mailmyra/renderer`).
- Produces:
  - `type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>`
  - `saveDraft(storage: StorageLike, data: SignatureData, now: number): void` — `data:` URI'ları atlayarak yazar
  - `loadDraft(storage: StorageLike, now: number): SignatureData | null` — 30 gün TTL, bozuk kayıtta null
  - `clearDraft(storage: StorageLike): void`
  - `DRAFT_KEY` sabiti

- [ ] **Step 1: Başarısız test** — `apps/web/test/draft.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { fixtures } from '@mailmyra/renderer';
import { saveDraft, loadDraft, clearDraft, DRAFT_KEY, type StorageLike } from '../lib/draft';

const DAY = 24 * 60 * 60 * 1000;
const data = fixtures.find((f) => f.id === 'full')!.data;

function fakeStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe('draft', () => {
  let storage: ReturnType<typeof fakeStorage>;
  beforeEach(() => {
    storage = fakeStorage();
  });

  it('round-trips signature data', () => {
    saveDraft(storage, data, 1000);
    expect(loadDraft(storage, 2000)).toEqual(data);
  });
  it('expires drafts older than 30 days and removes the record', () => {
    saveDraft(storage, data, 0);
    expect(loadDraft(storage, 31 * DAY)).toBeNull();
    expect(storage.map.has(DRAFT_KEY)).toBe(false);
  });
  it('keeps drafts younger than 30 days', () => {
    saveDraft(storage, data, 0);
    expect(loadDraft(storage, 29 * DAY)).not.toBeNull();
  });
  it('never persists data: URIs', () => {
    const dirty = {
      ...data,
      visuals: { ...data.visuals, avatarUrl: 'data:image/png;base64,AAAA' },
    };
    saveDraft(storage, dirty, 1000);
    const loaded = loadDraft(storage, 2000)!;
    expect(loaded.visuals.avatarUrl).toBeUndefined();
    expect(storage.map.get(DRAFT_KEY)).not.toContain('base64');
  });
  it('returns null for corrupt records', () => {
    storage.setItem(DRAFT_KEY, '{bozuk json');
    expect(loadDraft(storage, 0)).toBeNull();
  });
  it('clearDraft removes the record', () => {
    saveDraft(storage, data, 0);
    clearDraft(storage);
    expect(loadDraft(storage, 1)).toBeNull();
  });
});
```

- [ ] **Step 2: Kırmızıyı doğrula** — Run: `corepack pnpm --filter web test draft` → FAIL.

- [ ] **Step 3: Implementasyon** — `apps/web/lib/draft.ts`:

```ts
import type { SignatureData } from '@mailmyra/renderer';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const DRAFT_KEY = 'mailmyra:draft:v1';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface Envelope {
  version: 1;
  savedAt: number;
  data: SignatureData;
}

function stripDataUris(data: SignatureData): SignatureData {
  const clean = (url: string | undefined) =>
    url?.startsWith('data:') ? undefined : url;
  return {
    ...data,
    visuals: {
      ...data.visuals,
      avatarUrl: clean(data.visuals.avatarUrl),
      logoUrl: clean(data.visuals.logoUrl),
      handSignatureUrl: clean(data.visuals.handSignatureUrl),
    },
  };
}

export function saveDraft(storage: StorageLike, data: SignatureData, now: number): void {
  const envelope: Envelope = { version: 1, savedAt: now, data: stripDataUris(data) };
  storage.setItem(DRAFT_KEY, JSON.stringify(envelope));
}

export function loadDraft(storage: StorageLike, now: number): SignatureData | null {
  const raw = storage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const envelope = JSON.parse(raw) as Envelope;
    if (envelope.version !== 1 || typeof envelope.savedAt !== 'number') return null;
    if (now - envelope.savedAt > TTL_MS) {
      storage.removeItem(DRAFT_KEY);
      return null;
    }
    return envelope.data;
  } catch {
    return null;
  }
}

export function clearDraft(storage: StorageLike): void {
  storage.removeItem(DRAFT_KEY);
}
```

- [ ] **Step 4: Yeşil + commit**

Run: `corepack pnpm --filter web test draft` → PASS.

```bash
git add apps/web/lib/draft.ts apps/web/test/draft.test.ts
git commit -m "feat(web): add localStorage draft with ttl and data-uri guard"
```

---

### Task 9: Builder reducer + boş veri fabrikası

**Files:**
- Create: `apps/web/app/builder/reducer.ts`
- Test: `apps/web/test/builder-reducer.test.ts`

**Interfaces:**
- Consumes: `SignatureData` (`@mailmyra/renderer`).
- Produces:
  - `createEmptyData(): SignatureData` — marka varsayılanları (#719ad1 / #1a1a1a / #6d6e71, Arial, classic-horizontal, medium, mono, showDividers true)
  - `builderReducer(state: SignatureData, action: BuilderAction): SignatureData`
  - `type BuilderAction =`
    - `{ type: 'patchIdentity'; value: Partial<SignatureData['identity']> }`
    - `{ type: 'patchContact'; value: Partial<SignatureData['contact']> }`
    - `{ type: 'patchVisuals'; value: Partial<SignatureData['visuals']> }`
    - `{ type: 'patchLayout'; value: Partial<SignatureData['layout']> }`
    - `{ type: 'patchExtras'; value: Partial<NonNullable<SignatureData['extras']>> }`
    - `{ type: 'setSocial'; value: SignatureData['social'] }`
    - `{ type: 'load'; value: SignatureData }`
    - `{ type: 'reset' }`

- [ ] **Step 1: Başarısız test** — `apps/web/test/builder-reducer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { builderReducer, createEmptyData } from '../app/builder/reducer';

describe('createEmptyData', () => {
  it('starts with brand defaults and classic-horizontal', () => {
    const d = createEmptyData();
    expect(d.visuals.brandColor).toBe('#719ad1');
    expect(d.layout.templateId).toBe('classic-horizontal');
    expect(d.identity.fullName).toBe('');
  });
});

describe('builderReducer', () => {
  it('patches sections without touching others', () => {
    const s0 = createEmptyData();
    const s1 = builderReducer(s0, { type: 'patchIdentity', value: { fullName: 'Ayşe' } });
    expect(s1.identity.fullName).toBe('Ayşe');
    expect(s1.contact).toEqual(s0.contact);
    expect(s0.identity.fullName).toBe(''); // immutable
  });
  it('replaces social list', () => {
    const s = builderReducer(createEmptyData(), {
      type: 'setSocial',
      value: [{ platform: 'linkedin', url: 'https://linkedin.com/in/x' }],
    });
    expect(s.social).toHaveLength(1);
  });
  it('load replaces the whole state, reset returns to empty', () => {
    const s1 = builderReducer(createEmptyData(), { type: 'patchIdentity', value: { fullName: 'X' } });
    const s2 = builderReducer(s1, { type: 'load', value: createEmptyData() });
    expect(s2.identity.fullName).toBe('');
    const s3 = builderReducer(s1, { type: 'reset' });
    expect(s3).toEqual(createEmptyData());
  });
});
```

- [ ] **Step 2: Kırmızıyı doğrula** — Run: `corepack pnpm --filter web test builder-reducer` → FAIL.

- [ ] **Step 3: Implementasyon** — `apps/web/app/builder/reducer.ts`:

```ts
import type { SignatureData } from '@mailmyra/renderer';

export function createEmptyData(): SignatureData {
  return {
    identity: { fullName: '' },
    contact: {},
    visuals: {
      brandColor: '#719ad1',
      textColor: '#1a1a1a',
      mutedColor: '#6d6e71',
      fontFamily: 'Arial, Helvetica, sans-serif',
    },
    social: [],
    extras: {},
    layout: {
      templateId: 'classic-horizontal',
      size: 'medium',
      iconStyle: 'mono',
      showDividers: true,
    },
  };
}

export type BuilderAction =
  | { type: 'patchIdentity'; value: Partial<SignatureData['identity']> }
  | { type: 'patchContact'; value: Partial<SignatureData['contact']> }
  | { type: 'patchVisuals'; value: Partial<SignatureData['visuals']> }
  | { type: 'patchLayout'; value: Partial<SignatureData['layout']> }
  | { type: 'patchExtras'; value: Partial<NonNullable<SignatureData['extras']>> }
  | { type: 'setSocial'; value: SignatureData['social'] }
  | { type: 'load'; value: SignatureData }
  | { type: 'reset' };

export function builderReducer(state: SignatureData, action: BuilderAction): SignatureData {
  switch (action.type) {
    case 'patchIdentity':
      return { ...state, identity: { ...state.identity, ...action.value } };
    case 'patchContact':
      return { ...state, contact: { ...state.contact, ...action.value } };
    case 'patchVisuals':
      return { ...state, visuals: { ...state.visuals, ...action.value } };
    case 'patchLayout':
      return { ...state, layout: { ...state.layout, ...action.value } };
    case 'patchExtras':
      return { ...state, extras: { ...state.extras, ...action.value } };
    case 'setSocial':
      return { ...state, social: action.value };
    case 'load':
      return action.value;
    case 'reset':
      return createEmptyData();
  }
}
```

- [ ] **Step 4: Yeşil + commit**

Run: `corepack pnpm --filter web test builder-reducer` → PASS.

```bash
git add apps/web/app/builder/reducer.ts apps/web/test/builder-reducer.test.ts
git commit -m "feat(web): add builder reducer and empty data factory"
```

---

### Task 10: Ortak önizleme sarmalayıcı + ExportButtons (kapılı) + /login + harness düzeltmesi

**Files:**
- Create: `apps/web/components/preview-doc.ts`
- Create: `apps/web/components/ExportButtons.tsx` (taşıma + kapı)
- Delete: `apps/web/app/dev/render/ExportButtons.tsx`
- Create: `apps/web/app/login/page.tsx`
- Modify: `apps/web/app/dev/render/page.tsx`

**Interfaces:**
- Produces:
  - `wrapPreviewDoc(fragment: string, bg: string): string` — iframe `srcDoc` dokümanı; üst kırpılmayı önleyen padding içerir
  - `<ExportButtons html={string} filename={string} gated={boolean} />` — `gated` true ise tıklamada `/login`'e yönlendirir
- Consumes: `renderSignature`, `fixtures` (`@mailmyra/renderer`).

- [ ] **Step 1: `preview-doc.ts`'i yaz** — `apps/web/components/preview-doc.ts`:

```ts
/**
 * İmza fragment'ini iframe srcDoc dokümanına sarar.
 * Hafta 1 gözlemi: ilk satır kırpılabiliyordu — body'de yeterli üst padding
 * ve içerik akışını bozan margin bırakılmaz.
 */
export function wrapPreviewDoc(fragment: string, bg: string): string {
  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    `<body style="margin:0;padding:20px 16px;background:${bg};overflow:auto;">` +
    `${fragment}</body></html>`
  );
}
```

- [ ] **Step 2: Kırpılmayı reproduce et ve kök sebebi doğrula** — `corepack pnpm dev:web` çalışırken `/dev/render`'da longContent fixture'ının ilk satırının (ad) tam görünüp görünmediğine bak. Kırpılıyorsa superpowers:systematic-debugging ile kök sebebi bul (aday: iframe sabit `height` + içerik taşması ile scroll konumu; ya da `line-height:1.2` + büyük font kombinasyonu). Bulguya göre `wrapPreviewDoc` padding'ini veya iframe stilini düzelt. **Kabul ölçütü:** 4 fixture × 2 zemin, ilk satır tam görünür (screenshot ile doğrula).

- [ ] **Step 3: `ExportButtons`'ı taşı ve kapıyı ekle** — `apps/web/components/ExportButtons.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';

export function ExportButtons({
  html,
  filename,
  gated,
}: {
  html: string;
  filename: string;
  gated: boolean;
}) {
  const router = useRouter();

  async function copyHtml() {
    if (gated) {
      router.push('/login');
      return;
    }
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ]);
      alert('Kopyalandı (text/html)');
    } catch (e) {
      alert(`Kopyalama başarısız: ${(e as Error).message}`);
    }
  }

  function downloadHtm() {
    if (gated) {
      router.push('/login');
      return;
    }
    const doc = `<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
    const blob = new Blob([doc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.htm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
      <button type="button" onClick={copyHtml}>
        HTML olarak kopyala
      </button>
      <button type="button" onClick={downloadHtm}>
        .htm indir
      </button>
    </div>
  );
}
```

Eski `apps/web/app/dev/render/ExportButtons.tsx` silinir; `page.tsx` importu `../../../components/ExportButtons` olur ve `gated={false}` geçer (dev harness her zaman açık). `page.tsx`'teki yerel `wrapDoc` kaldırılır, `wrapPreviewDoc` import edilir.

- [ ] **Step 4: `/login` placeholder** — `apps/web/app/login/page.tsx`:

```tsx
export const metadata = { title: 'Giriş — Mailmyra' };

export default function LoginPage() {
  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 480,
        margin: '80px auto',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <h1>Giriş gerekli</h1>
      <p style={{ color: '#6d6e71', lineHeight: 1.6 }}>
        İmzanı dışa aktarmak (kopyalamak veya indirmek) için giriş yapman
        gerekiyor. Hesaplar çok yakında — şu an builder'ı ve canlı önizlemeyi
        serbestçe kullanabilirsin.
      </p>
      <p>
        <a href="/builder" style={{ color: '#719ad1' }}>
          ← Builder'a dön
        </a>
      </p>
    </main>
  );
}
```

- [ ] **Step 5: Build + görsel doğrulama** — Run: `corepack pnpm --filter web build` → başarılı. Tarayıcıda `/dev/render` (kırpılma yok, butonlar çalışır) ve `/login` kontrol edilir.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components apps/web/app/login apps/web/app/dev/render
git commit -m "feat(web): shared preview doc, gated export buttons, login placeholder"
```

---

### Task 11: Builder adım bileşenleri (Bilgiler, Sosyal, Stil)

**Files:**
- Create: `apps/web/app/builder/steps/InfoStep.tsx`
- Create: `apps/web/app/builder/steps/SocialStep.tsx`
- Create: `apps/web/app/builder/steps/StyleStep.tsx`
- Create: `apps/web/app/builder/fields.tsx` (ortak input yardımcıları)

**Interfaces:**
- Consumes: `SignatureData`, `contrastRatio` (`@mailmyra/renderer`); `BuilderAction` (Task 9).
- Produces: her adım `{ data: SignatureData; dispatch: (a: BuilderAction) => void }` props'lu client bileşeni. `fields.tsx` → `<TextField label value onChange />`, `<labelStyle/inputStyle>` sabitleri.

- [ ] **Step 1: Ortak alan yardımcıları** — `apps/web/app/builder/fields.tsx`:

```tsx
'use client';

import type { CSSProperties, ReactNode } from 'react';

export const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: '#6d6e71',
  marginBottom: 4,
};

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #d5d5d5',
  borderRadius: 6,
  fontSize: 14,
  boxSizing: 'border-box',
};

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={labelStyle}>
        {label}
        {required ? ' *' : ''}
      </span>
      <input
        style={inputStyle}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <legend style={{ fontSize: 13, fontWeight: 600, padding: '0 6px' }}>{title}</legend>
      {children}
    </fieldset>
  );
}
```

- [ ] **Step 2: InfoStep** — `apps/web/app/builder/steps/InfoStep.tsx`:

```tsx
'use client';

import type { SignatureData } from '@mailmyra/renderer';
import type { BuilderAction } from '../reducer';
import { TextField, FieldGroup, labelStyle, inputStyle } from '../fields';

export function InfoStep({
  data,
  dispatch,
}: {
  data: SignatureData;
  dispatch: (a: BuilderAction) => void;
}) {
  const extras = data.extras ?? {};
  const customFields = extras.customFields ?? [];

  function setCustomField(i: number, patch: Partial<{ label: string; value: string; url: string }>) {
    const next = customFields.map((f, j) => (j === i ? { ...f, ...patch } : f));
    dispatch({ type: 'patchExtras', value: { customFields: next } });
  }

  return (
    <div>
      <FieldGroup title="Kimlik">
        <TextField
          label="Ad Soyad"
          required
          value={data.identity.fullName}
          onChange={(v) => dispatch({ type: 'patchIdentity', value: { fullName: v } })}
        />
        <TextField
          label="Ünvan"
          value={data.identity.jobTitle ?? ''}
          onChange={(v) => dispatch({ type: 'patchIdentity', value: { jobTitle: v || undefined } })}
        />
        <TextField
          label="Departman"
          value={data.identity.department ?? ''}
          onChange={(v) => dispatch({ type: 'patchIdentity', value: { department: v || undefined } })}
        />
        <TextField
          label="Şirket"
          value={data.identity.company ?? ''}
          onChange={(v) => dispatch({ type: 'patchIdentity', value: { company: v || undefined } })}
        />
      </FieldGroup>

      <FieldGroup title="İletişim">
        <TextField
          label="E-posta"
          value={data.contact.email ?? ''}
          onChange={(v) => dispatch({ type: 'patchContact', value: { email: v || undefined } })}
        />
        <TextField
          label="Telefon"
          value={data.contact.phone ?? ''}
          onChange={(v) => dispatch({ type: 'patchContact', value: { phone: v || undefined } })}
        />
        <TextField
          label="Mobil"
          value={data.contact.mobile ?? ''}
          onChange={(v) => dispatch({ type: 'patchContact', value: { mobile: v || undefined } })}
        />
        <TextField
          label="Web sitesi"
          value={data.contact.website ?? ''}
          onChange={(v) => dispatch({ type: 'patchContact', value: { website: v || undefined } })}
        />
        <TextField
          label="Adres"
          value={data.contact.address ?? ''}
          onChange={(v) => dispatch({ type: 'patchContact', value: { address: v || undefined } })}
        />
      </FieldGroup>

      <FieldGroup title="CTA Butonu">
        <TextField
          label="Buton metni"
          placeholder="Görüşme Ayarla"
          value={extras.ctaLabel ?? ''}
          onChange={(v) => dispatch({ type: 'patchExtras', value: { ctaLabel: v || undefined } })}
        />
        <TextField
          label="Buton bağlantısı"
          placeholder="https://..."
          value={extras.ctaUrl ?? ''}
          onChange={(v) => dispatch({ type: 'patchExtras', value: { ctaUrl: v || undefined } })}
        />
      </FieldGroup>

      <FieldGroup title="Özel Alanlar">
        {customFields.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Etiket"
              value={f.label}
              onChange={(e) => setCustomField(i, { label: e.target.value })}
            />
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Değer"
              value={f.value}
              onChange={(e) => setCustomField(i, { value: e.target.value })}
            />
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="URL (opsiyonel)"
              value={f.url ?? ''}
              onChange={(e) => setCustomField(i, { url: e.target.value || undefined })}
            />
            <button
              type="button"
              onClick={() =>
                dispatch({
                  type: 'patchExtras',
                  value: { customFields: customFields.filter((_, j) => j !== i) },
                })
              }
            >
              Sil
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            dispatch({
              type: 'patchExtras',
              value: { customFields: [...customFields, { label: '', value: '' }] },
            })
          }
        >
          + Alan ekle
        </button>
      </FieldGroup>

      <FieldGroup title="Yasal Metin">
        <label style={{ display: 'block' }}>
          <span style={labelStyle}>Feragatname / gizlilik notu</span>
          <textarea
            style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
            value={extras.disclaimer ?? ''}
            onChange={(e) =>
              dispatch({ type: 'patchExtras', value: { disclaimer: e.target.value || undefined } })
            }
          />
        </label>
      </FieldGroup>
    </div>
  );
}
```

- [ ] **Step 3: SocialStep** — `apps/web/app/builder/steps/SocialStep.tsx`:

```tsx
'use client';

import type { SignatureData } from '@mailmyra/renderer';
import type { BuilderAction } from '../reducer';
import { inputStyle } from '../fields';

const PLATFORMS: SignatureData['social'][number]['platform'][] = [
  'linkedin',
  'x',
  'instagram',
  'facebook',
  'youtube',
  'github',
  'behance',
  'dribbble',
];

export function SocialStep({
  data,
  dispatch,
}: {
  data: SignatureData;
  dispatch: (a: BuilderAction) => void;
}) {
  const social = data.social;

  function update(next: SignatureData['social']) {
    dispatch({ type: 'setSocial', value: next });
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= social.length) return;
    const next = [...social];
    [next[i], next[j]] = [next[j]!, next[i]!];
    update(next);
  }

  return (
    <div>
      {social.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <select
            style={{ ...inputStyle, width: 140 }}
            value={s.platform}
            onChange={(e) =>
              update(social.map((x, j) => (j === i ? { ...x, platform: e.target.value as typeof s.platform } : x)))
            }
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="https://..."
            value={s.url}
            onChange={(e) => update(social.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
          />
          <button type="button" onClick={() => move(i, -1)} aria-label="Yukarı">↑</button>
          <button type="button" onClick={() => move(i, 1)} aria-label="Aşağı">↓</button>
          <button type="button" onClick={() => update(social.filter((_, j) => j !== i))}>
            Sil
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => update([...social, { platform: 'linkedin', url: '' }])}
      >
        + Sosyal bağlantı ekle
      </button>
    </div>
  );
}
```

- [ ] **Step 4: StyleStep (kontrast uyarılı)** — `apps/web/app/builder/steps/StyleStep.tsx`:

```tsx
'use client';

import type { SignatureData, WebSafeFont } from '@mailmyra/renderer';
import { contrastRatio } from '@mailmyra/renderer';
import type { BuilderAction } from '../reducer';
import { FieldGroup, labelStyle, inputStyle } from '../fields';

const FONTS: WebSafeFont[] = [
  'Arial, Helvetica, sans-serif',
  'Georgia, serif',
  'Times New Roman, serif',
  'Verdana, Geneva, sans-serif',
  'Tahoma, Geneva, sans-serif',
  'Trebuchet MS, sans-serif',
];

const LIGHT_BG = '#ffffff';
const DARK_BG = '#1a1a1a';

/** Spec eşikleri: textColor < 4.5, mutedColor < 3 — iki zeminde de. */
export function contrastWarnings(visuals: SignatureData['visuals']): string[] {
  const warnings: string[] = [];
  const checks: Array<{ color: string; min: number; name: string }> = [
    { color: visuals.textColor, min: 4.5, name: 'Metin rengi' },
    { color: visuals.mutedColor, min: 3, name: 'İkincil metin rengi' },
  ];
  for (const c of checks) {
    try {
      if (contrastRatio(c.color, LIGHT_BG) < c.min)
        warnings.push(`${c.name} beyaz zeminde zor okunur.`);
      if (contrastRatio(c.color, DARK_BG) < c.min)
        warnings.push(`${c.name} koyu zeminde (dark mode) zor okunur.`);
    } catch {
      // geçersiz hex — renk seçici geçerli hex üretir, elle bozuk girişte sessiz kal
    }
  }
  return warnings;
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={labelStyle}>{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <code style={{ marginLeft: 8, fontSize: 13 }}>{value}</code>
    </label>
  );
}

export function StyleStep({
  data,
  dispatch,
}: {
  data: SignatureData;
  dispatch: (a: BuilderAction) => void;
}) {
  const warnings = contrastWarnings(data.visuals);

  return (
    <div>
      {warnings.length > 0 && (
        <div
          role="alert"
          style={{
            background: '#fff7e6',
            border: '1px solid #dca16f',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {warnings.map((w) => (
            <div key={w}>⚠️ {w}</div>
          ))}
        </div>
      )}

      <FieldGroup title="Renkler">
        <ColorField
          label="Marka rengi"
          value={data.visuals.brandColor}
          onChange={(v) => dispatch({ type: 'patchVisuals', value: { brandColor: v } })}
        />
        <ColorField
          label="Metin rengi"
          value={data.visuals.textColor}
          onChange={(v) => dispatch({ type: 'patchVisuals', value: { textColor: v } })}
        />
        <ColorField
          label="İkincil metin rengi"
          value={data.visuals.mutedColor}
          onChange={(v) => dispatch({ type: 'patchVisuals', value: { mutedColor: v } })}
        />
      </FieldGroup>

      <FieldGroup title="Tipografi ve Düzen">
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={labelStyle}>Font</span>
          <select
            style={inputStyle}
            value={data.visuals.fontFamily}
            onChange={(e) =>
              dispatch({ type: 'patchVisuals', value: { fontFamily: e.target.value as WebSafeFont } })
            }
          >
            {FONTS.map((f) => (
              <option key={f} value={f}>
                {f.split(',')[0]}
              </option>
            ))}
          </select>
        </label>

        <span style={labelStyle}>Boyut</span>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          {(['small', 'medium', 'large'] as const).map((s) => (
            <label key={s}>
              <input
                type="radio"
                name="size"
                checked={data.layout.size === s}
                onChange={() => dispatch({ type: 'patchLayout', value: { size: s } })}
              />{' '}
              {s === 'small' ? 'Küçük' : s === 'medium' ? 'Orta' : 'Büyük'}
            </label>
          ))}
        </div>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={data.layout.showDividers}
            onChange={(e) => dispatch({ type: 'patchLayout', value: { showDividers: e.target.checked } })}
          />{' '}
          Ayraç çizgisi göster
        </label>

        <label style={{ display: 'block' }}>
          <span style={labelStyle}>İkon stili (sosyal ikonlar CDN ikonlarıyla gelecek)</span>
          <select
            style={inputStyle}
            value={data.layout.iconStyle}
            onChange={(e) =>
              dispatch({
                type: 'patchLayout',
                value: { iconStyle: e.target.value as SignatureData['layout']['iconStyle'] },
              })
            }
          >
            <option value="filled">Dolu</option>
            <option value="outline">Kontur</option>
            <option value="mono">Tek renk</option>
          </select>
        </label>
      </FieldGroup>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck + commit** — Run: `corepack pnpm --filter web typecheck` → hata yok. (UI görsel doğrulaması Task 13'te — sayfa henüz bağlanmadı.)

```bash
git add apps/web/app/builder/steps apps/web/app/builder/fields.tsx
git commit -m "feat(web): add builder info, social and style steps"
```

---

### Task 12: VisualsStep (yükleme akışı)

**Files:**
- Create: `apps/web/app/builder/steps/VisualsStep.tsx`

**Interfaces:**
- Consumes: `/api/upload` (Task 6), `BuilderAction` (Task 9). (Hedef boyut ipuçları UI metninde sabittir; `KIND_TARGETS` import edilmez.)
- Produces: `<VisualsStep data dispatch />` — üç yükleme alanı (avatar/logo/el imzası): dosya seç → upload → URL state'e; uploading/hata/uyarı gösterimi; Kaldır.

- [ ] **Step 1: Bileşeni yaz** — `apps/web/app/builder/steps/VisualsStep.tsx`:

```tsx
'use client';

import { useState } from 'react';
import type { SignatureData } from '@mailmyra/renderer';
import type { BuilderAction } from '../reducer';
import { FieldGroup, labelStyle } from '../fields';

type VisualKey = 'avatarUrl' | 'logoUrl' | 'handSignatureUrl';

const SLOTS: Array<{ key: VisualKey; kind: string; title: string; hint: string }> = [
  { key: 'avatarUrl', kind: 'avatar', title: 'Profil fotoğrafı', hint: '180px, <40KB hedef' },
  { key: 'logoUrl', kind: 'logo', title: 'Şirket logosu', hint: '360px, <60KB hedef' },
  { key: 'handSignatureUrl', kind: 'handSignature', title: 'El imzası', hint: '300px, <50KB hedef' },
];

export function VisualsStep({
  data,
  dispatch,
}: {
  data: SignatureData;
  dispatch: (a: BuilderAction) => void;
}) {
  const [busy, setBusy] = useState<VisualKey | null>(null);
  const [messages, setMessages] = useState<Partial<Record<VisualKey, string>>>({});

  async function upload(slot: (typeof SLOTS)[number], file: File) {
    setBusy(slot.key);
    setMessages((m) => ({ ...m, [slot.key]: undefined }));
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('kind', slot.kind);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const body = (await res.json()) as { url?: string; error?: string; warning?: string };
      if (!res.ok || !body.url) {
        setMessages((m) => ({ ...m, [slot.key]: body.error ?? 'Yükleme başarısız.' }));
        return;
      }
      dispatch({ type: 'patchVisuals', value: { [slot.key]: body.url } });
      if (body.warning) setMessages((m) => ({ ...m, [slot.key]: `⚠️ ${body.warning}` }));
    } catch {
      setMessages((m) => ({ ...m, [slot.key]: 'Ağ hatası — tekrar deneyin.' }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {SLOTS.map((slot) => {
        const url = data.visuals[slot.key];
        return (
          <FieldGroup key={slot.key} title={slot.title}>
            <span style={labelStyle}>
              PNG, JPG veya SVG · max 5MB · {slot.hint}
            </span>
            {url ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={slot.title} style={{ maxWidth: 90, maxHeight: 90, borderRadius: 4 }} />
                <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{url}</code>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'patchVisuals', value: { [slot.key]: undefined } })}
                >
                  Kaldır
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                disabled={busy !== null}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(slot, f);
                  e.target.value = '';
                }}
              />
            )}
            {busy === slot.key && <p style={{ fontSize: 13 }}>Yükleniyor…</p>}
            {messages[slot.key] && (
              <p style={{ fontSize: 13, color: '#a05a2c' }}>{messages[slot.key]}</p>
            )}
          </FieldGroup>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit** — Run: `corepack pnpm --filter web typecheck` → hata yok.

```bash
git add apps/web/app/builder/steps/VisualsStep.tsx
git commit -m "feat(web): add visuals step with upload flow"
```

---

### Task 13: BuilderClient + Preview + /builder sayfası + mobil düzen

**Files:**
- Create: `apps/web/app/builder/builder.module.css`
- Create: `apps/web/app/builder/Preview.tsx`
- Create: `apps/web/app/builder/BuilderClient.tsx`
- Create: `apps/web/app/builder/page.tsx`

**Interfaces:**
- Consumes: her şey — reducer (T9), draft (T8), steps (T11–12), ExportButtons + wrapPreviewDoc (T10), `renderSignature` + `contrastRatio` (`@mailmyra/renderer`), `isExportGated` (T2).
- Produces: `/builder` rotası. `page.tsx` (server) `isExportGated()` okur → `<BuilderClient gated={...} />`.

- [ ] **Step 1: CSS modülü (desktop yan yana, mobil sekmeli)** — `apps/web/app/builder/builder.module.css`:

```css
.shell {
  font-family: system-ui, sans-serif;
  max-width: 1280px;
  margin: 0 auto;
  padding: 16px;
}

.columns {
  display: grid;
  grid-template-columns: minmax(380px, 1fr) minmax(420px, 1fr);
  gap: 24px;
  align-items: start;
}

.mobileTabs {
  display: none;
}

.stepTabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.stepTab {
  padding: 8px 14px;
  border: 1px solid #d5d5d5;
  border-radius: 8px 8px 0 0;
  background: #fafafa;
  cursor: pointer;
  font-size: 14px;
}

.stepTabActive {
  background: #719ad1;
  color: #fff;
  border-color: #719ad1;
}

.previewPane {
  position: sticky;
  top: 16px;
}

@media (max-width: 1023px) {
  .columns {
    grid-template-columns: 1fr;
  }
  .mobileTabs {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }
  .mobileHidden {
    display: none;
  }
  .previewPane {
    position: static;
  }
}
```

- [ ] **Step 2: Preview** — `apps/web/app/builder/Preview.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { wrapPreviewDoc } from '../../components/preview-doc';

export function Preview({ html }: { html: string }) {
  const [dark, setDark] = useState(false);
  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => setDark(false)} disabled={!dark}>
          Açık zemin
        </button>
        <button type="button" onClick={() => setDark(true)} disabled={dark}>
          Koyu zemin
        </button>
      </div>
      <iframe
        title="signature-preview"
        srcDoc={wrapPreviewDoc(html, dark ? '#1a1a1a' : '#ffffff')}
        style={{
          width: '100%',
          minHeight: 360,
          border: '1px solid #ddd',
          borderRadius: 8,
          background: dark ? '#1a1a1a' : '#fff',
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: BuilderClient** — `apps/web/app/builder/BuilderClient.tsx`:

```tsx
'use client';

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { renderSignature } from '@mailmyra/renderer';
import { builderReducer, createEmptyData } from './reducer';
import { saveDraft, loadDraft, clearDraft } from '../../lib/draft';
import { InfoStep } from './steps/InfoStep';
import { VisualsStep } from './steps/VisualsStep';
import { SocialStep } from './steps/SocialStep';
import { StyleStep } from './steps/StyleStep';
import { Preview } from './Preview';
import { ExportButtons } from '../../components/ExportButtons';
import styles from './builder.module.css';

const STEPS = [
  { id: 'info', title: 'Bilgiler' },
  { id: 'visuals', title: 'Görseller' },
  { id: 'social', title: 'Sosyal' },
  { id: 'style', title: 'Stil' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

export function BuilderClient({ gated }: { gated: boolean }) {
  const [data, dispatch] = useReducer(builderReducer, undefined, createEmptyData);
  const [step, setStep] = useState<StepId>('info');
  const [mobilePane, setMobilePane] = useState<'edit' | 'preview'>('edit');
  const [savedVisible, setSavedVisible] = useState(false);
  const loadedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Açılışta taslağı yükle (30 gün TTL draft.ts içinde).
  useEffect(() => {
    const draft = loadDraft(window.localStorage, Date.now());
    if (draft) dispatch({ type: 'load', value: draft });
    loadedRef.current = true;
  }, []);

  // Debounce'lu taslak kaydı + "Taslak kaydedildi" göstergesi.
  useEffect(() => {
    if (!loadedRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDraft(window.localStorage, data, Date.now());
      setSavedVisible(true);
      setTimeout(() => setSavedVisible(false), 2000);
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data]);

  const html = useMemo(() => renderSignature(data, data.layout.templateId), [data]);

  function resetAll() {
    if (!window.confirm('Taslak silinecek ve form sıfırlanacak. Emin misin?')) return;
    clearDraft(window.localStorage);
    dispatch({ type: 'reset' });
  }

  const editPane = (
    <div>
      <nav className={styles.stepTabs}>
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`${styles.stepTab} ${step === s.id ? styles.stepTabActive : ''}`}
            onClick={() => setStep(s.id)}
          >
            {s.title}
          </button>
        ))}
      </nav>
      {step === 'info' && <InfoStep data={data} dispatch={dispatch} />}
      {step === 'visuals' && <VisualsStep data={data} dispatch={dispatch} />}
      {step === 'social' && <SocialStep data={data} dispatch={dispatch} />}
      {step === 'style' && <StyleStep data={data} dispatch={dispatch} />}
      <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button type="button" onClick={resetAll}>
          Temizle / sıfırdan başla
        </button>
        <span
          style={{
            fontSize: 13,
            color: '#2e7d32',
            opacity: savedVisible ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        >
          Taslak kaydedildi ✓
        </span>
      </div>
    </div>
  );

  const previewPane = (
    <div className={styles.previewPane}>
      <Preview html={html} />
      <ExportButtons html={html} filename="mailmyra-imza" gated={gated} />
    </div>
  );

  return (
    <main className={styles.shell}>
      <h1 style={{ fontSize: 22 }}>İmza Oluşturucu</h1>

      <div className={styles.mobileTabs}>
        <button type="button" disabled={mobilePane === 'edit'} onClick={() => setMobilePane('edit')}>
          Düzenle
        </button>
        <button
          type="button"
          disabled={mobilePane === 'preview'}
          onClick={() => setMobilePane('preview')}
        >
          Önizle
        </button>
      </div>

      <div className={styles.columns}>
        <div className={mobilePane === 'preview' ? styles.mobileHidden : ''}>{editPane}</div>
        <div className={mobilePane === 'edit' ? styles.mobileHidden : ''}>{previewPane}</div>
      </div>
    </main>
  );
}
```

**Not (mobil davranış):** `mobileHidden` yalnızca `max-width:1023px` medya bloğunda tanımlıdır — desktop'ta iki sütun her zaman görünür, sekmeler yalnızca mobilde etkilidir.

- [ ] **Step 4: page.tsx** — `apps/web/app/builder/page.tsx`:

```tsx
import { isExportGated } from '../../lib/export-gate';
import { BuilderClient } from './BuilderClient';

export const metadata = { title: 'İmza Oluşturucu — Mailmyra' };

export default function BuilderPage() {
  return <BuilderClient gated={isExportGated()} />;
}
```

- [ ] **Step 5: Build + test** — Run: `corepack pnpm --filter web build` → başarılı. Run: `corepack pnpm -r test` → tümü PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/builder
git commit -m "feat(web): assemble /builder with steps, preview, draft and export gate"
```

---

### Task 14: Uçtan uca doğrulama (tarayıcı) + kontrol noktası

**Files:** (yalnızca doğrulama; bulunan hatalar ilgili dosyada düzeltilir)

- [ ] **Step 1: Dev ortamını hazırla** — `apps/web/.env.local` oluştur (gitignore'da):

```
CDN_WRITE_PATH=./public/cdn-dev
CDN_PUBLIC_URL=http://localhost:3000/cdn-dev
EXPORT_REQUIRES_AUTH=false
```

- [ ] **Step 2: Builder akışı** — `corepack pnpm dev:web` + tarayıcıda `/builder`:
  1. Bilgiler: ad + ünvan + e-posta doldur → önizleme anında güncelleniyor
  2. Görseller: küçük bir PNG yükle → CDN URL önizlemede görünüyor; bir SVG yükle → PNG'ye dönüşmüş URL geliyor
  3. Sosyal: LinkedIn ekle → önizlemede metin-link
  4. Stil: metin rengini açık gri yap → kontrast uyarısı beliriyor; koyu zemin toggle'ında imza koyu zeminde izleniyor
  5. "Taslak kaydedildi ✓" göstergesi çalışıyor; sayfa yenile → veriler geri geldi
  6. Temizle → onay → boş form
- [ ] **Step 3: Export kapısı iki modda** — `.env.local`'da `EXPORT_REQUIRES_AUTH=true` yap, dev sunucuyu yeniden başlat: kopyala/indir → `/login`'e gidiyor. `false` yap: kopyala panoya `text/html` koyuyor (bir e-posta taslağına yapıştırarak doğrula), `.htm` iniyor.
- [ ] **Step 4: Mobil** — tarayıcıyı 375px'e daralt: Düzenle/Önizle sekmeleri çalışıyor, yatay taşma yok.
- [ ] **Step 5: Kontrol noktası kaydı** — `docs/backlog.md`'ye "Hafta 2 kontrol noktası: kullanıcı sıfırdan imza üretip kopyalayabiliyor — doğrulandı (tarih)" satırı eklenir.
- [ ] **Step 6: Commit**

```bash
git add docs/backlog.md apps/web
git commit -m "docs: record week 2 checkpoint verification"
```

---

## Hafta 2 Bitiş Kontrolü

- `corepack pnpm -r test` → tümü yeşil (renderer + web)
- `corepack pnpm -r typecheck` → hata yok
- `corepack pnpm --filter web build` → başarılı
- `/builder` uçtan uca akış tarayıcıda doğrulandı (Task 14 listesi)
- `cleanup-orphans --dry-run` örnek klasörde doğru listeliyor

**Kapsam hatırlatması:** Yeni şablon YOK (Outlook Classic beklemede), auth YOK (`/login` placeholder), DB YOK.
