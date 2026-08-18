import { describe, expect, it } from 'vitest';

import {
  field,
  formErrorRedirect,
  marketingOrigin,
  readBody,
  seeOther,
} from '../app/api/auth/_shared';

/**
 * Pazarlama sitesindeki statik formlar düz `<form method="post">` ile
 * geliyor; panelinkiler JSON. Bu dosya iki yolun da ayakta kaldığını
 * doğruluyor — JSON yolu CANLIDA çalışan giriş, kırılırsa kimse giremez.
 */

function formRequest(pairs: Record<string, string>): Request {
  const body = new URLSearchParams(pairs);
  return new Request('https://app.mailmyra.com/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
}

function jsonRequest(payload: unknown): Request {
  return new Request('https://app.mailmyra.com/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

describe('readBody', () => {
  it('form gövdesini okur ve form olduğunu söyler', async () => {
    const { body, isForm } = await readBody(
      formRequest({ email: 'a@b.com', password: 'secret' }),
    );
    expect(isForm).toBe(true);
    expect(field(body, 'email')).toBe('a@b.com');
    expect(field(body, 'password')).toBe('secret');
  });

  it('JSON gövdesini okur ve form OLMADIĞINI söyler', async () => {
    const { body, isForm } = await readBody(jsonRequest({ email: 'a@b.com' }));
    expect(isForm).toBe(false);
    expect(field(body, 'email')).toBe('a@b.com');
  });

  it('content-type yoksa JSON yolundan gider', async () => {
    const req = new Request('https://app.mailmyra.com/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.com' }),
    });
    const { isForm } = await readBody(req);
    expect(isForm).toBe(false);
  });

  it('bozuk form gövdesi boş nesne verir, patlamaz', async () => {
    const req = new Request('https://app.mailmyra.com/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: '%%%',
    });
    const { body, isForm } = await readBody(req);
    expect(isForm).toBe(true);
    expect(field(body, 'email')).toBe('');
  });

  it('charset ekli content-type de form sayılır', async () => {
    const req = new Request('https://app.mailmyra.com/api/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: new URLSearchParams({ email: 'a@b.com' }),
    });
    const { isForm } = await readBody(req);
    expect(isForm).toBe(true);
  });
});

describe('seeOther', () => {
  it('303 döner ve çerezi taşır', () => {
    const res = seeOther('/app/signatures', { 'Set-Cookie': 'mm_session=x' });
    // 302 DEĞİL: 302'de tarayıcı POST'u tekrarlayabilir.
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/app/signatures');
    expect(res.headers.get('Set-Cookie')).toBe('mm_session=x');
  });
});

describe('marketingOrigin', () => {
  it('env verilmezse mailmyra.com', () => {
    expect(marketingOrigin({})).toBe('https://mailmyra.com');
  });

  it('sondaki eğik çizgiyi atar — çift slash üretmesin', () => {
    expect(marketingOrigin({ MARKETING_ORIGIN: 'https://staging.example/' })).toBe(
      'https://staging.example',
    );
  });
});

describe('formErrorRedirect', () => {
  it('hata kodunu query olarak geri yollar', () => {
    const res = formErrorRedirect('login.html', 'invalid_credentials', {
      MARKETING_ORIGIN: 'https://mailmyra.com',
    });
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe(
      'https://mailmyra.com/login.html?error=invalid_credentials',
    );
  });

  it('hata kodunu kaçırır — sayfaya ham metin enjekte edilemesin', () => {
    const res = formErrorRedirect('login.html', 'a b&c=d', {
      MARKETING_ORIGIN: 'https://mailmyra.com',
    });
    expect(res.headers.get('Location')).toBe(
      'https://mailmyra.com/login.html?error=a%20b%26c%3Dd',
    );
  });
});
