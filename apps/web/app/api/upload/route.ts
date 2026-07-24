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
