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
});
