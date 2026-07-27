import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { ICON_PLATFORMS, generateStaticIcons, generateColoredIcons } from '../lib/icons';

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
  it('writes 48x48 PNGs for the filled variant only (outline is now color-keyed)', async () => {
    const res = await generateStaticIcons(dir);
    expect(res.written).toBe(8);
    expect(res.skipped).toBe(0);
    const files = readdirSync(join(dir, 'icons', 'filled')).sort();
    expect(files).toEqual([...ICON_PLATFORMS].sort().map((p) => `${p}.png`));
    expect(existsSync(join(dir, 'icons', 'outline'))).toBe(false);
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
    expect(res.skipped).toBe(8);
    expect(readFileSync(target).equals(before)).toBe(true);
    expect(statSync(target).mtimeMs).toBe(mtimeBefore);
  });
});

describe('generateColoredIcons', () => {
  it('writes both outline-<hex6> and mono-<hex6> sets, lowercase and without #', async () => {
    const res = await generateColoredIcons(dir, '#3366AA');
    expect(res.lowContrast).toBe(false);
    for (const variant of ['outline-3366aa', 'mono-3366aa']) {
      const files = readdirSync(join(dir, 'icons', variant)).sort();
      expect(files).toEqual([...ICON_PLATFORMS].sort().map((p) => `${p}.png`));
    }
    const meta = await sharp(join(dir, 'icons', 'mono-3366aa', 'github.png')).metadata();
    expect(meta.width).toBe(48);
    expect(meta.hasAlpha).toBe(true);
  });
  it('renders outline and mono DIFFERENTLY for the same colour (frame vs bare glyph)', async () => {
    await generateColoredIcons(dir, '#3366aa');
    const outline = readFileSync(join(dir, 'icons', 'outline-3366aa', 'github.png'));
    const mono = readFileSync(join(dir, 'icons', 'mono-3366aa', 'github.png'));
    expect(outline.equals(mono)).toBe(false);
  });
  it('NEVER substitutes the colour: the brand default renders in its own colour', async () => {
    // Spec kararı: degrade YOK. #7b9fd3 beyaza karşı 2.71 (<3) olduğu için
    // lowContrast bayrağı kalkar ama glif YİNE #7b9fd3 basılır. Eskiden
    // #666666'ya düşerdi — bu test o davranışın geri gelmesini engeller.
    const res = await generateColoredIcons(dir, '#7b9fd3');
    expect(res.lowContrast).toBe(true);
    const brandFile = readFileSync(join(dir, 'icons', 'mono-7b9fd3', 'github.png'));
    await generateColoredIcons(dir, '#666666');
    const greyFile = readFileSync(join(dir, 'icons', 'mono-666666', 'github.png'));
    expect(brandFile.equals(greyFile)).toBe(false);
  });
  it('dedups: a second call rewrites nothing and reports the same flag', async () => {
    const first = await generateColoredIcons(dir, '#3366aa');
    const target = join(dir, 'icons', 'mono-3366aa', 'x.png');
    const mtimeBefore = statSync(target).mtimeMs;
    const second = await generateColoredIcons(dir, '#3366aa');
    expect(second).toEqual(first);
    expect(statSync(target).mtimeMs).toBe(mtimeBefore);
  });
  it('rejects an invalid hex', async () => {
    await expect(generateColoredIcons(dir, 'kırmızı')).rejects.toThrow();
  });
});
