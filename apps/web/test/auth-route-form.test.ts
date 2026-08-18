import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Route seviyesinde davranış testi: aynı uç iki istemciye iki farklı cevap
 * veriyor — panele JSON, pazarlama sitesinin düz formuna 303 yönlendirme.
 *
 * `flows` ve `mail` taklit ediliyor; amaç veritabanı davranışı değil (o
 * `flows.ts`in kendi testlerinde, gerçek DB'ye karşı koşuyor), **HTTP
 * çevirisinin** doğruluğu. DB'siz koştuğu için CI'da her zaman çalışır.
 *
 * JSON yolunun burada olması kritik: canlıda çalışan giriş o yol. Form
 * desteği eklenirken sessizce bozulursa kimse panele giremez.
 */

const login = vi.fn();
const register = vi.fn();

vi.mock('../lib/auth/flows', () => ({
  login: (...args: unknown[]) => login(...args),
  register: (...args: unknown[]) => register(...args),
}));

vi.mock('../lib/mail', () => ({ getMailer: () => ({}) }));

vi.mock('../lib/client-ip', () => ({ clientIp: () => '203.0.113.1' }));

const { POST: loginPOST } = await import('../app/api/auth/login/route');
const { POST: registerPOST } = await import('../app/api/auth/register/route');

function formReq(url: string, pairs: Record<string, string>): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(pairs),
  });
}

function jsonReq(url: string, payload: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

beforeEach(() => {
  login.mockReset();
  register.mockReset();
  process.env.MARKETING_ORIGIN = 'https://mailmyra.com';
});

describe('login ucu', () => {
  it('form + hatalı bilgi -> 303, sayfaya hata koduyla döner', async () => {
    login.mockResolvedValue({ ok: false, reason: 'invalid_credentials' });

    const res = await loginPOST(
      formReq('https://app.mailmyra.com/api/auth/login', {
        email: 'a@b.com',
        password: 'nope',
      }),
    );

    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe(
      'https://mailmyra.com/login.html?error=invalid_credentials',
    );
    // Ziyaretçi ham JSON görmemeli.
    expect(await res.text()).toBe('');
  });

  it('form + rate limit -> yine sayfaya döner, 429 JSON değil', async () => {
    login.mockResolvedValue({ ok: false, reason: 'rate_limited', retryAfterSeconds: 60 });

    const res = await loginPOST(
      formReq('https://app.mailmyra.com/api/auth/login', { email: 'a@b.com', password: 'x' }),
    );

    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toContain('error=rate_limited');
  });

  it('form + başarı -> 303 panele, çerez cevapta', async () => {
    login.mockResolvedValue({ ok: true, sessionToken: 'tok123' });

    const res = await loginPOST(
      formReq('https://app.mailmyra.com/api/auth/login', {
        email: 'a@b.com',
        password: 'right',
      }),
    );

    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/app/signatures');
    const cookie = res.headers.get('Set-Cookie') ?? '';
    expect(cookie).toContain('mm_session=tok123');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  // ---- REGRESYON: panelin kullandığı JSON yolu ----

  it('JSON + hatalı bilgi -> 401 JSON (eskisi gibi)', async () => {
    login.mockResolvedValue({ ok: false, reason: 'invalid_credentials' });

    const res = await loginPOST(
      jsonReq('https://app.mailmyra.com/api/auth/login', {
        email: 'a@b.com',
        password: 'nope',
      }),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'invalid_credentials' });
  });

  it('JSON + rate limit -> 429 ve Retry-After başlığı korunur', async () => {
    login.mockResolvedValue({ ok: false, reason: 'rate_limited', retryAfterSeconds: 90 });

    const res = await loginPOST(
      jsonReq('https://app.mailmyra.com/api/auth/login', { email: 'a@b.com', password: 'x' }),
    );

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('90');
  });

  it('JSON + başarı -> 200 ve çerez (eskisi gibi)', async () => {
    login.mockResolvedValue({ ok: true, sessionToken: 'tok999' });

    const res = await loginPOST(
      jsonReq('https://app.mailmyra.com/api/auth/login', {
        email: 'a@b.com',
        password: 'right',
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('Set-Cookie')).toContain('mm_session=tok999');
  });
});

describe('register ucu', () => {
  it('form + şifre tekrarı tutmuyorsa akışa HİÇ gitmez', async () => {
    const res = await registerPOST(
      formReq('https://app.mailmyra.com/api/auth/register', {
        email: 'a@b.com',
        password: 'correct-horse-battery',
        password_confirmation: 'correct-horse-bettery',
        termsVersion: '2026-08-13',
      }),
    );

    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toContain('error=password_mismatch');
    // Kayıt denenmemeli: yazım hatası yapan kullanıcı ilk şifreyle kaydolmasın.
    expect(register).not.toHaveBeenCalled();
  });

  it('form + adres dolu -> 303, register.html\'e döner', async () => {
    register.mockResolvedValue({ ok: false, reason: 'email_taken' });

    const res = await registerPOST(
      formReq('https://app.mailmyra.com/api/auth/register', {
        email: 'a@b.com',
        password: 'correct-horse-battery',
        password_confirmation: 'correct-horse-battery',
      }),
    );

    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe(
      'https://mailmyra.com/register.html?error=email_taken',
    );
  });

  it('form + başarı -> 303 panele, çerez cevapta', async () => {
    register.mockResolvedValue({ ok: true, sessionToken: 'newtok', verificationMailSent: true });

    const res = await registerPOST(
      formReq('https://app.mailmyra.com/api/auth/register', {
        email: 'a@b.com',
        password: 'correct-horse-battery',
        password_confirmation: 'correct-horse-battery',
        orgName: 'Northwind Studio',
        termsVersion: '2026-08-13',
      }),
    );

    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/app/signatures');
    expect(res.headers.get('Set-Cookie')).toContain('mm_session=newtok');
  });

  it('form alanları akışa doğru adlarla geçer', async () => {
    register.mockResolvedValue({ ok: true, sessionToken: 't', verificationMailSent: false });

    await registerPOST(
      formReq('https://app.mailmyra.com/api/auth/register', {
        email: 'a@b.com',
        password: 'correct-horse-battery',
        password_confirmation: 'correct-horse-battery',
        orgName: 'Northwind Studio',
        termsVersion: '2026-08-13',
      }),
    );

    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'a@b.com',
        orgName: 'Northwind Studio',
        termsVersion: '2026-08-13',
      }),
      expect.anything(),
    );
  });

  it('JSON yolu şifre tekrarı beklemez — panel formu onu göndermiyor', async () => {
    register.mockResolvedValue({ ok: true, sessionToken: 't', verificationMailSent: true });

    const res = await registerPOST(
      jsonReq('https://app.mailmyra.com/api/auth/register', {
        email: 'a@b.com',
        password: 'correct-horse-battery',
        termsVersion: '2026-08-13',
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, verificationMailSent: true });
  });

  it('JSON + adres dolu -> 409 (eskisi gibi)', async () => {
    register.mockResolvedValue({ ok: false, reason: 'email_taken' });

    const res = await registerPOST(
      jsonReq('https://app.mailmyra.com/api/auth/register', {
        email: 'a@b.com',
        password: 'x',
      }),
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'email_taken' });
  });
});
