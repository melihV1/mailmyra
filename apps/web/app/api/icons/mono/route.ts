import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { isValidHex, normalizeHex } from '@mailmyra/renderer';
import { createRateLimiter } from '../../../../lib/rate-limit';
import { clientIp } from '../../../../lib/client-ip';
import { envInt } from '../../../../lib/env';
import { generateMonoIcons } from '../../../../lib/icons';

const MONO_DIR_RE = /^mono-[0-9a-f]{6}$/;

// Upload limiter'ından AYRI ve daha cömert (spec §3b): renk denemeleri
// normal kullanımdır; her brandColor değişikliği (debounce sonrası) bir POST.
const limiter = createRateLimiter({
  limit: envInt(process.env.ICON_RATE_LIMIT_PER_HOUR, 60),
  windowMs: 60 * 60 * 1000,
});

function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

export async function POST(req: Request): Promise<Response> {
  const ip = clientIp(req);
  if (!limiter.check(ip, Date.now())) {
    return jsonError(429, 'Çok fazla ikon isteği. Bir saat sonra tekrar deneyin.');
  }

  const writePath = process.env.CDN_WRITE_PATH;
  if (!writePath) {
    return jsonError(500, 'Sunucu yapılandırması eksik (CDN_WRITE_PATH).');
  }

  let color: unknown;
  try {
    ({ color } = (await req.json()) as { color?: unknown });
  } catch {
    return jsonError(400, 'Geçersiz istek gövdesi.');
  }
  if (typeof color !== 'string' || !isValidHex(color)) {
    return jsonError(400, 'Geçersiz renk. #rgb veya #rrggbb formatında hex bekleniyor.');
  }

  // Kota tavanı: spoofable IP × 16.7M olası renk kombinasyonu mono-<hex6>
  // dizinlerini sınırsız çoğaltabilir. cleanup-orphans icons/ altını hiç
  // taramaz ve dirSizeBytes yalnızca üst düzey dosyalara bakar — bu yüzden
  // disk büyümesi hiçbir mevcut mekanizma tarafından yakalanmaz.
  const cap = envInt(process.env.ICON_MONO_DIR_CAP, 256);
  const requestedDir = `mono-${normalizeHex(color).slice(1)}`;
  let existingDirs: string[];
  try {
    existingDirs = await readdir(join(writePath, 'icons'));
  } catch {
    existingDirs = [];
  }
  const monoDirs = existingDirs.filter((name) => MONO_DIR_RE.test(name));
  if (monoDirs.length >= cap && !monoDirs.includes(requestedDir)) {
    return jsonError(507, 'İkon depolama tavanına ulaşıldı. Yönetici ile iletişime geçin.');
  }

  try {
    const { degraded } = await generateMonoIcons(writePath, color);
    return Response.json(degraded ? { ready: true, degraded: true } : { ready: true });
  } catch {
    return jsonError(500, 'İkon üretimi başarısız oldu. Tekrar deneyin.');
  }
}
