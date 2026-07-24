import { createRateLimiter } from '../../../lib/rate-limit';
import { processImage, PipelineError, type UploadKind } from '../../../lib/image-pipeline';
import { getStorageAdapter, dirSizeBytes } from '../../../lib/storage';
import { envInt } from '../../../lib/env';

const KINDS: UploadKind[] = ['logo', 'avatar', 'handSignature'];

// 5MB gerçek dosya limiti + multipart çerçeveleme/boundary/alan başlıkları
// için biraz pay. Bundan büyük bir content-length, gövdeye HİÇ dokunulmadan
// (formData() çağrılmadan) reddedilir — büyük bir gövdeyi belleğe/diske
// okumadan erken çıkış. Eksik veya ayrıştırılamayan content-length varsayılan
// olarak devam eder; gerçek boyut sınırı yine de image-pipeline'da uygulanır.
const MAX_CONTENT_LENGTH_BYTES = 5 * 1024 * 1024 + 64 * 1024;

const limiter = createRateLimiter({
  limit: envInt(process.env.UPLOAD_RATE_LIMIT_PER_HOUR, 20),
  windowMs: 60 * 60 * 1000,
});

function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

/**
 * `X-Forwarded-For` zincirinde SOL taraf istemcinin kendisidir ve serbestçe
 * sahtelenebilir (spoofable) — arkadaki proxy zincirine ekleme yapan (append
 * eden) bir kurulumda güvenilecek tek girdi SAĞ uçtaki (en son eklenen)
 * girdidir. Boş/whitespace-only değer veya header'ın kendisi yoksa 'local'.
 */
function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (!xff) return 'local';
  const last = xff.split(',').pop()?.trim();
  return last ? last : 'local';
}

export async function POST(req: Request): Promise<Response> {
  const ip = clientIp(req);
  if (!limiter.check(ip, Date.now())) {
    return jsonError(429, 'Çok fazla yükleme. Bir saat sonra tekrar deneyin.');
  }

  const contentLengthHeader = req.headers.get('content-length');
  const contentLength = contentLengthHeader === null ? NaN : Number(contentLengthHeader);
  if (Number.isFinite(contentLength) && contentLength > MAX_CONTENT_LENGTH_BYTES) {
    return jsonError(413, 'Dosya 5MB sınırını aşıyor.');
  }

  const writePath = process.env.CDN_WRITE_PATH;
  if (!writePath || !process.env.CDN_PUBLIC_URL) {
    return jsonError(500, 'Sunucu yapılandırması eksik (CDN_WRITE_PATH / CDN_PUBLIC_URL).');
  }
  const quotaBytes = envInt(process.env.CDN_DISK_QUOTA_MB, 5120) * 1024 * 1024;
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
