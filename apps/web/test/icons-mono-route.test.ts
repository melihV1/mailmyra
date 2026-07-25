import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type PostFn = (req: Request) => Promise<Response>;
let POST: PostFn;
let dir: string;
beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'mailmyra-mono-'));
  process.env.CDN_WRITE_PATH = dir;
  process.env.CDN_PUBLIC_URL = 'http://cdn.test';
  process.env.ICON_RATE_LIMIT_PER_HOUR = '30';
  vi.resetModules();
  ({ POST } = await import('../app/api/icons/mono/route'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function makeRequest(body: unknown, ip = '9.9.9.9'): Request {
  return new Request('http://localhost/api/icons/mono', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
  });
}

describe('POST /api/icons/mono', () => {
  it('generates 8 mono icons for a valid dark color and returns ready without degraded', async () => {
    const res = await POST(makeRequest({ color: '#3366aa' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ready).toBe(true);
    expect(body.degraded).toBeUndefined();
    expect(readdirSync(join(dir, 'icons', 'mono-3366aa'))).toHaveLength(8);
  });
  it('returns degraded: true for a near-white color, path still under the original hex', async () => {
    const res = await POST(makeRequest({ color: '#ffff00' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ready: true, degraded: true });
    expect(readdirSync(join(dir, 'icons', 'mono-ffff00'))).toHaveLength(8);
  });
  it('rejects an invalid hex with 400', async () => {
    const res = await POST(makeRequest({ color: 'kırmızı' }));
    expect(res.status).toBe(400);
  });
  it('rejects a missing/malformed body with 400', async () => {
    const res = await POST(
      new Request('http://localhost/api/icons/mono', {
        method: 'POST',
        body: 'not-json',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.9' },
      }),
    );
    expect(res.status).toBe(400);
  });
  it('returns 500 when CDN env config is missing', async () => {
    delete process.env.CDN_WRITE_PATH;
    const res = await POST(makeRequest({ color: '#719ad1' }));
    expect(res.status).toBe(500);
  });
  it('enforces the per-ip rate limit with 429 (separate, more generous limiter than upload)', async () => {
    process.env.ICON_RATE_LIMIT_PER_HOUR = '2';
    vi.resetModules();
    ({ POST } = await import('../app/api/icons/mono/route'));
    // Aynı renk → ikinci istek dedup hızlı yolundan döner ama limiti YİNE tüketir
    expect((await POST(makeRequest({ color: '#719ad1' }, '5.5.5.5'))).status).toBe(200);
    expect((await POST(makeRequest({ color: '#719ad1' }, '5.5.5.5'))).status).toBe(200);
    expect((await POST(makeRequest({ color: '#719ad1' }, '5.5.5.5'))).status).toBe(429);
  });
});
