import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Onay yazmalarının sözleşmesi: pending dışına karar yok · tek reject
 * kapatır · onay eşiği requiredApprovals'a saygı duyar · aynı onaycı
 * ikinci karar yazamaz (P2002 dostu mesaj) · denetim aynı transaction'da ·
 * org'suz talep platform nöbetçisiyle denetlenir.
 */

const userFindUnique = vi.fn();

const tx = {
  organization: { findUnique: vi.fn() },
  approvalRequest: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  approvalDecision: { create: vi.fn(), count: vi.fn() },
  approvalEvent: { create: vi.fn() },
  adminAction: { create: vi.fn() },
};

const transaction = vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));

vi.mock('../lib/db', () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => userFindUnique(...a) },
    $transaction: (...a: unknown[]) => transaction(...(a as [never])),
  },
}));

const admin = await import('../lib/repo/admin');

beforeEach(() => {
  vi.clearAllMocks();
  userFindUnique.mockResolvedValue({ isStaff: true, email: 'staff@voldi.net', id: 'u1' });
  tx.organization.findUnique.mockResolvedValue({ id: 'org1', name: 'Acme' });
  tx.approvalRequest.create.mockResolvedValue({ id: 'req1' });
  tx.approvalRequest.findUnique.mockResolvedValue({
    status: 'pending',
    title: 'Koltuk artışı',
    requiredApprovals: 1,
    orgId: 'org1',
    orgName: 'Acme',
  });
  tx.approvalRequest.update.mockResolvedValue({});
  tx.approvalDecision.create.mockResolvedValue({});
  tx.approvalDecision.count.mockResolvedValue(1);
  tx.approvalEvent.create.mockResolvedValue({});
  tx.adminAction.create.mockResolvedValue({});
});

describe('createApprovalRequest', () => {
  const input = { title: 'Koltuk artışı', domain: 'entitlement', riskLevel: 'high' } as const;

  it('talep + created olayı + denetim aynı transaction içinde', async () => {
    const res = await admin.createApprovalRequest('u1', { ...input, orgId: 'org1' }, 'müşteri istedi');

    expect(res).toEqual({ id: 'req1' });
    expect(transaction).toHaveBeenCalledOnce();
    expect(tx.approvalRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: undefined, // status şemadaki default'a bırakılır ('pending')
          policyVersion: admin.APPROVAL_POLICY_VERSION,
          requestedByEmail: 'staff@voldi.net',
          requiredApprovals: 1,
        }),
      }),
    );
    expect(tx.approvalEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'created' }) }),
    );
    expect(tx.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'approval.created', orgId: 'org1', orgName: 'Acme' }),
      }),
    );
  });

  it('org verilmemişse denetim platform nöbetçisine yazılır', async () => {
    await admin.createApprovalRequest('u1', input, 'platform işi');

    expect(tx.organization.findUnique).not.toHaveBeenCalled();
    expect(tx.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orgId: 'platform', orgName: 'Mailmyra platform' }),
      }),
    );
  });

  it('bilinmeyen org transaction içinde keser', async () => {
    tx.organization.findUnique.mockResolvedValue(null);
    await expect(
      admin.createApprovalRequest('u1', { ...input, orgId: 'yok' }, 'sebep'),
    ).rejects.toThrow('bulunamadı');
    expect(tx.approvalRequest.create).not.toHaveBeenCalled();
  });

  it('requiredApprovals 1-3 dışında reddedilir, transaction açılmaz', async () => {
    await expect(
      admin.createApprovalRequest('u1', { ...input, requiredApprovals: 0 }, 'sebep'),
    ).rejects.toThrow('1-3');
    await expect(
      admin.createApprovalRequest('u1', { ...input, requiredApprovals: 4 }, 'sebep'),
    ).rejects.toThrow('1-3');
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe('decideApproval', () => {
  it('tek onay, eşik 1 → approved + kapanış alanları + iki olay', async () => {
    const res = await admin.decideApproval('u1', 'req1', 'approve', 'uygun');

    expect(res).toEqual({ status: 'approved' });
    expect(tx.approvalRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'approved', decidedByEmail: 'staff@voldi.net' }),
      }),
    );
    const eventTypes = tx.approvalEvent.create.mock.calls.map(
      (c) => (c[0] as { data: { type: string } }).data.type,
    );
    expect(eventTypes).toEqual(['decision_recorded', 'approved']);
  });

  it('eşik 2, ilk onay → pending kalır, kapanış yazılmaz', async () => {
    tx.approvalRequest.findUnique.mockResolvedValue({
      status: 'pending', title: 'T', requiredApprovals: 2, orgId: null, orgName: null,
    });
    tx.approvalDecision.count.mockResolvedValue(1);

    const res = await admin.decideApproval('u1', 'req1', 'approve', 'uygun');

    expect(res).toEqual({ status: 'pending' });
    expect(tx.approvalRequest.update).not.toHaveBeenCalled();
  });

  it('tek reject talebi kapatır', async () => {
    const res = await admin.decideApproval('u1', 'req1', 'reject', 'riskli');

    expect(res).toEqual({ status: 'rejected' });
    expect(tx.approvalRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'rejected' }) }),
    );
  });

  it('pending olmayan talebe karar yazılamaz', async () => {
    tx.approvalRequest.findUnique.mockResolvedValue({
      status: 'approved', title: 'T', requiredApprovals: 1, orgId: null, orgName: null,
    });
    await expect(admin.decideApproval('u1', 'req1', 'approve', 's')).rejects.toThrow(
      'artık kararda değil',
    );
    expect(tx.approvalDecision.create).not.toHaveBeenCalled();
  });

  it('aynı onaycının ikinci kararı P2002 → dostça mesaj', async () => {
    const { Prisma } = await import('@prisma/client');
    tx.approvalDecision.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
    );
    await expect(admin.decideApproval('u1', 'req1', 'approve', 's')).rejects.toThrow(
      'zaten karar yazdın',
    );
  });
});

describe('cancelApprovalRequest', () => {
  it('pending → cancelled + olay + denetim', async () => {
    await admin.cancelApprovalRequest('u1', 'req1', 'gerek kalmadı');

    expect(tx.approvalRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'cancelled' }) }),
    );
    expect(tx.approvalEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'cancelled' }) }),
    );
    expect(tx.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'approval.cancelled' }) }),
    );
  });

  it('pending olmayan iptal edilemez', async () => {
    tx.approvalRequest.findUnique.mockResolvedValue({
      status: 'rejected', title: 'T', requiredApprovals: 1, orgId: null, orgName: null,
    });
    await expect(admin.cancelApprovalRequest('u1', 'req1', 's')).rejects.toThrow(
      'artık kararda değil',
    );
  });
});
