import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Staff bayrağı icra sözleşmesi — onayın İLK gerçek icrası:
 *
 *   · onay hiçbir şeyi otomatik uygulamaz, icra AYRI ve BİLİNÇLİ bir adım
 *   · bekçiler TEK transaction içinde: talep var + approved + domain
 *     'security' + targetType eyleme uyar + targetId hedef e-postaya eşit ·
 *     talep daha önce icra edilmemiş (`ApprovalEvent type 'executed'` yok) ·
 *     hedef kullanıcı var · grant'te zaten staff değil / revoke'ta staff ·
 *     kilitlenme (son personelin yetkisi düşürülemez)
 *   · `targetEmail` normalizasyonu `createApprovalRequest`in `targetId`ye
 *     yazdığıyla BİREBİR eşleşmeli: trim + küçük harf + 64 karaktere kes
 *   · icra sonunda `executed` olayı + `staff.flag_set` denetimi AYNI tx'te
 *   · `listStaffChangeRequests` executed'i doğru haritalar, günlüksüz
 */

const userFindUnique = vi.fn();
const approvalRequestFindMany = vi.fn();

const tx = {
  approvalRequest: { findUnique: vi.fn() },
  approvalEvent: { count: vi.fn(), create: vi.fn() },
  user: { findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
  adminAction: { create: vi.fn() },
};

const transaction = vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));

vi.mock('../lib/db', () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => userFindUnique(...a) },
    approvalRequest: { findMany: (...a: unknown[]) => approvalRequestFindMany(...a) },
    $transaction: (...a: unknown[]) => transaction(...(a as [never])),
  },
}));

const admin = await import('../lib/repo/admin');

const TARGET_EMAIL_RAW = '  New.Staff@Voldi.NET  ';
const NORMALIZED_EMAIL = 'new.staff@voldi.net';

const GRANT_REQUEST = {
  status: 'approved',
  domain: 'security',
  targetType: 'staff_grant',
  targetId: NORMALIZED_EMAIL,
};

const REVOKE_REQUEST = {
  status: 'approved',
  domain: 'security',
  targetType: 'staff_revoke',
  targetId: NORMALIZED_EMAIL,
};

beforeEach(() => {
  vi.clearAllMocks();
  userFindUnique.mockResolvedValue({ isStaff: true, email: 'staff@voldi.net', id: 'u1' });
  tx.approvalRequest.findUnique.mockResolvedValue(GRANT_REQUEST);
  tx.approvalEvent.count.mockResolvedValue(0);
  tx.approvalEvent.create.mockResolvedValue({});
  tx.user.findUnique.mockResolvedValue({ id: 'target1', isStaff: false });
  tx.user.count.mockResolvedValue(2);
  tx.user.update.mockResolvedValue({});
  tx.adminAction.create.mockResolvedValue({});
});

