import { describe, expect, it } from 'vitest';

import { SESSION_COOKIE, sessionCookieOptions } from '../lib/auth/cookie';

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
