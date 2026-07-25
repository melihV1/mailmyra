import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { ICON_PLATFORMS, generateStaticIcons, generateMonoIcons } from '../lib/icons';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mailmyra-icons-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('ICON_PLATFORMS', () => {
  it('contains exactly the 8 supported platforms', () => {
    expect([...ICON_PLATFORMS].sort()).toEqual([
      'behance', 'dribbble', 'facebook', 'github',
      'instagram', 'linkedin', 'x', 'youtube',
    ]);
  });
});

describe('generateStaticIcons', () => {
  it('writes 48x48 PNGs for filled and outline variants of all platforms', async () => {
    const res = await generateStaticIcons(dir);
    expect(res.written).toBe(16);
    expect(res.skipped).toBe(0);
    for (const variant of ['filled', 'outline'] as const) {
      const files = readdirSync(join(dir, 'icons', variant)).sort();
      expect(files).toEqual([...ICON_PLATFORMS].sort().map((p) => `${p}.png`));
    }
    const meta = await sharp(join(dir, 'icons', 'filled', 'github.png')).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(48);
    expect(meta.height).toBe(48);
  });
  it('is idempotent: a second run skips every existing file untouched (immutability)', async () => {
    await generateStaticIcons(dir);
    const target = join(dir, 'icons', 'filled', 'github.png');
    const before = readFileSync(target);
    const mtimeBefore = statSync(target).mtimeMs;
    const res = await generateStaticIcons(dir);
    expect(res.written).toBe(0);
    expect(res.skipped).toBe(16);
    expect(readFileSync(target).equals(before)).toBe(true);
    expect(statSync(target).mtimeMs).toBe(mtimeBefore);
  });
});

describe('generateMonoIcons', () => {
  it('writes 8 PNGs under icons/mono-<hex6> (lowercase, no #) and reports degraded=false for a dark color', async () => {
    const res = await generateMonoIcons(dir, '#3366AA');
    expect(res.degraded).toBe(false);
    const files = readdirSync(join(dir, 'icons', 'mono-3366aa')).sort();
    expect(files).toEqual([...ICON_PLATFORMS].sort().map((p) => `${p}.png`));
    const meta = await sharp(join(dir, 'icons', 'mono-3366aa', 'github.png')).metadata();
    expect(meta.width).toBe(48);
    expect(meta.hasAlpha).toBe(true);
  });
  it('degrades the DEFAULT brand color #719ad1 (contrast vs white ≈2.90 < 3) — documents product-visible behavior', async () => {
    // Bilinçli belgeleme: varsayılan marka rengiyle mono ikonlar #666666
    // glifle basılır ve builder Stil adımında bilgi notu görünür. Ürün
    // kararı değişirse (eşik veya varsayılan renk) bu test onu yakalar.
    const res = await generateMonoIcons(dir, '#719ad1');
    expect(res.degraded).toBe(true);
  });
  it('degrades a near-white color to the #666666 glyph but keeps the ORIGINAL hex in the path', async () => {
    const res = await generateMonoIcons(dir, '#ffffff');
    expect(res.degraded).toBe(true);
    // Yol orijinal hex ile — URL deterministik kalır (spec §3b)
    const degradedFile = join(dir, 'icons', 'mono-ffffff', 'github.png');
    // Glif gerçekten #666666 ile basılmış olmalı: doğrudan #666666 üretimiyle bayt-eş
    await generateMonoIcons(dir, '#666666');
    const reference = join(dir, 'icons', 'mono-666666', 'github.png');
    expect(readFileSync(degradedFile).equals(readFileSync(reference))).toBe(true);
  });
  it('dedups: when all files exist the second call still succeeds and reports the same degraded flag', async () => {
    const first = await generateMonoIcons(dir, '#3366aa');
    const target = join(dir, 'icons', 'mono-3366aa', 'x.png');
    const mtimeBefore = statSync(target).mtimeMs;
    const second = await generateMonoIcons(dir, '#3366aa');
    expect(second).toEqual(first);
    expect(statSync(target).mtimeMs).toBe(mtimeBefore);
  });
  it('rejects an invalid hex', async () => {
    await expect(generateMonoIcons(dir, 'kırmızı')).rejects.toThrow();
  });
});