describe('setStaffFlag — grant', () => {
  it('onaylı talep + hedef henüz staff değilse yetki verilir', async () => {
    await admin.setStaffFlag('u1', TARGET_EMAIL_RAW, true, 'req1', 'onaylandı, aç');

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'target1' },
      data: { isStaff: true },
    });
  });

  it('e-posta trim + küçük harf + 64 kesimle normalize edilir, hedef bununla aranır', async () => {
    await admin.setStaffFlag('u1', TARGET_EMAIL_RAW, true, 'req1', 'sebep');
    expect(tx.user.findUnique).toHaveBeenCalledWith({
      where: { email: NORMALIZED_EMAIL },
      select: { id: true, isStaff: true },
    });
  });

  it('executed olayı ve staff.flag_set denetimi AYNI transaction içinde yazılır', async () => {
    await admin.setStaffFlag('u1', TARGET_EMAIL_RAW, true, 'req1', 'onaylandı');

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.approvalEvent.create).toHaveBeenCalledWith({
      data: {
        requestId: 'req1',
        type: 'executed',
        actorEmail: 'staff@voldi.net',
        payload: { action: 'staff_grant', target: NORMALIZED_EMAIL },
      },
    });
    expect(tx.adminAction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'staff.flag_set',
        targetId: 'target1',
        before: { isStaff: false },
        after: { isStaff: true },
        reason: 'onaylandı',
      }),
    });
  });

  it('talep yoksa reddedilir', async () => {
    tx.approvalRequest.findUnique.mockResolvedValue(null);
    await expect(
      admin.setStaffFlag('u1', TARGET_EMAIL_RAW, true, 'req1', 'sebep'),
    ).rejects.toThrow('Bu işlem için onaylanmış talep yok.');
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('talep hâlâ pending ise (approved değil) reddedilir', async () => {
    tx.approvalRequest.findUnique.mockResolvedValue({ ...GRANT_REQUEST, status: 'pending' });
    await expect(
      admin.setStaffFlag('u1', TARGET_EMAIL_RAW, true, 'req1', 'sebep'),
    ).rejects.toThrow('Bu işlem için onaylanmış talep yok.');
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("domain 'security' değilse reddedilir", async () => {
    tx.approvalRequest.findUnique.mockResolvedValue({ ...GRANT_REQUEST, domain: 'billing' });
    await expect(
      admin.setStaffFlag('u1', TARGET_EMAIL_RAW, true, 'req1', 'sebep'),
    ).rejects.toThrow('Bu işlem için onaylanmış talep yok.');
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('targetType eylemle uyuşmazsa (revoke talebiyle grant icrası) reddedilir', async () => {
    tx.approvalRequest.findUnique.mockResolvedValue(REVOKE_REQUEST);
    await expect(
      admin.setStaffFlag('u1', TARGET_EMAIL_RAW, true, 'req1', 'sebep'),
    ).rejects.toThrow('Bu işlem için onaylanmış talep yok.');
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('targetId farklı bir e-postaya aitse reddedilir', async () => {
    tx.approvalRequest.findUnique.mockResolvedValue({ ...GRANT_REQUEST, targetId: 'baska@voldi.net' });
    await expect(
      admin.setStaffFlag('u1', TARGET_EMAIL_RAW, true, 'req1', 'sebep'),
    ).rejects.toThrow('Bu işlem için onaylanmış talep yok.');
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('talep daha önce icra edilmişse ikinci kez harcanamaz', async () => {
    tx.approvalEvent.count.mockResolvedValue(1);
    await expect(
      admin.setStaffFlag('u1', TARGET_EMAIL_RAW, true, 'req1', 'sebep'),
    ).rejects.toThrow('Bu onay zaten kullanılmış.');
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.approvalEvent.count).toHaveBeenCalledWith({
      where: { requestId: 'req1', type: 'executed' },
    });
  });

  it('hedef kullanıcı yoksa reddedilir', async () => {
    tx.user.findUnique.mockResolvedValue(null);
    await expect(
      admin.setStaffFlag('u1', TARGET_EMAIL_RAW, true, 'req1', 'sebep'),
    ).rejects.toThrow(/bulunamadı/);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('hedef zaten staff ise grant reddedilir', async () => {
    tx.user.findUnique.mockResolvedValue({ id: 'target1', isStaff: true });
    await expect(
      admin.setStaffFlag('u1', TARGET_EMAIL_RAW, true, 'req1', 'sebep'),
    ).rejects.toThrow('Zaten personel.');
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});

describe('setStaffFlag — revoke', () => {
  beforeEach(() => {
    tx.approvalRequest.findUnique.mockResolvedValue(REVOKE_REQUEST);
    tx.user.findUnique.mockResolvedValue({ id: 'target1', isStaff: true });
    tx.user.count.mockResolvedValue(2);
  });

  it('onaylı talep + hedef staffsa + yeterli personel varsa yetki düşürülür', async () => {
    await admin.setStaffFlag('u1', TARGET_EMAIL_RAW, false, 'req1', 'ayrıldı');
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'target1' },
      data: { isStaff: false },
    });
    expect(tx.approvalEvent.create).toHaveBeenCalledWith({
      data: {
        requestId: 'req1',
        type: 'executed',
        actorEmail: 'staff@voldi.net',
        payload: { action: 'staff_revoke', target: NORMALIZED_EMAIL },
      },
    });
  });

  it('grant talebiyle revoke icrası reddedilir (targetType uyuşmazlığı)', async () => {
    tx.approvalRequest.findUnique.mockResolvedValue(GRANT_REQUEST);
    await expect(
      admin.setStaffFlag('u1', TARGET_EMAIL_RAW, false, 'req1', 'sebep'),
    ).rejects.toThrow('Bu işlem için onaylanmış talep yok.');
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('hedef zaten staff değilse revoke reddedilir', async () => {
    tx.user.findUnique.mockResolvedValue({ id: 'target1', isStaff: false });
    await expect(
      admin.setStaffFlag('u1', TARGET_EMAIL_RAW, false, 'req1', 'sebep'),
    ).rejects.toThrow('Zaten personel değil.');
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('son personelin yetkisi düşürülemez (kilitlenme, staff sayısı 1)', async () => {
    tx.user.count.mockResolvedValue(1);
    await expect(
      admin.setStaffFlag('u1', TARGET_EMAIL_RAW, false, 'req1', 'sebep'),
    ).rejects.toThrow('Son personelin yetkisi düşürülemez.');
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.approvalEvent.create).not.toHaveBeenCalled();
  });

  it('staff sayısı 2 ise (icradan sonra 1 kalır) izinlidir', async () => {
    tx.user.count.mockResolvedValue(2);
    await admin.setStaffFlag('u1', TARGET_EMAIL_RAW, false, 'req1', 'sebep');
    expect(tx.user.update).toHaveBeenCalled();
  });

  it('kilitlenme bekçisi yalnız isStaff:true olanları sayar', async () => {
    await admin.setStaffFlag('u1', TARGET_EMAIL_RAW, false, 'req1', 'sebep');
    expect(tx.user.count).toHaveBeenCalledWith({ where: { isStaff: true } });
  });

  it('grant yolunda kilitlenme sayımı hiç çalışmaz', async () => {
    tx.approvalRequest.findUnique.mockResolvedValue(GRANT_REQUEST);
    tx.user.findUnique.mockResolvedValue({ id: 'target1', isStaff: false });
    await admin.setStaffFlag('u1', TARGET_EMAIL_RAW, true, 'req1', 'sebep');
    expect(tx.user.count).not.toHaveBeenCalled();
  });
});

describe('listStaffChangeRequests', () => {
  it("domain 'security' + targetType staff_grant/staff_revoke ile daraltır, events yalnız executed", async () => {
    approvalRequestFindMany.mockResolvedValue([]);
    await admin.listStaffChangeRequests('u1');

    expect(approvalRequestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { domain: 'security', targetType: { in: ['staff_grant', 'staff_revoke'] } },
        select: expect.objectContaining({
          events: expect.objectContaining({ where: { type: 'executed' }, take: 1 }),
        }),
      }),
    );
  });

  it('executed olayı OLAN talep executed:true, OLMAYAN executed:false döner', async () => {
    approvalRequestFindMany.mockResolvedValue([
      {
        id: 'req1',
        targetType: 'staff_grant',
        targetId: 'a@voldi.net',
        status: 'approved',
        events: [{ id: 'ev1' }],
      },
      {
        id: 'req2',
        targetType: 'staff_revoke',
        targetId: 'b@voldi.net',
        status: 'approved',
        events: [],
      },
    ]);

    const rows = await admin.listStaffChangeRequests('u1');
    expect(rows).toEqual([
      {
        id: 'req1',
        targetType: 'staff_grant',
        targetId: 'a@voldi.net',
        status: 'approved',
        executed: true,
      },
      {
        id: 'req2',
        targetType: 'staff_revoke',
        targetId: 'b@voldi.net',
        status: 'approved',
        executed: false,
      },
    ]);
  });
});
