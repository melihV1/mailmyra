import { describe, expect, it } from 'vitest';

import { clientIp } from '../lib/client-ip';

/**
 * `clientIp()` HİÇBİR istemci başlığına varsayılan olarak güvenmez: ikisi de
 * (`x-iisnode-remote_addr` ve `X-Forwarded-For`) ayrı ayrı env bayrağı ister.
 * Sebebi canlıda ölçüldü (2026-09-14): önümüzde XFF'e ekleme yapan bir proxy
 * YOK ve `promoteServerVars` açık olmasına rağmen iisnode başlığı yazmıyor —
 * yani iki başlık da istemcinin serbestçe uydurabileceği değerler.
 * Bkz. docs/client-ip-never-captured.md.
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

  it('iki bayrak da açıkken x-iisnode-remote_addr XFF yerine kazanır', () => {
    const request = req({
      'x-iisnode-remote_addr': '192.0.2.10',
      'x-forwarded-for': '203.0.113.77',
    });
    expect(
      clientIp(request, { TRUST_PROXY: '1', TRUST_IISNODE_REMOTE_ADDR: '1' }),
    ).toBe('192.0.2.10');
  });

  /**
   * CANLI ÖLÇÜM (2026-09-14): iisnode kendi ölçtüğü adresi zincirin SONUNA
   * ekler. Sahte başlıkla gelen istekte parça sayısı 2 ve son parça bizim
   * gerçek IP'mizdi. Uydurma değer solda kalır ve yok sayılır — kısıt
   * atlatmanın kapandığı yer burası.
   */
  it('iisnode zincirinde EN SAĞDAKİ girdiyi alır — uydurma sol taraf yok sayılır', () => {
    const request = req({ 'x-iisnode-remote_addr': '192.0.2.250, 85.96.208.167' });
    expect(clientIp(request, { TRUST_IISNODE_REMOTE_ADDR: '1' })).toBe('85.96.208.167');
  });

  it('iisnode başlığı tek girdiliyse onu döner', () => {
    const request = req({ 'x-iisnode-remote_addr': '85.96.208.167' });
    expect(clientIp(request, { TRUST_IISNODE_REMOTE_ADDR: '1' })).toBe('85.96.208.167');
  });

  /**
   * BAYRAK KAPALIYKEN REGRESYON KORUMASI (2026-09-14). `promoteServerVars` açık
   * olmasına rağmen iisnode bu başlığı yazmıyor — ölçüldü: kendi gerçek
   * IP'miz sahte başlık olarak gönderilince AYRI rate-limit kovası açıldı.
   * İletim yokken başlığa güvenmek, istemciye "kendi kovanı seç" demektir;
   * tam da XFF'te kapattığımız açık. Bayrak kapalıyken ASLA okunmamalı.
   */
  it('bayrak kapalıyken x-iisnode-remote_addr yok sayılır (bypass regresyon koruması)', () => {
    const request = req({ 'x-iisnode-remote_addr': '192.0.2.10' });
    expect(clientIp(request, {})).toBe('local');
    expect(clientIp(request, { TRUST_IISNODE_REMOTE_ADDR: 'false' })).toBe('local');
    expect(clientIp(request, { TRUST_IISNODE_REMOTE_ADDR: '0' })).toBe('local');
    // XFF açık olsa bile güvenilmeyen iisnode başlığı araya giremez.
    expect(
      clientIp(req({ 'x-iisnode-remote_addr': '192.0.2.10', 'x-forwarded-for': '203.0.113.77' }), {
        TRUST_PROXY: '1',
      }),
    ).toBe('203.0.113.77');
  });

  it('başlık değerinin baştaki/sondaki boşluğunu kırpar', () => {
    const request = req({ 'x-iisnode-remote_addr': '   192.0.2.10   ' });
    expect(clientIp(request, { TRUST_IISNODE_REMOTE_ADDR: '1' })).toBe('192.0.2.10');
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
    expect(clientIp(request, { TRUST_IISNODE_REMOTE_ADDR: '1' })).toBe('203.0.113.5');
  });

  it('IPv4-mapped IPv6 adresini XFF üzerinde de normalize eder', () => {
    const request = req({ 'x-forwarded-for': '::ffff:203.0.113.5' });
    expect(clientIp(request, { TRUST_PROXY: '1' })).toBe('203.0.113.5');
  });

  it('düz IPv6 adresine dokunmaz', () => {
    const request = req({ 'x-iisnode-remote_addr': '2001:db8::1' });
    expect(clientIp(request, { TRUST_IISNODE_REMOTE_ADDR: '1' })).toBe('2001:db8::1');
  });

  it('dönen değeri DB kolon sınırında (VarChar(45)) keser', () => {
    const overlong = '1'.repeat(80);
    const request = req({ 'x-iisnode-remote_addr': overlong });
    const result = clientIp(request, { TRUST_IISNODE_REMOTE_ADDR: '1' });
    expect(result.length).toBe(45);
    expect(result).toBe(overlong.slice(0, 45));
  });

  it('hiçbir bayrak açık değilken "local" döner', () => {
    const request = req({ 'x-forwarded-for': '203.0.113.77' });
    expect(clientIp(request)).toBe('local');
  });
});
