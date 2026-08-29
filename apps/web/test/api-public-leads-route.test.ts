import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Route seviyesi: gövde → repo argümanı eşlemesi ve HTTP çevirisi. Repo
 * davranışı `test-db/leads-inbound.test.ts`te gerçek DB'ye karşı test
 * ediliyor; burada DB yok, bu yüzden CI'da her zaman koşar.
 */

const createInboundLead = vi.fn();

vi.mock('../lib/repo/leads', () => ({
  createInboundLead: (...args: unknown[]) => createInboundLead(...args),
}));

let ip = '203.0.113.1';
vi.mock('../lib/client-ip', () => ({ clientIp: () => ip }));

const { POST } = await import('../app/api/leads/route');

function formReq(pairs: Record<string, string>): Request {
  return new Request('https://app.mailmyra.com/api/leads', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(pairs),
  });
}

let ipCounter = 0;

beforeEach(() => {
  createInboundLead.mockReset();
  createInboundLead.mockResolvedValue({ id: 'lead1' });
  process.env.MARKETING_ORIGIN = 'https://mailmyra.com';
  // Sayaç bellekte ve modül ömrü boyunca yaşıyor; her test taze bir IP alır
  // ki komşu testin doldurduğu pencere bunu etkilemesin.
  ipCounter += 1;
  ip = `203.0.113.${ipCounter}`;
});

describe('demo formu', () => {
  it('alanları eşler ve anasayfaya 303 döner', async () => {
    const res = await POST(
      formReq({
        form: 'demo',
        name: 'Alex Carter',
        email: 'alex@northwind.com',
        company: 'Northwind',
        team_size: '25',
        platform: 'microsoft-365',
        job_title: 'Marketing Lead',
        message: 'Ekibimiz için imza istiyoruz',
      }),
    );

    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe(
      'https://mailmyra.com/index.html?sent=1#mailmyra-demo-form',
    );
    expect(await res.text()).toBe('');
    expect(createInboundLead).toHaveBeenCalledWith({
      company: 'Northwind',
      contact: 'Alex Carter <alex@northwind.com>',
      source: 'inbound-demo',
      seats: 25,
      note: 'Message: Ekibimiz için imza istiyoruz\nPlatform: microsoft-365\nJob title: Marketing Lead',
    });
  });

  it('demo formunda onay kutusu aranmaz — sayfada yok', async () => {
    const res = await POST(
      formReq({ form: 'demo', name: 'A', email: 'a@a.com', company: 'A' }),
    );

    expect(res.headers.get('Location')).toContain('sent=1');
    expect(createInboundLead).toHaveBeenCalledTimes(1);
  });
});

describe('contact formu', () => {
  it('segment kaynağa, koltuk aralığı alt sınıra döner', async () => {
    const res = await POST(
      formReq({
        form: 'contact',
        segment: 'agency',
        name: 'Ayşe Yılmaz',
        email: 'ayse@acme.com',
        company: 'Acme',
        seats: '50-199',
        message: 'Merhaba',
        company_url: 'https://acme.com',
        consent: 'on',
      }),
    );

    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe(
      'https://mailmyra.com/contact.html?sent=1#mm-contact-form',
    );
    expect(createInboundLead).toHaveBeenCalledWith({
      company: 'Acme',
      contact: 'Ayşe Yılmaz <ayse@acme.com>',
      source: 'inbound-agency',
      seats: 50,
      note: 'Message: Merhaba\nCompany URL: https://acme.com',
    });
  });

  it('beş segmentin her biri kendi kaynağını üretir', async () => {
    for (const segment of ['agency', 'enterprise', 'team', 'freelancer', 'support']) {
      createInboundLead.mockClear();
      ipCounter += 1;
      ip = `198.51.100.${ipCounter}`;

      await POST(
        formReq({ form: 'contact', segment, name: 'A', email: 'a@a.com', company: 'A', consent: 'on' }),
      );

      expect(createInboundLead.mock.calls[0]![0].source).toBe(`inbound-${segment}`);
    }
  });

  it('bilinmeyen segment jenerik kaynağa düşer', async () => {
    await POST(
      formReq({ form: 'contact', segment: 'uydurma', name: 'A', email: 'a@a.com', company: 'A', consent: 'on' }),
    );

    expect(createInboundLead.mock.calls[0]![0].source).toBe('inbound-contact');
  });

  it('onay kutusu işaretsizse reddeder ve kayıt açmaz', async () => {
    const res = await POST(formReq({ form: 'contact', name: 'A', email: 'a@a.com', company: 'A' }));

    expect(res.headers.get('Location')).toBe(
      'https://mailmyra.com/contact.html?error=consent_required#mm-contact-form',
    );
    expect(createInboundLead).not.toHaveBeenCalled();
  });

  it('bilinmeyen form değeri contact sayılır — hedef whitelist dışına çıkmaz', async () => {
    const res = await POST(
      formReq({ form: 'https://kotu.example/', name: 'A', email: 'a@a.com', company: 'A', consent: 'on' }),
    );

    expect(res.headers.get('Location')).toBe(
      'https://mailmyra.com/contact.html?sent=1#mm-contact-form',
    );
  });
});

describe('doğrulama ve koruma', () => {
  it('e-posta boşsa hata koduyla geri döner', async () => {
    const res = await POST(formReq({ form: 'demo', name: 'A', company: 'A', email: '' }));

    expect(res.headers.get('Location')).toBe(
      'https://mailmyra.com/index.html?error=missing_fields#mailmyra-demo-form',
    );
    expect(createInboundLead).not.toHaveBeenCalled();
  });

  it('honeypot doluysa başarı gibi davranır ama kayıt açmaz', async () => {
    const res = await POST(
      formReq({ form: 'demo', name: 'Bot', email: 'bot@bot.com', company: 'Bot', website: 'spam' }),
    );

    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe(
      'https://mailmyra.com/index.html?sent=1#mailmyra-demo-form',
    );
    expect(createInboundLead).not.toHaveBeenCalled();
  });

  it('aynı IP pencereyi doldurunca reddedilir', async () => {
    ip = '198.51.100.200';
    for (let i = 0; i < 5; i += 1) {
      await POST(formReq({ form: 'demo', name: 'A', email: `a${i}@a.com`, company: 'A' }));
    }

    const res = await POST(formReq({ form: 'demo', name: 'A', email: 'son@a.com', company: 'A' }));

    expect(res.headers.get('Location')).toBe(
      'https://mailmyra.com/index.html?error=rate_limited#mailmyra-demo-form',
    );
    expect(createInboundLead).toHaveBeenCalledTimes(5);
  });

  it('repo patlarsa ziyaretçi hata koduyla döner', async () => {
    createInboundLead.mockRejectedValue(new Error('db down'));

    const res = await POST(formReq({ form: 'demo', name: 'A', email: 'a@a.com', company: 'A' }));

    expect(res.headers.get('Location')).toBe(
      'https://mailmyra.com/index.html?error=server_error#mailmyra-demo-form',
    );
  });
});
