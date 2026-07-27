import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { isValidHex, normalizeHex } from '@mailmyra/renderer';
import { createRateLimiter } from '../../../lib/rate-limit';
import { clientIp } from '../../../lib/client-ip';
import { envInt } from '../../../lib/env';
import { generateColoredIcons } from '../../../lib/icons';

// Bir renk İKİ dizin üretir (outline-<hex6> + mono-<hex6>); tavan RENK
// sayısına uygulanır, dizin sayısına değil — bu yüzden hex'ler tekilleştirilir.
const COLOR_DIR_RE = /^(?:outline|mono)-([0-9a-f]{6})$/;

// Upload limiter'ından AYRI ve daha cömert: renk denemeleri normal
// kullanımdır; her brandColor değişikliği (debounce sonrası) bir POST.
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

  // Kota tavanı: spoofable IP × 16.7M olası renk, ikon dizinlerini sınırsız
  // çoğaltabilir. cleanup-orphans icons/ altını taramaz ve dirSizeBytes
  // yalnızca üst düzey dosyalara bakar — disk büyümesini başka hiçbir
  // mekanizma yakalamaz.
  const cap = envInt(process.env.ICON_COLOR_CAP, 256);
  const requestedHex = normalizeHex(color).slice(1);
  let existingDirs: string[];
  try {
    existingDirs = await readdir(join(writePath, 'icons'));
  } catch {
    existingDirs = [];
  }
  const colors = new Set<string>();
  for (const name of existingDirs) {
    const m = COLOR_DIR_RE.exec(name);
    if (m?.[1]) colors.add(m[1]);
  }
  if (colors.size >= cap && !colors.has(requestedHex)) {
    return jsonError(507, 'İkon depolama tavanına ulaşıldı. Yönetici ile iletişime geçin.');
  }

  try {
    const { lowContrast } = await generateColoredIcons(writePath, color);
    return Response.json(lowContrast ? { ready: true, lowContrast: true } : { ready: true });
  } catch {
    return jsonError(500, 'İkon üretimi başarısız oldu. Tekrar deneyin.');
  }
}
