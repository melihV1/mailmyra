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
  ) {
    super(message);
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
  try {
    const base = sharp(input, { limitInputPixels: MAX_PIXELS, density: 300 });
    const resized = base.resize({
      width: target.px,
      height: target.px,
      fit: 'inside',
      withoutEnlargement: true,
    });
    const probe = await resized.clone().png().toBuffer({ resolveWithObject: true });
    const stats = await sharp(probe.data).stats();
    const hasAlpha = !stats.isOpaque;
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
  } catch (e) {
    if (e instanceof PipelineError) throw e;
    // sharp limitInputPixels ve bozuk girdi hataları buraya düşer.
    throw new PipelineError(400, 'Görsel işlenemedi: boyutlar çok büyük veya dosya bozuk.');
  }
}
