import { describe, expect, it } from 'vitest';

import { inviteEmail, resetEmail, seatWarningEmail, verifyEmail } from '../lib/mail/templates';

const URL_VERIFY = 'https://app.mailmyra.com/verify?token=abc123';
const URL_RESET = 'https://app.mailmyra.com/reset?token=def456';
const URL_INVITE = 'https://app.mailmyra.com/invite?token=ghi789';
const URL_SENDERS = 'https://app.mailmyra.com/app/senders';

const seatWarning = () =>
  seatWarningEmail({
    actionUrl: URL_SENDERS,
    orgName: 'Voldi Creative',
    activeSeats: 4,
    entitledSeats: 5,
  });

const all = [
  ['verify', verifyEmail({ actionUrl: URL_VERIFY }), URL_VERIFY],
  ['reset', resetEmail({ actionUrl: URL_RESET }), URL_RESET],
  ['invite', inviteEmail({ actionUrl: URL_INVITE, orgName: 'Voldi Creative' }), URL_INVITE],
  ['seat warning', seatWarning(), URL_SENDERS],
] as const;

/** Tek kullanımlık link taşıyanlar — koltuk uyarısının süresi yok. */
const expiring = [
  ['verify', verifyEmail({ actionUrl: URL_VERIFY })],
  ['reset', resetEmail({ actionUrl: URL_RESET })],
  ['invite', inviteEmail({ actionUrl: URL_INVITE, orgName: 'Voldi Creative' })],
] as const;

describe.each(all)('the %s email', (_name, mail, url) => {
  it('has a subject, an HTML body and a plain-text body', () => {
    expect(mail.subject.trim()).not.toBe('');
    expect(mail.html.trim()).not.toBe('');
    expect(mail.text.trim()).not.toBe('');
  });

  it('puts the link in the HTML', () => {
    expect(mail.html).toContain(`href="${url}"`);
  });

  it('repeats the bare link as text for clients that strip the button', () => {
    // Kurumsal e-posta ağ geçitleri butonu düşürebiliyor. Ham adres gövdede
    // yazılı olmazsa kullanıcının tıklayacak hiçbir şeyi kalmaz.
    expect(mail.html.replace(`href="${url}"`, '')).toContain(url);
  });

  it('puts the link in the plain-text body too', () => {
    expect(mail.text).toContain(url);
  });

  it('is laid out with tables, not divs', () => {
    // Projenin kendi e-posta kuralı. Outlook masaüstü Word motoruyla
    // render ediyor; div tabanlı yerleşim orada dağılıyor.
    expect(mail.html).not.toMatch(/<div/i);
    expect(mail.html).toMatch(/<table/i);
  });

  it('carries no stylesheet — every rule is inline', () => {
    expect(mail.html).not.toMatch(/<style/i);
    expect(mail.html).not.toMatch(/<link/i);
    expect(mail.html).not.toMatch(/var\(--/);
    expect(mail.html).not.toMatch(/calc\(/);
  });

  it('spells out border="0" on every table', () => {
    // Outlook 2512, belirtilmediğinde tablolara istenmeyen kenarlık ekliyor.
    const tables = mail.html.match(/<table[^>]*>/gi) ?? [];
    expect(tables.length).toBeGreaterThan(0);
    for (const tag of tables) expect(tag).toContain('border="0"');
  });

  it('has no plain-text body that leaked HTML', () => {
    expect(mail.text).not.toMatch(/<[a-z]/i);
  });

  it('declares utf-8 in the document itself', () => {
    // MIME başlığı charset'i zaten söylüyor, ama onu yok sayan istemciler
    // var ve müşteri org adları "Şişli Ajans" olacak. Bildirimi belgeye de
    // koymak bedava.
    expect(mail.html).toMatch(/<meta[^>]+charset=["']?utf-8/i);
  });
});

describe.each(expiring)('the %s email link lifetime', (_name, mail) => {
  it('says how long the link is good for', () => {
    // Süresi geçmiş linke tıklayıp "bozuk" sanan kullanıcı destek yükü.
    expect(mail.text).toMatch(/24 hours|1 hour|7 days/);
  });
});

describe('the seat warning email', () => {
  it('says exactly how many seats are in use, with numbers', () => {
    // Panel brief'in publish diyaloğuyla aynı ilke: rakamla söyle.
    const mail = seatWarning();
    expect(mail.subject).toContain('4 of 5');
    expect(mail.text).toContain('4 of 5');
    expect(mail.html).toContain('4 of 5');
  });

  it('names the workspace it is talking about', () => {
    // Ajans kurulumunda bir owner'a birden çok ağacın maili düşebilir;
    // hangi çalışma alanının dolduğu gövdeden okunabilmeli.
    const mail = seatWarning();
    expect(mail.html).toContain('Voldi Creative');
    expect(mail.text).toContain('Voldi Creative');
  });

  it('offers a human contact, not a checkout', () => {
    // İlk 10 müşteri elle faturalanıyor (kilitli karar) — mail "satın al"
    // düğmesi vaat edemez. Gönderen no-reply@ kalabilir (açık karar), bu
    // yüzden "cevapla" da denmez; panelle aynı dil: "contact us".
    expect(seatWarning().text.toLowerCase()).toContain('contact us');
  });

  it('escapes a hostile organisation name', () => {
    const mail = seatWarningEmail({
      actionUrl: URL_SENDERS,
      orgName: '<a href="https://kotu.example">Voldi</a>',
      activeSeats: 4,
      entitledSeats: 5,
    });
    expect(mail.html).not.toContain('<a href="https://kotu.example"');
    expect(mail.html).toContain('&lt;a href=&quot;https://kotu.example&quot;&gt;');
  });
});

describe('Turkish characters', () => {
  it('survive from the org name into both bodies', () => {
    const mail = inviteEmail({ actionUrl: URL_INVITE, orgName: 'Şişli Ağaç İşleri' });
    expect(mail.html).toContain('Şişli Ağaç İşleri');
    expect(mail.text).toContain('Şişli Ağaç İşleri');
    expect(mail.subject).toContain('Şişli Ağaç İşleri');
  });
});

describe('untrusted values', () => {
  it('escapes an organisation name instead of pasting it into the markup', () => {
    // Org adını kullanıcı yazıyor. Kaçırılmazsa davet e-postası saldırganın
    // seçtiği linki taşıyan bir sayfaya dönüşür.
    const mail = inviteEmail({
      actionUrl: URL_INVITE,
      orgName: '<a href="https://kotu.example">Voldi</a>',
    });

    expect(mail.html).not.toContain('<a href="https://kotu.example"');
    expect(mail.html).toContain('&lt;a href=&quot;https://kotu.example&quot;&gt;');
  });

  it('escapes it in the subject line as well', () => {
    const mail = inviteEmail({ actionUrl: URL_INVITE, orgName: 'Ali & Veli' });
    expect(mail.subject).toContain('Ali & Veli');
    expect(mail.html).toContain('Ali &amp; Veli');
  });
});

describe('what each email is for', () => {
  it('the invite names the organisation doing the inviting', () => {
    expect(inviteEmail({ actionUrl: URL_INVITE, orgName: 'Voldi Creative' }).subject).toContain(
      'Voldi Creative',
    );
  });

  it('the reset email tells the reader to ignore it if it was not them', () => {
    // Sıfırlama e-postası, hesabı olmayan birine de gidebilir (var/yok
    // sızdırmıyoruz). O kişi ne yapacağını bilmeli.
    expect(resetEmail({ actionUrl: URL_RESET }).text.toLowerCase()).toContain('ignore');
  });
});
