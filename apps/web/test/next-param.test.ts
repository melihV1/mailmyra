import { describe, expect, it } from 'vitest';

import { loginRedirectPath, safeNextPath } from '../lib/auth/next-param';

describe('the ?next= parameter', () => {
  it('keeps an ordinary in-app path', () => {
    expect(safeNextPath('/app/signatures')).toBe('/app/signatures');
    expect(safeNextPath('/builder?step=2')).toBe('/builder?step=2');
  });

  it('falls back to the panel when absent or empty', () => {
    expect(safeNextPath(undefined)).toBe('/app/signatures');
    expect(safeNextPath('')).toBe('/app/signatures');
  });

  it('refuses an absolute URL — the login form must not become a redirector', () => {
    // "mailmyra.com/login?next=https://kotu.example" ile gelen bir oltalama
    // maili, girişten sonra kullanıcıyı saldırganın sitesine atardı.
    expect(safeNextPath('https://kotu.example/hesap')).toBe('/app/signatures');
    expect(safeNextPath('http://kotu.example')).toBe('/app/signatures');
  });

  it('refuses protocol-relative and backslash disguises', () => {
    // `//kotu.example` tarayıcıda mutlak adres sayılır; `/\` bazı
    // tarayıcılarda aynı kapıya çıkar.
    expect(safeNextPath('//kotu.example')).toBe('/app/signatures');
    expect(safeNextPath('/\\kotu.example')).toBe('/app/signatures');
  });

  it('refuses anything that does not start with a slash', () => {
    expect(safeNextPath('app/signatures')).toBe('/app/signatures');
    expect(safeNextPath('javascript:alert(1)')).toBe('/app/signatures');
  });
});

describe('loginRedirectPath (middleware ön kontrolü)', () => {
  it('URL-encodes a bare pathname', () => {
    expect(loginRedirectPath('/app/support', '')).toBe('/login?next=%2Fapp%2Fsupport');
  });

  it('folds the query string into the encoded next value', () => {
    const target = loginRedirectPath('/app/guides', '?client=gmail');
    // `next=` değeri tek parça URL-encode edilmiş olmalı — çözülünce yol +
    // sorgu birlikte geri gelmeli, ayrı bir `client` parametresi değil.
    const nextValue = new URL(target, 'http://mailmyra.test').searchParams.get('next');
    expect(nextValue).toBe('/app/guides?client=gmail');
  });

  it('round-trips through safeNextPath — the original path survives, not the fallback', () => {
    const target = loginRedirectPath('/app/guides', '?client=gmail');
    const nextValue = new URL(target, 'http://mailmyra.test').searchParams.get('next');
    expect(safeNextPath(nextValue ?? undefined)).toBe('/app/guides?client=gmail');
  });
});
