import { isValidHex } from '@mailmyra/renderer';
import { createRateLimiter } from '../../../../lib/rate-limit';
import { clientIp } from '../../../../lib/client-ip';
import { envInt } from '../../../../lib/env';
import { generateMonoIcons } from '../../../../lib/icons';

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
    return jsonError(400, 'Geçersiz renk. #rrggbb formatında hex bekleniyor.');
  }

  const { degraded } = await generateMonoIcons(writePath, color);
  return Response.json(degraded ? { ready: true, degraded: true } : { ready: true });
}
