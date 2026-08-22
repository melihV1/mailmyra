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
  $queryRaw: vi.fn(),
};

/** `tx.$queryRaw`in içinden geçen SQL metnini birleştirir — hangi kilit
 *  çağrıldığını (ApprovalRequest mi User mı) sorgu METNİNE bakarak ayırt
 *  etmek için. Gerçek Prisma tagged-template çağrısı `(strings, ...values)`
 *  ile geliyor; testte yalnız strings'in birleşimi yeterli. */
function sqlOf(strings: TemplateStringsArray): string {
  return strings.join('?');
}

type LockedUserRow = { id: string; email: string; isStaff: number };

/** Revoke'ün kilitli okumasının döndürdüğü satırları değiştirir — hedefin
 *  personel durumunu ve toplam personel sayısını birlikte kontrol eder. */
function mockUserLockRows(rows: LockedUserRow[]) {
  tx.$queryRaw.mockImplementation((strings: TemplateStringsArray) => {
    const sql = sqlOf(strings);
    if (sql.includes('ApprovalRequest')) return Promise.resolve([{ id: 'locked' }]);
    if (sql.includes('FROM User')) return Promise.resolve(rows);
    return Promise.resolve([]);
  });
}

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

/** Revoke'ün TEK kilitli okuması (`WHERE isStaff = 1 OR email = ? FOR
 *  UPDATE`) hedefi VE personel setini birlikte döner — gerçek koddaki
 *  `lockedRows.find(...)`/`.filter(...)` ayrımını burada da taklit ediyoruz.
 *  Varsayılan: hedef (NORMALIZED_EMAIL) personel VE toplam 2 personel var —
 *  eski `tx.user.findUnique({isStaff:true})` + `tx.user.count()->2`
 *  varsayılanlarının yerine geçer. */
const DEFAULT_REVOKE_LOCK_ROWS: LockedUserRow[] = [
  { id: 'target1', email: NORMALIZED_EMAIL, isStaff: 1 },
  { id: 'other-staff', email: 'other@voldi.net', isStaff: 1 },
];

/** Varsayılan: onay-satırı kilidi dolu döner (değeri kullanılmıyor), User
 *  kilidi `DEFAULT_REVOKE_LOCK_ROWS`ü döner. */
