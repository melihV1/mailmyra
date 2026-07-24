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
const gifImage = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(20)]);

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
});
