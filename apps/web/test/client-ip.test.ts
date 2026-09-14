import { describe, expect, it } from 'vitest';

import { clientIp } from '../lib/client-ip';

/**
 * `clientIp()` artık tek başlığa (`X-Forwarded-For`) değil, iisnode'un IIS'ten
 * gördüğü gerçek TCP karşı tarafını ilettiği `x-iisnode-remote_addr`'a
 * güveniyor; `X-Forwarded-For` yalnız `TRUST_PROXY` açıkken (ve o zaman da
 * sağ uçtaki girdiyle) devreye giriyor. Bkz. docs/client-ip-never-captured.md.
 */
function req(headers: Record<string, string> = {}): Request {
  return new Request('https://app.mailmyra.com/api/leads', { headers });
}

describe('clientIp', () => {
  it('hiçbir başlık yoksa "local"a düşer', () => {
    expect(clientIp(req())).toBe('local');
  });

  it('XFF varken TRUST_PROXY kapalıysa yine "local" döner (bypass regresyon koruması)', () => {
    const request = req({ 'x-forwarded-for': '203.0.113.77' });
    expect(clientIp(request, {})).toBe('local');
    expect(clientIp(request, { TRUST_PROXY: 'false' })).toBe('local');
    expect(clientIp(request, { TRUST_PROXY: '0' })).toBe('local');
  });

  it('XFF varken TRUST_PROXY açıksa zincirin en sağındaki girdiyi döner', () => {
    const request = req({ 'x-forwarded-for': '198.51.100.1, 203.0.113.5, 203.0.113.9' });
    expect(clientIp(request, { TRUST_PROXY: '1' })).toBe('203.0.113.9');
  });

  it('TRUST_PROXY "true" string değerini de açık kabul eder', () => {
    const request = req({ 'x-forwarded-for': '203.0.113.9' });
    expect(clientIp(request, { TRUST_PROXY: 'true' })).toBe('203.0.113.9');
  });

  it('her iki başlık da varsa x-iisnode-remote_addr kazanır, TRUST_PROXY açık olsa bile', () => {
    const request = req({
      'x-iisnode-remote_addr': '192.0.2.10',
      'x-forwarded-for': '203.0.113.77',
    });
    expect(clientIp(request, { TRUST_PROXY: '1' })).toBe('192.0.2.10');
    expect(clientIp(request, {})).toBe('192.0.2.10');
  });

  it('başlık değerinin baştaki/sondaki boşluğunu kırpar', () => {
    const request = req({ 'x-iisnode-remote_addr': '   192.0.2.10   ' });
    expect(clientIp(request)).toBe('192.0.2.10');
  });

  it('boş ya da yalnız boşluktan oluşan x-iisnode-remote_addr bir sonraki kaynağa düşer, "" dönmez', () => {
    const request = req({
      'x-iisnode-remote_addr': '   ',
      'x-forwarded-for': '203.0.113.9',
    });
    expect(clientIp(request, { TRUST_PROXY: '1' })).toBe('203.0.113.9');
    expect(clientIp(request, {})).toBe('local');
  });

  it('boş ya da yalnız boşluktan oluşan XFF "local"a düşer, "" dönmez', () => {
    const request = req({ 'x-forwarded-for': '   ' });
    expect(clientIp(request, { TRUST_PROXY: '1' })).toBe('local');
  });

  it('IPv4-mapped IPv6 adresini düz IPv4e normalize eder (x-iisnode-remote_addr)', () => {
    const request = req({ 'x-iisnode-remote_addr': '::ffff:203.0.113.5' });
    expect(clientIp(request)).toBe('203.0.113.5');
  });

  it('IPv4-mapped IPv6 adresini XFF üzerinde de normalize eder', () => {
    const request = req({ 'x-forwarded-for': '::ffff:203.0.113.5' });
    expect(clientIp(request, { TRUST_PROXY: '1' })).toBe('203.0.113.5');
  });

  it('düz IPv6 adresine dokunmaz', () => {
    const request = req({ 'x-iisnode-remote_addr': '2001:db8::1' });
    expect(clientIp(request)).toBe('2001:db8::1');
  });

  it('dönen değeri DB kolon sınırında (VarChar(45)) keser', () => {
    const overlong = '1'.repeat(80);
    const request = req({ 'x-iisnode-remote_addr': overlong });
    const result = clientIp(request);
    expect(result.length).toBe(45);
    expect(result).toBe(overlong.slice(0, 45));
  });

  it('x-iisnode-remote_addr yoksa ve TRUST_PROXY kapalıysa "local" döner', () => {
    const request = req({ 'x-forwarded-for': '203.0.113.77' });
    expect(clientIp(request)).toBe('local');
  });
});
