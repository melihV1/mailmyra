import { describe, expect, it } from 'vitest';

import { createSmtpMailer } from '../lib/mail/smtp';
import { MemoryMailer } from '../lib/mail/memory';
import { getMailer } from '../lib/mail';

const config = {
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  auth: { user: 'u', pass: 'p' },
  from: 'Mailmyra <no-reply@mailmyra.com>',
  allowSelfSigned: false,
};

const mail = {
  to: 'ali@voldi.net',
  subject: 'Konu',
  html: '<table border="0"><tr><td>Merhaba</td></tr></table>',
  text: 'Merhaba',
};

describe('the SMTP transport', () => {
  it('builds an envelope with the configured sender', async () => {
    // `jsonTransport` mesajı gerçekten göndermeden kurar; böylece zarfın
    // doğru dizildiğini ağa çıkmadan görebiliyoruz.
    const mailer = createSmtpMailer(config, { jsonTransport: true });

    const sent = await mailer.sendForTest(mail);

    expect(sent.envelope.from).toBe('no-reply@mailmyra.com');
    expect(sent.envelope.to).toEqual(['ali@voldi.net']);
  });

  it('sends both bodies, never HTML alone', async () => {
    // Düz metin parçası olmayan mesaj spam puanı topluyor ve metin okuyan
    // istemcide boş görünüyor.
    const mailer = createSmtpMailer(config, { jsonTransport: true });

    const sent = await mailer.sendForTest(mail);
    const message = JSON.parse(sent.message);

    expect(message.html).toBe(mail.html);
    expect(message.text).toBe(mail.text);
    expect(message.subject).toBe('Konu');
  });
});

describe('the in-memory mailer', () => {
  it('records instead of sending', async () => {
    const mailer = new MemoryMailer();

    await mailer.send(mail);

    expect(mailer.sent).toEqual([mail]);
  });

  it('can be emptied between tests', async () => {
    const mailer = new MemoryMailer();
    await mailer.send(mail);
    mailer.clear();
    expect(mailer.sent).toEqual([]);
  });
});

describe('choosing a mailer', () => {
  it('uses SMTP when the environment is configured', () => {
    const mailer = getMailer({
      MAIL_HOST: 'smtp.example.com',
      MAIL_FROM: 'no-reply@mailmyra.com',
      NODE_ENV: 'production',
    });
    expect(mailer.kind).toBe('smtp');
  });

  it('falls back to logging in development so nobody needs a relay to work', () => {
    const mailer = getMailer({ NODE_ENV: 'development' });
    expect(mailer.kind).toBe('log');
  });

  it('refuses to start unconfigured in production', () => {
    // Sessizce log'a düşmek, üretimde hiçbir doğrulama e-postasının
    // gitmediğini kimsenin fark etmemesi demek olurdu.
    expect(() => getMailer({ NODE_ENV: 'production' })).toThrow(/MAIL_HOST/);
  });
});
