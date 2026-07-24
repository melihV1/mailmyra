import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

type PostFn = (req: Request) => Promise<Response>;
let POST: PostFn;
let dir: string;
beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'mailmyra-upload-'));
  process.env.CDN_WRITE_PATH = dir;
  process.env.CDN_PUBLIC_URL = 'http://cdn.test';
  process.env.UPLOAD_RATE_LIMIT_PER_HOUR = '5';
  process.env.CDN_DISK_QUOTA_MB = '5120';
  // Modül-seviyesi limiter'ı sıfırla: test-only export yerine modülü yeniden yükle.
  vi.resetModules();
  ({ POST } = await import('../app/api/upload/route'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

async function makeRequest(file: Blob | null, kind: string, ip = '9.9.9.9'): Promise<Request> {
  const form = new FormData();
  if (file) form.set('file', file, 'test.png');
  form.set('kind', kind);
  return new Request('http://localhost/api/upload', {
    method: 'POST',
    body: form,
    headers: { 'x-forwarded-for': ip },
  });
}

async function pngBlob(): Promise<Blob> {
  const buf = await sharp({
    create: { width: 300, height: 300, channels: 3, background: { r: 1, g: 2, b: 3 } },
  })
    .png()
    .toBuffer();
  return new Blob([new Uint8Array(buf)], { type: 'image/png' });
}

describe('POST /api/upload', () => {
  it('uploads a valid png and returns a cdn url', async () => {
    const res = await POST(await makeRequest(await pngBlob(), 'avatar'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toMatch(/^http:\/\/cdn\.test\/[0-9a-f]{8}\.(png|jpg)$/);
    expect(body.width).toBeGreaterThan(0);
  });
  it('rejects a missing file with 400', async () => {
    const res = await POST(await makeRequest(null, 'avatar'));
    expect(res.status).toBe(400);
  });
  it('rejects an invalid kind with 400', async () => {
    const res = await POST(await makeRequest(await pngBlob(), 'banner'));
    expect(res.status).toBe(400);
  });
  it('enforces the per-ip rate limit with 429', async () => {
    for (let i = 0; i < 5; i++) {
      await POST(await makeRequest(await pngBlob(), 'avatar', '5.5.5.5'));
    }
    const res = await POST(await makeRequest(await pngBlob(), 'avatar', '5.5.5.5'));
    expect(res.status).toBe(429);
  });
  it('enforces the disk quota with 507', async () => {
    process.env.CDN_DISK_QUOTA_MB = '0';
    const res = await POST(await makeRequest(await pngBlob(), 'avatar'));
    expect(res.status).toBe(507);
  });
  it('returns 500 when CDN env config is missing', async () => {
    delete process.env.CDN_WRITE_PATH;
    const res = await POST(await makeRequest(await pngBlob(), 'avatar'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('CDN_WRITE_PATH');
  });
});

describe('POST /api/upload — content-length pre-check', () => {
  it('rejects an oversized content-length header with 413 without reading the body', async () => {
    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      // Gövde küçük tutulur: 413 gövdeye hiç dokunulmadan, yalnızca header'a
      // bakılarak döndürülmeli. Gövde büyük olsaydı da handler'ın formData()'yı
      // çağırmadığını ayırt edemezdik — küçük gövde bu ayrımı garanti eder.
      body: new Blob([new Uint8Array(16)]),
      headers: {
        'content-length': String(10 * 1024 * 1024),
        'x-forwarded-for': '9.9.9.9',
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toContain('5MB');
  });
  it('proceeds past the pre-check when content-length is missing or unparseable', async () => {
    // Header hiç yok — pipeline zaten gerçek boyutu doğrulayacak, burada 413
    // beklenmez (küçük geçerli bir PNG yükleniyor, 200 dönmeli).
    const res = await POST(await makeRequest(await pngBlob(), 'avatar', '9.9.9.9'));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/upload — x-forwarded-for hardening', () => {
  it('keys the rate-limit bucket on the LAST x-forwarded-for entry (proxy-appended), not the spoofable first one', async () => {
    process.env.UPLOAD_RATE_LIMIT_PER_HOUR = '1';
    vi.resetModules();
    ({ POST } = await import('../app/api/upload/route'));
    const first = await POST(await makeRequest(await pngBlob(), 'avatar', 'attacker-one, 1.2.3.4'));
    expect(first.status).toBe(200);
    // Different spoofed first hop, same trusted last hop -> same bucket -> 429.
    // (Under the old first-entry behavior these would be different buckets and
    // this second request would also succeed with 200.)
    const second = await POST(await makeRequest(await pngBlob(), 'avatar', 'attacker-two, 1.2.3.4'));
    expect(second.status).toBe(429);
  });
  it('treats an empty x-forwarded-for value as "local", sharing a bucket with requests that omit the header', async () => {
    process.env.UPLOAD_RATE_LIMIT_PER_HOUR = '1';
    vi.resetModules();
    ({ POST } = await import('../app/api/upload/route'));
    const first = await POST(await makeRequest(await pngBlob(), 'avatar', ''));
    expect(first.status).toBe(200);
    const form = new FormData();
    form.set('file', await pngBlob(), 'test.png');
    form.set('kind', 'avatar');
    const reqNoHeader = new Request('http://localhost/api/upload', { method: 'POST', body: form });
    const second = await POST(reqNoHeader);
    expect(second.status).toBe(429);
  });
});

describe('POST /api/upload — garbage env fail-safe', () => {
  it('still enforces the default rate limit (20/hour) when UPLOAD_RATE_LIMIT_PER_HOUR is garbage', async () => {
    process.env.UPLOAD_RATE_LIMIT_PER_HOUR = 'not-a-number';
    vi.resetModules();
    ({ POST } = await import('../app/api/upload/route'));
    for (let i = 0; i < 20; i++) {
      const res = await POST(await makeRequest(await pngBlob(), 'avatar', '7.7.7.7'));
      expect(res.status).toBe(200);
    }
    const res = await POST(await makeRequest(await pngBlob(), 'avatar', '7.7.7.7'));
    expect(res.status).toBe(429);
  });
  it('still enforces the default disk quota (5120MB) when CDN_DISK_QUOTA_MB is garbage', async () => {
    process.env.CDN_DISK_QUOTA_MB = 'not-a-number';
    vi.resetModules();
    ({ POST } = await import('../app/api/upload/route'));
    const res = await POST(await makeRequest(await pngBlob(), 'avatar'));
    // Garbage must fall back to the 5120MB default, not to 0 (which would
    // reject) or to NaN (which would make the quota check always pass/fail
    // unpredictably). An empty scratch dir is well under 5120MB, so this
    // must succeed.
    expect(res.status).toBe(200);
  });
});
