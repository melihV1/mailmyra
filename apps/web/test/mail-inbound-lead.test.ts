import { describe, expect, it } from 'vitest';

import { inboundLeadEmail } from '../lib/mail/templates';

const base = {
  actionUrl: 'https://app.mailmyra.com/admin/growth/leads',
  company: 'Acme',
  contact: 'Ayşe <ayse@acme.com>',
  source: 'inbound-demo',
  seats: 25,
  note: null as string | null,
};

describe('inboundLeadEmail', () => {
  it('konu satırında şirket ve kaynak geçer', () => {
    expect(inboundLeadEmail(base).subject).toBe('New enquiry from Acme (inbound-demo)');
  });

  it('özet alanları metin gövdesinde yer alır', () => {
    const mail = inboundLeadEmail(base);

    expect(mail.text).toContain('Company: Acme');
    expect(mail.text).toContain('Contact: Ayşe <ayse@acme.com>');
    expect(mail.text).toContain('Source: inbound-demo');
    expect(mail.text).toContain('Seats: 25');
  });

  it('HTML gövdesinde kullanıcı metni kaçırılır', () => {
    const mail = inboundLeadEmail({
      ...base,
      company: '<script>alert(1)</script>',
      note: '<img src=x onerror=alert(1)>',
    });

    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('onerror=');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).toContain('&lt;img src=x onerror&#61;alert(1)&gt;');
  });

  it('note doluysa Details bölümü gelir, boşsa hiç gelmez', () => {
    expect(inboundLeadEmail({ ...base, note: 'Message: merhaba' }).text).toContain('Details');
    expect(inboundLeadEmail(base).text).not.toContain('Details');
  });

  it('note içindeki satır sonları HTML gövdesinde <br> olur', () => {
    const mail = inboundLeadEmail({ ...base, note: 'Message: a\nPlatform: b' });

    expect(mail.html).toContain('Message: a<br>Platform: b');
  });
});
