import { describe, expect, it, vi } from 'vitest';

import { probeCdn, probeSmtp } from '../lib/health-probes';

/**
 * Prob sözleşmesi: yapılandırma yoksa ağa HİÇ çıkılmaz (`unknown`) — CI
 * güvenliği bundadır; yapılandırma varsa sonuç dört durumdan biridir ve
 * gecikme gerçekten ölçülür. Sahte verify/fetch enjekte edilir.
 */

const SMTP_ENV = {
  MAIL_HOST: 'smtp.example.com',
  MAIL_PORT: '587',
  MAIL_USER: 'u',
  MAIL_PASS: 'p',
  MAIL_FROM: 'Mailmyra <no-reply@mailmyra.com>',
};

describe('probeSmtp', () => {
  it('yapılandırma yoksa unknown döner ve verify hiç çağrılmaz', async () => {
    const verify = vi.fn();
    const res = await probeSmtp({}, 1000, { verify });

    expect(res.state).toBe('unknown');
    expect(res.latencyMs).toBeNull();
    expect(verify).not.toHaveBeenCalled();
  });

  it('verify başarılıysa operational + ölçülmüş gecikme', async () => {
    const res = await probeSmtp(SMTP_ENV, 1000, { verify: async () => {} });

    expect(res.state).toBe('operational');
    expect(res.latencyMs).toBeTypeOf('number');
    expect(res.latencyMs).toBeGreaterThanOrEqual(0);
    expect(res.detail).toBeNull();
  });

  it('verify hatası outage + sebep', async () => {
    const res = await probeSmtp(SMTP_ENV, 1000, {
      verify: async () => {
        throw new Error('ECONNREFUSED 127.0.0.1:587');
      },
    });

    expect(res.state).toBe('outage');
    expect(res.detail).toContain('ECONNREFUSED');
  });

  it('asılı kalan verify zaman aşımında outage/timeout olur', async () => {
    const res = await probeSmtp(SMTP_ENV, 50, { verify: () => new Promise(() => {}) });

    expect(res.state).toBe('outage');
    expect(res.detail).toBe('timeout');
  });
});

describe('probeCdn', () => {
  const okFetch = (status: number): typeof fetch =>
    (async () => ({ status })) as unknown as typeof fetch;

  it('URL yoksa unknown döner ve fetch hiç çağrılmaz', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const res = await probeCdn(undefined, 1000, { fetchImpl });

    expect(res.state).toBe('unknown');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('HTTP yanıtı <500 ise operational (404 de vhost kanıtıdır)', async () => {
    expect((await probeCdn('https://cdn.mailmyra.com', 1000, { fetchImpl: okFetch(200) })).state).toBe('operational');
    expect((await probeCdn('https://cdn.mailmyra.com', 1000, { fetchImpl: okFetch(404) })).state).toBe('operational');
  });

  it('5xx yanıt degraded', async () => {
    const res = await probeCdn('https://cdn.mailmyra.com', 1000, { fetchImpl: okFetch(503) });
    expect(res.state).toBe('degraded');
    expect(res.detail).toBe('HTTP 503');
  });

  it('ağ hatası outage + sebep', async () => {
    const fetchImpl = (async () => {
      throw new Error('getaddrinfo ENOTFOUND cdn.mailmyra.com');
    }) as unknown as typeof fetch;

    const res = await probeCdn('https://cdn.mailmyra.com', 1000, { fetchImpl });
    expect(res.state).toBe('outage');
    expect(res.detail).toContain('ENOTFOUND');
  });

  it('zaman aşımı outage/timeout', async () => {
    // Sahte fetch abort sinyaline uyar — gerçek fetch'in davranışı.
    const hangingFetch = ((_url: unknown, init?: { signal?: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError')),
        );
      })) as unknown as typeof fetch;

    const res = await probeCdn('https://cdn.mailmyra.com', 50, { fetchImpl: hangingFetch });
    expect(res.state).toBe('outage');
    expect(res.detail).toBe('timeout');
  });
});