function defaultQueryRawImpl(strings: TemplateStringsArray) {
  const sql = sqlOf(strings);
  if (sql.includes('ApprovalRequest')) return Promise.resolve([{ id: 'locked' }]);
  if (sql.includes('FROM User')) return Promise.resolve(DEFAULT_REVOKE_LOCK_ROWS);
  return Promise.resolve([]);
}

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
  tx.$queryRaw.mockImplementation(defaultQueryRawImpl);
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
    // Hedef + personel seti TEK kilitli okumada (`tx.$queryRaw`) gelir —
    // `tx.user.findUnique`/`tx.user.count` revoke'ta artık HİÇ çağrılmıyor
    // (bkz. admin.ts'teki "Geniş kilit, geçici çakışma" notu). Varsayılan
    // `DEFAULT_REVOKE_LOCK_ROWS` zaten dış `beforeEach`te kurulu.
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
    mockUserLockRows([
      { id: 'target1', email: NORMALIZED_EMAIL, isStaff: 0 },
      { id: 'other-staff', email: 'other@voldi.net', isStaff: 1 },
    ]);
    await expect(
      admin.setStaffFlag('u1', TARGET_EMAIL_RAW, false, 'req1', 'sebep'),
    ).rejects.toThrow('Zaten personel değil.');
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('hedef kilitli satırlarda hiç yoksa (bulunamadı) reddedilir', async () => {
    mockUserLockRows([{ id: 'other-staff', email: 'other@voldi.net', isStaff: 1 }]);
    await expect(
      admin.setStaffFlag('u1', TARGET_EMAIL_RAW, false, 'req1', 'sebep'),
    ).rejects.toThrow(/bulunamadı/);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('son personelin yetkisi düşürülemez (kilitlenme, staff sayısı 1)', async () => {
    mockUserLockRows([{ id: 'target1', email: NORMALIZED_EMAIL, isStaff: 1 }]);
    await expect(
      admin.setStaffFlag('u1', TARGET_EMAIL_RAW, false, 'req1', 'sebep'),
    ).rejects.toThrow('Son personelin yetkisi düşürülemez.');
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.approvalEvent.create).not.toHaveBeenCalled();
  });

  it('staff sayısı 2 ise (icradan sonra 1 kalır) izinlidir', async () => {
    mockUserLockRows([
      { id: 'target1', email: NORMALIZED_EMAIL, isStaff: 1 },
      { id: 'other-staff', email: 'other@voldi.net', isStaff: 1 },
    ]);
    await admin.setStaffFlag('u1', TARGET_EMAIL_RAW, false, 'req1', 'sebep');
    expect(tx.user.update).toHaveBeenCalled();
  });

  it('kilitlenme bekçisi KİLİTLİ okumadan sayar (tx.user.count DEĞİL — double-spend fix)', async () => {
    await admin.setStaffFlag('u1', TARGET_EMAIL_RAW, false, 'req1', 'sebep');
    // Eski `tx.user.count({ where: { isStaff: true } } })` artık hiç
    // çağrılmıyor — sayı, hedefi de TAŞIYAN TEK `SELECT ... FOR UPDATE`
    // okumasının döndürdüğü satırlardan türetiliyor (bkz. admin.ts'teki
    // "Geniş kilit, geçici çakışma" notu).
    expect(tx.user.count).not.toHaveBeenCalled();
    expect(tx.user.findUnique).not.toHaveBeenCalled();
    const staffLockCall = tx.$queryRaw.mock.calls.find(([strings]) =>
      sqlOf(strings as TemplateStringsArray).includes('FROM User'),
    );
    expect(staffLockCall).toBeDefined();
    expect(sqlOf(staffLockCall![0] as TemplateStringsArray)).toContain('isStaff = 1');
    expect(sqlOf(staffLockCall![0] as TemplateStringsArray)).toContain('FOR UPDATE');
    expect(staffLockCall![1]).toBe(NORMALIZED_EMAIL);
  });

  it('grant yolunda personel-seti kilidi hiç çalışmaz', async () => {
    tx.approvalRequest.findUnique.mockResolvedValue(GRANT_REQUEST);
    tx.user.findUnique.mockResolvedValue({ id: 'target1', isStaff: false });
    await admin.setStaffFlag('u1', TARGET_EMAIL_RAW, true, 'req1', 'sebep');
    expect(tx.user.count).not.toHaveBeenCalled();
    const staffLockCall = tx.$queryRaw.mock.calls.find(([strings]) =>
      sqlOf(strings as TemplateStringsArray).includes('FROM User'),
    );
    expect(staffLockCall).toBeUndefined();
  });

  it('onay satırı kilidi tx.$queryRaw ile ApprovalRequest satırını FOR UPDATE kilitler', async () => {
    await admin.setStaffFlag('u1', TARGET_EMAIL_RAW, false, 'req1', 'sebep');
    const approvalLockCall = tx.$queryRaw.mock.calls.find(([strings]) =>
      sqlOf(strings as TemplateStringsArray).includes('ApprovalRequest'),
    );
    expect(approvalLockCall).toBeDefined();
    expect(sqlOf(approvalLockCall![0] as TemplateStringsArray)).toContain('FOR UPDATE');
    expect(approvalLockCall![1]).toBe('req1');
  });

  it('çağrı sırası: onay kilidi kendi bekçi okumalarından ÖNCE, personel-seti kilidi double-spend bekçisinden SONRA ve yazmadan ÖNCE gelir', async () => {
    const order: string[] = [];
    tx.$queryRaw.mockImplementation((strings: TemplateStringsArray) => {
      const sql = sqlOf(strings);
      if (sql.includes('ApprovalRequest')) {
        order.push('lock:approval');
        return Promise.resolve([{ id: 'locked' }]);
      }
      if (sql.includes('FROM User')) {
        order.push('lock:staffSetAndTarget');
        return Promise.resolve([
          { id: 'target1', email: NORMALIZED_EMAIL, isStaff: 1 },
          { id: 'other-staff', email: 'other@voldi.net', isStaff: 1 },
        ]);
      }
      return Promise.resolve([]);
    });
    tx.approvalRequest.findUnique.mockImplementation(async () => {
      order.push('read:approvalRequest');
      return REVOKE_REQUEST;
    });
    tx.approvalEvent.count.mockImplementation(async () => {
      order.push('read:executedCount');
      return 0;
    });
    tx.user.update.mockImplementation(async () => {
      order.push('write:userUpdate');
      return {};
    });

    await admin.setStaffFlag('u1', TARGET_EMAIL_RAW, false, 'req1', 'sebep');

    // Guard 1 (onay talebi): kilit, kendisine dayanan okumalardan ÖNCE.
    expect(order.indexOf('lock:approval')).toBeLessThan(order.indexOf('read:approvalRequest'));
    expect(order.indexOf('lock:approval')).toBeLessThan(order.indexOf('read:executedCount'));
    // Guard 3+4 (hedef + kilitlenme): TEK kilit, double-spend bekçisinden
    // (executedCount) SONRA — eski `tx.user.findUnique`+`tx.user.count`un
    // durduğu yerde duruyor (bekçi sırası değişmedi) — ve yazmadan ÖNCE.
    expect(order.indexOf('read:executedCount')).toBeLessThan(order.indexOf('lock:staffSetAndTarget'));
    expect(order.indexOf('lock:staffSetAndTarget')).toBeLessThan(order.indexOf('write:userUpdate'));
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
