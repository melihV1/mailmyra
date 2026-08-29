import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '../lib/db';
import { createInboundLead } from '../lib/repo/leads';
import { truncateAll } from './helpers';

const send = vi.fn();
vi.mock('../lib/mail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/mail')>()),
  getMailer: () => ({ kind: 'memory' as const, send: (...a: unknown[]) => send(...a) }),
}));

beforeEach(async () => {
  await truncateAll();
  send.mockReset();
  process.env.LEADS_NOTIFY_TO = 'hello@mailmyra.com';
});

describe('createInboundLead', () => {
  it('lead açar, alanları kırpar, varsayılanları şemadan alır', async () => {
    const { id } = await createInboundLead({
      company: '  Acme A.Ş.  ',
      contact: 'Ayşe Yılmaz <ayse@acme.com>',
      source: 'inbound-demo',
      seats: 25,
      note: 'Platform: microsoft-365',
    });

    const row = await prisma.lead.findUniqueOrThrow({ where: { id } });
    expect(row.company).toBe('Acme A.Ş.');
    expect(row.contact).toBe('Ayşe Yılmaz <ayse@acme.com>');
    expect(row.source).toBe('inbound-demo');
    expect(row.seats).toBe(25);
    expect(row.note).toBe('Platform: microsoft-365');
    expect(row.stage).toBe('new');
    expect(row.nextStep).toBe('');
  });

  it('seats verilmezse, sıfırsa ya da kesirliyse 1 olur', async () => {
    const rows = await Promise.all([
      createInboundLead({ company: 'A', contact: 'a@a.com', source: 'inbound-contact' }),
      createInboundLead({ company: 'B', contact: 'b@b.com', source: 'inbound-contact', seats: 0 }),
      createInboundLead({ company: 'C', contact: 'c@c.com', source: 'inbound-contact', seats: 7.5 }),
    ]);

    for (const { id } of rows) {
      expect((await prisma.lead.findUniqueOrThrow({ where: { id } })).seats).toBe(1);
    }
  });

  it('kolon sınırını aşan girdiyi kırpar, veritabanı hatası vermez', async () => {
    const { id } = await createInboundLead({
      company: 'x'.repeat(400),
      contact: 'y'.repeat(400),
      source: 'z'.repeat(80),
    });

    const row = await prisma.lead.findUniqueOrThrow({ where: { id } });
    expect(row.company).toHaveLength(160);
    expect(row.contact).toHaveLength(255);
    expect(row.source).toHaveLength(48);
  });

  it('zorunlu alan boşsa reddeder ve satır açmaz', async () => {
    await expect(
      createInboundLead({ company: '   ', contact: 'a@a.com', source: 'inbound-demo' }),
    ).rejects.toThrow();
    await expect(
      createInboundLead({ company: 'A', contact: '   ', source: 'inbound-demo' }),
    ).rejects.toThrow();

    expect(await prisma.lead.count()).toBe(0);
  });

  it('denetim defterine satır YAZMAZ — kişi bilgisi iç deftere birikmesin', async () => {
    await createInboundLead({ company: 'Acme', contact: 'ayse@acme.com', source: 'inbound-demo' });

    expect(await prisma.adminAction.count()).toBe(0);
  });

  it('bildirim e-postası gönderir', async () => {
    await createInboundLead({ company: 'Acme', contact: 'ayse@acme.com', source: 'inbound-demo', seats: 3 });

    expect(send).toHaveBeenCalledTimes(1);
    const mail = send.mock.calls[0]![0];
    expect(mail.to).toBe('hello@mailmyra.com');
    expect(mail.kind).toBe('notification');
    expect(mail.subject).toBe('New enquiry from Acme (inbound-demo)');
  });

  it('LEADS_NOTIFY_TO boşsa lead yine açılır, posta gönderilmez', async () => {
    delete process.env.LEADS_NOTIFY_TO;

    const { id } = await createInboundLead({ company: 'Acme', contact: 'a@a.com', source: 'inbound-demo' });

    expect(await prisma.lead.findUnique({ where: { id } })).not.toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  it('posta gönderimi patlarsa lead YİNE kayıtlı kalır', async () => {
    send.mockRejectedValue(new Error('smtp down'));

    const { id } = await createInboundLead({ company: 'Acme', contact: 'a@a.com', source: 'inbound-demo' });

    expect(await prisma.lead.findUnique({ where: { id } })).not.toBeNull();
  });
});
