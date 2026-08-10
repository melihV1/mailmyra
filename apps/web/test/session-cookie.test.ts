import { describe, expect, it } from 'vitest';

import {
  SESSION_COOKIE,
  clearSessionCookieHeader,
  sessionCookieHeader,
  sessionCookieOptions,
} from '../lib/auth/cookie';

describe('the session cookie', () => {
  it('is unreachable from JavaScript', () => {
    // XSS'in oturumu çalmasını engelleyen tek şey bu bayrak.
    expect(sessionCookieOptions({ NODE_ENV: 'production' }).httpOnly).toBe(true);
  });

  it('is marked Secure in production', () => {
    expect(sessionCookieOptions({ NODE_ENV: 'production' }).secure).toBe(true);
  });

  it('drops Secure in development so http://localhost can log in', () => {
    // Bu bayrak geliştirmede açık kalırsa tarayıcı çerezi hiç yazmaz ve
    // giriş sessizce çalışmaz — hata mesajı da vermez.
    expect(sessionCookieOptions({ NODE_ENV: 'development' }).secure).toBe(false);
  });

  it('uses SameSite=Lax', () => {
    // Strict olsaydı e-postadaki doğrulama linkinden gelen kullanıcı çıkış
    // yapmış görünürdü. Lax, CSRF'in GET olmayan halini keser.
    expect(sessionCookieOptions({}).sameSite).toBe('lax');
  });

  it('is scoped to the whole site', () => {
    expect(sessionCookieOptions({}).path).toBe('/');
  });

  it('lives thirty days', () => {
    expect(sessionCookieOptions({}).maxAge).toBe(30 * 24 * 60 * 60);
  });

  it('has a name that does not advertise the framework', () => {
    expect(SESSION_COOKIE).toBe('mm_session');
  });
});

describe('the Set-Cookie header', () => {
  it('carries every attribute the options promise', () => {
    const header = sessionCookieHeader('TOKEN123', { NODE_ENV: 'production' });

    expect(header).toBe(
      'mm_session=TOKEN123; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax; Secure',
    );
  });

  it('drops only Secure outside production', () => {
    expect(sessionCookieHeader('TOKEN123', { NODE_ENV: 'development' })).toBe(
      'mm_session=TOKEN123; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax',
    );
  });

  it('clearing sets an empty value that expires immediately', () => {
    const header = clearSessionCookieHeader({ NODE_ENV: 'production' });

    expect(header).toContain('mm_session=;');
    expect(header).toContain('Max-Age=0');
    // Silme çerezi de aynı Path'i taşımalı; taşımazsa tarayıcı ikisini ayrı
    // çerez sayar ve çıkış yapılamaz.
    expect(header).toContain('Path=/');
  });
});
