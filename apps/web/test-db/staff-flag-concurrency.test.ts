/**
 * `setStaffFlag`in eşzamanlılık altında güvenceleri — Task 4 kritik bulgusu.
 *
 * `admin.ts`teki bekçiler kilitsiz "oku, sonra yaz" ise MariaDB REPEATABLE
 * READ altında iki şey kırılır:
 *
 *   1. Double-spend: aynı onayın iki eşzamanlı icrası ikisi de
 *      `executedCount === 0` okur, ikisi de bayrağı çevirir.
 *   2. Lockout bypass: 2 personelle, FARKLI hedeflere iki eşzamanlı revoke
 *      ikisi de "2 personel var" okur, ikisi de geçer, 0 personel kalır.
 *
 * Bu dosya `publish.test.ts`in konusuyla aynı: `packages/core`/`admin.ts`
 * "bu izinli mi" sorusunu saf olarak yanıtlıyor, burası o kararın
 * EŞZAMANLILIK ALTINDA da tutup tutmadığını sınıyor. Kilitsiz bir uygulama
 * bu dosyadaki yarış testlerini GEÇEMEZ — onların varlık sebebi bu.
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { prisma } from '../lib/db';
import { APPROVAL_POLICY_VERSION, setStaffFlag } from '../lib/repo/admin';
import { truncateAll } from './helpers';

beforeEach(truncateAll);
afterAll(async () => {
  await truncateAll();
  await prisma.$disconnect();
});

let n = 0;
const staffUser = () =>
  prisma.user.create({
    data: { email: `staff${++n}@voldi.net`, passwordHash: 'x', isStaff: true },
  });

const approvedRequest = (input: {
  targetType: 'staff_grant' | 'staff_revoke';
  targetId: string;
  requestedByEmail: string;
}) =>
  prisma.approvalRequest.create({
    data: {
      title: 'test',
      domain: 'security',
      riskLevel: 'critical',
      policyVersion: APPROVAL_POLICY_VERSION,
      targetType: input.targetType,
      targetId: input.targetId,
      requestedByEmail: input.requestedByEmail,
      reason: 'test',
      status: 'approved',
      decidedAt: new Date(),
      decidedByEmail: input.requestedByEmail,
    },
    select: { id: true },
  });

describe('two concurrent revokes cannot empty the staff set', () => {
  test('mutual revoke (different requests, different targets): exactly one succeeds', async () => {
    // 2 personel, biri diğerini geri çekiyor — ikisi de aynı anda.
    // Kilit olmadan ikisi de "2 personel var" okur, ikisi de geçer, 0 kalır.
    const a = await staffUser();
    const b = await staffUser();

    const revokeA = await approvedRequest({
      targetType: 'staff_revoke',
      targetId: a.email,
      requestedByEmail: b.email,
    });
    const revokeB = await approvedRequest({
      targetType: 'staff_revoke',
      targetId: b.email,
      requestedByEmail: a.email,
    });

    // `Promise.all` değil `allSettled`: `setStaffFlag` reddedince FIRLATIR
    // (`publishSender`in aksine `{allowed:false}` DÖNMEZ) — `Promise.all`
    // ilk reddi görünce tüm sonucu atardı, ikisinin de ne olduğunu
    // göremezdik.
    const results = await Promise.allSettled([
      setStaffFlag(b.id, a.email, false, revokeA.id, 'karşılıklı ayrılık'),
      setStaffFlag(a.id, b.email, false, revokeB.id, 'karşılıklı ayrılık'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(String(rejected[0]!.reason)).toContain('Son personelin yetkisi düşürülemez.');

    // Asıl iddia: platform kilitlenmedi, tam 1 personel kaldı.
    expect(await prisma.user.count({ where: { isStaff: true } })).toBe(1);
  });
});

describe('the same approval cannot be executed twice', () => {
  test('two concurrent executes of one grant: exactly one succeeds', async () => {
    const staff = await staffUser();
    const target = await prisma.user.create({
      data: { email: 'new.staff@voldi.net', passwordHash: 'x', isStaff: false },
    });

    const grant = await approvedRequest({
      targetType: 'staff_grant',
      targetId: target.email,
      requestedByEmail: staff.email,
    });

    const results = await Promise.allSettled([
      setStaffFlag(staff.id, target.email, true, grant.id, 'onaylandı'),
      setStaffFlag(staff.id, target.email, true, grant.id, 'onaylandı'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(String(rejected[0]!.reason)).toContain('Bu onay zaten kullanılmış.');

    const after = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(after.isStaff).toBe(true);

    // Onay yalnız BİR kez `executed` olayı bıraktı — double-spend olmadı.
    const executedEvents = await prisma.approvalEvent.count({
      where: { requestId: grant.id, type: 'executed' },
    });
    expect(executedEvents).toBe(1);
  });
});
