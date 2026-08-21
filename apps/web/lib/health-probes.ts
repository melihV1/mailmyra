import nodemailer from 'nodemailer';

import type { SmtpConfig } from './mail/config';
import { readSmtpConfig } from './mail/config';
import { smtpTransportOptions } from './mail/smtp';

/**
 * SMTP/CDN sağlık probları — Platform → Services ekranının canlı ölçümü
 * (tasarım: docs/superpowers/specs/2026-08-21-health-probes-design.md).
 *
 * Sözleşme: yapılandırma yoksa ağa HİÇ çıkılmaz (`unknown`) — testler ve
 * CI bu sayede ağsız koşar. `uptime` burada ÜRETİLMEZ: tarihçe defteri
 * olmadan yüzde uydurulmaz. `deps` enjeksiyonu yalnız test içindir.
 */
export interface ProbeResult {
  state: 'operational' | 'degraded' | 'outage' | 'unknown';
  latencyMs: number | null;
  /** Ekran kullanmıyor; teşhis ve test için. */
  detail: string | null;
}

const message = (err: unknown): string =>
  (err instanceof Error ? err.message : String(err)).slice(0, 200);

/** Sonuca `'timeout'` nöbetçisiyle yarıştırır; zamanlayıcı süreci tutmaz. */
async function raceTimeout<T>(work: Promise<T>, ms: number): Promise<T | 'timeout'> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const sentinel = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), ms);
    timer.unref?.();
  });
  try {
    return await Promise.race([work, sentinel]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface SmtpProbeDeps {
  verify?: (config: SmtpConfig) => Promise<void>;
}

/** Gerçek yoklama: bağlan + EHLO (+varsa auth) — posta GÖNDERMEZ. */
async function realVerify(config: SmtpConfig): Promise<void> {
  const transporter = nodemailer.createTransport(smtpTransportOptions(config));
  try {
    await transporter.verify();
  } finally {
    transporter.close();
  }
}

export async function probeSmtp(
  env: Record<string, string | undefined> = process.env,
  timeoutMs = 3000,
  deps: SmtpProbeDeps = {},
): Promise<ProbeResult> {
  const result = readSmtpConfig(env);
  if (!result.ok) return { state: 'unknown', latencyMs: null, detail: 'SMTP not configured' };

  const verify = deps.verify ?? realVerify;
  const start = Date.now();
  try {
    const raced = await raceTimeout(verify(result.config), timeoutMs);
    if (raced === 'timeout') return { state: 'outage', latencyMs: null, detail: 'timeout' };
    return { state: 'operational', latencyMs: Date.now() - start, detail: null };
  } catch (err) {
    return { state: 'outage', latencyMs: null, detail: message(err) };
  }
}

export interface CdnProbeDeps {
  fetchImpl?: typeof fetch;
}

export async function probeCdn(
  url: string | undefined = process.env.CDN_PUBLIC_URL,
  timeoutMs = 3000,
  deps: CdnProbeDeps = {},
): Promise<ProbeResult> {
  if (!url) return { state: 'unknown', latencyMs: null, detail: 'CDN_PUBLIC_URL not set' };

  const fetchImpl = deps.fetchImpl ?? fetch;
  const start = Date.now();
  try {
    // 403/404 de vhost'un servis verdiğinin kanıtıdır — eşik yalnız 5xx.
    const res = await fetchImpl(url, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    const latencyMs = Date.now() - start;
    if (res.status >= 500) return { state: 'degraded', latencyMs, detail: `HTTP ${res.status}` };
    return { state: 'operational', latencyMs, detail: null };
  } catch (err) {
    // AbortSignal.timeout Node'da 'TimeoutError', sinyalli iptal 'AbortError' adıyla gelir.
    const name = err instanceof Error ? err.name : '';
    const timedOut = name === 'TimeoutError' || name === 'AbortError';
    return { state: 'outage', latencyMs: null, detail: timedOut ? 'timeout' : message(err) };
  }
}
