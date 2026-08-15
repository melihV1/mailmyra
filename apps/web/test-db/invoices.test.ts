/**
 * Manuel fatura okuma (2026-08-15). Sınanan kurallar: görme hakkı
 * billing:manage ve KÖKTE aranır (owner ✓, admin ✗, müşteri-org owner'ı ✗),
 * yabancı org'un faturası null (varlık sızmaz), liste yeni→eski sıralı.
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { prisma } from '../lib/db';
import { getInvoiceAs, listInvoicesAs } from '../lib/repo/invoices';
import { truncateAll } from './helpers';

beforeEach(truncateAll);
afterAll(async () => {
  await truncateAll();
  await prisma.$disconnect();
});

async function scene(role: 'owner' | 'admin' | 'editor' = 'owner') {
  const org = await prisma.organization.create({ data: { name: 'Voldi', entitledSeats: 5 } });
  const user = await prisma.user.create({ data: { email: `${role}@voldi.net`, passwordHash: 'x' } });
  await prisma.membership.create({ data: { userId: user.id, orgId: org.id, role } });
  const invoice = await prisma.invoice.create({
    data: {
      orgId: org.id,
      number: 'MM-2026-0001',
      issuedAt: new Date('2026-08-14'),
      dueAt: new Date('2026-09-13'),
      seats: 3,
      unitCents: 100,
      amountCents: 300,
      note: 'Test note',
    },
  });
  return { org, user, invoice };
}

describe('listInvoicesAs / getInvoiceAs', () => {
  test('owner lists and reads own invoices, newest first', async () => {
    const { org, user, invoice } = await scene();
    await prisma.invoice.create({
      data: {
        orgId: org.id,
        number: 'MM-2026-0002',
        issuedAt: new Date('2026-09-14'),
        seats: 5,
        amountCents: 500,
      },
    });

    const list = await listInvoicesAs(user.id);
    expect(list?.map((i) => i.number)).toEqual(['MM-2026-0002', 'MM-2026-0001']);

    const one = await getInvoiceAs(user.id, invoice.id);
    expect(one).toMatchObject({
      number: 'MM-2026-0001',
      seats: 3,
      amountCents: 300,
      currency: 'USD',
      status: 'due',
      orgName: 'Voldi',
    });
  });

  test('admin lacks billing:manage — list is null, get is null', async () => {
    const { user, invoice } = await scene('admin');
    expect(await listInvoicesAs(user.id)).toBeNull();
    expect(await getInvoiceAs(user.id, invoice.id)).toBeNull();
  });

  test("a stranger cannot read another org's invoice", async () => {
    const { invoice } = await scene();
    const otherOrg = await prisma.organization.create({ data: { name: 'Rakip' } });
    const outsider = await prisma.user.create({
      data: { email: 'yabanci@voldi.net', passwordHash: 'x' },
    });
    await prisma.membership.create({
      data: { userId: outsider.id, orgId: otherOrg.id, role: 'owner' },
    });
    expect(await getInvoiceAs(outsider.id, invoice.id)).toBeNull();
    expect(await listInvoicesAs(outsider.id)).toEqual([]);
  });

  test('agency tree: child-org owner cannot see the root invoice, root owner can', async () => {
    const { org: root, invoice } = await scene();
    const child = await prisma.organization.create({
      data: { name: 'Müşteri', parentOrgId: root.id },
    });
    const clientOwner = await prisma.user.create({
      data: { email: 'musteri@firma.com', passwordHash: 'x' },
    });
    await prisma.membership.create({
      data: { userId: clientOwner.id, orgId: child.id, role: 'owner' },
    });

    // Müşteri org'unun owner'ı: billing kökünde rolü yok → fatura görünmez.
    expect(await listInvoicesAs(clientOwner.id)).toBeNull();
    expect(await getInvoiceAs(clientOwner.id, invoice.id)).toBeNull();
  });
});
