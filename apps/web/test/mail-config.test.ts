import { describe, expect, it } from 'vitest';

import { readSmtpConfig } from '../lib/mail/config';

const full = {
  MAIL_HOST: 'smtp.example.com',
  MAIL_PORT: '587',
  MAIL_USER: 'no-reply@mailmyra.com',
  MAIL_PASS: 'gizli',
  MAIL_FROM: 'Mailmyra <no-reply@mailmyra.com>',
};

describe('reading the provider from the environment', () => {
  it('takes every field from env so the provider can be swapped without a deploy', () => {
    const result = readSmtpConfig(full);

    expect(result).toEqual({
      ok: true,
      config: {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'no-reply@mailmyra.com', pass: 'gizli' },
        from: 'Mailmyra <no-reply@mailmyra.com>',
        allowSelfSigned: false,
      },
    });
  });

  it('turns on implicit TLS for port 465 and STARTTLS for 587', () => {
    // İki sağlayıcı iki portu tercih ediyor; bunu elle ayarlatmak, yanlış
    // ayarda sessizce şifresiz gönderim demek olurdu.
    expect(readSmtpConfig({ ...full, MAIL_PORT: '465' })).toMatchObject({
      config: { secure: true },
    });
    expect(readSmtpConfig({ ...full, MAIL_PORT: '587' })).toMatchObject({
      config: { secure: false },
    });
  });

  it('lets an explicit MAIL_SECURE override the port guess', () => {
    expect(readSmtpConfig({ ...full, MAIL_PORT: '2525', MAIL_SECURE: 'true' })).toMatchObject({
      config: { secure: true },
    });
    expect(readSmtpConfig({ ...full, MAIL_PORT: '465', MAIL_SECURE: 'false' })).toMatchObject({
      config: { secure: false },
    });
  });

  it('allows a relay with no credentials at all', () => {
    // Plesk'in yerel SMTP'si localhost'tan kimlik doğrulaması istemiyor.
    // Kullanıcı/parolayı zorunlu tutmak o seçeneği baştan kapatırdı.
    const { MAIL_USER: _u, MAIL_PASS: _p, ...noAuth } = full;

    const result = readSmtpConfig({ ...noAuth, MAIL_HOST: 'localhost', MAIL_PORT: '25' });

    expect(result).toMatchObject({ ok: true, config: { auth: undefined } });
  });

  it('refuses a half-filled credential pair instead of trying anonymously', () => {
    // Parolası düşmüş bir yapılandırmada sessizce kimliksiz bağlanmak,
    // teşhisi zor bir "neden gitmiyor" hatası üretir.
    expect(readSmtpConfig({ ...full, MAIL_PASS: '' })).toMatchObject({
      ok: false,
      missing: ['MAIL_PASS'],
    });
  });

  it('names everything that is missing, not just the first one', () => {
    expect(readSmtpConfig({})).toEqual({
      ok: false,
      missing: ['MAIL_HOST', 'MAIL_FROM'],
    });
  });

  it('rejects a port that is not a number', () => {
    expect(readSmtpConfig({ ...full, MAIL_PORT: 'yirmibes' })).toMatchObject({
      ok: false,
      missing: ['MAIL_PORT'],
    });
  });

  it('can be told to accept a self-signed certificate — for the localhost relay', () => {
    // Yaşandı (2026-08-11, canlı): Plesk'in posta sunucusu localhost'ta
    // STARTTLS'e kendinden imzalı sertifikayla çıkıyor ve gönderim ESOCKET
    // ile ölüyor. Trafik makineden çıkmadığı için doğrulamayı kapatmak
    // güvenli — ama yalnız bu anahtar AÇIKÇA yazılırsa.
    expect(readSmtpConfig({ ...full, MAIL_TLS_SELF_SIGNED: 'true' })).toMatchObject({
      config: { allowSelfSigned: true },
    });
    expect(readSmtpConfig({ ...full, MAIL_TLS_SELF_SIGNED: 'yanlis' })).toMatchObject({
      config: { allowSelfSigned: false },
    });
    expect(readSmtpConfig(full)).toMatchObject({ config: { allowSelfSigned: false } });
  });

  it('defaults to 587 when no port is given', () => {
    const { MAIL_PORT: _p, ...noPort } = full;
    expect(readSmtpConfig(noPort)).toMatchObject({ config: { port: 587, secure: false } });
  });
});
