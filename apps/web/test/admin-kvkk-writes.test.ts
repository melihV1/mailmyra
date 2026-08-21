import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * KVKK yazmalarının sözleşmesi: statutoryDueAt KOD hesaplar (+30 gün) ·
 * kimlik doğrulanmadan kapatma YOK · izinli geçiş haritası dışına çıkılmaz ·
 * sahip yalnız staff · completed'a kanıt/sahip yok · subjectEmail hiçbir
 * denetim/olay payload'ına girmez · referans P2002 dostu mesaj.
 */

const userFindUnique = vi.fn();

const tx = {
  organization: { findUnique: vi.fn() },
  user: { findFirst: vi.fn() },
  kvkkRequest: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  kvkkEvidence: { create: vi.fn() },
  kvkkEvent: { create: vi.fn() },
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

const RECEIVED = new Date(Date.UTC(2026, 7, 21, 10, 0));

const openRequest = (over: Record<string, unknown> = {}) => ({
  status: 'in_progress',
  identityVerifiedAt: new Date(RECEIVED),
  reference: 'KVKK-2026-0001',
  orgId: null,
  orgName: '',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  userFindUnique.mockResolvedValue({ isStaff: true, email: 'staff@voldi.net', id: 'u1' });
  tx.organization.findUnique.mockResolvedValue({ id: 'org1', name: 'Acme' });
  tx.user.findFirst.mockResolvedValue({ id: 'u2', email: 'destek@voldi.net' });
  tx.kvkkRequest.create.mockResolvedValue({ id: 'kv1' });
  tx.kvkkRequest.findUnique.mockResolvedValue(openRequest());
  tx.kvkkRequest.update.mockResolvedValue({});
  tx.kvkkEvidence.create.mockResolvedValue({});
  tx.kvkkEvent.create.mockResolvedValue({});
  tx.adminAction.create.mockResolvedValue({});
});

/** Tüm denetim + olay payload'larında kişisel veri taraması. */
function assertNoSubjectEmailInLedgers() {
  const payloads = [
    ...tx.adminAction.create.mock.calls.map((c) => JSON.stringify(c[0])),
    ...tx.kvkkEvent.create.mock.calls.map((c) => JSON.stringify(c[0])),
  ];
  for (const p of payloads) expect(p).not.toContain('talep-sahibi@ornek.com');
}

describe('createKvkkRequest', () => {
  const input = {
    reference: 'KVKK-2026-0002',
    subjectEmail: 'talep-sahibi@ornek.com',
    type: 'access',
    receivedAt: RECEIVED,
  } as const;

  it('statutoryDueAt kod hesaplar: +30 gün', async () => {
    await admin.createKvkkRequest('u1', input, 'posta ile geldi');

    const data = (tx.kvkkRequest.create.mock.calls[0]![0] as { data: { statutoryDueAt: Date } }).data;
    expect(data.statutoryDueAt.toISOString()).toBe('2026-09-20T10:00:00.000Z');
  });

  it('received olayı + denetim yazılır; subjectEmail hiçbir deftere sızmaz', async () => {
    await admin.createKvkkRequest('u1', input, 'posta ile geldi');

    expect(tx.kvkkEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'received' }) }),
    );
    expect(tx.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'kvkk.created' }) }),
    );
    assertNoSubjectEmailInLedgers();
  });

  it('mükerrer referans P2002 → dostça mesaj', async () => {
    const { Prisma } = await import('@prisma/client');
    tx.kvkkRequest.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
    );
    await expect(admin.createKvkkRequest('u1', input, 's')).rejects.toThrow('zaten kullanılmış');
  });
});

describe('verifyKvkkIdentity', () => {
  it('intake → in_progress, alanlar dolar, olay düşer', async () => {
    tx.kvkkRequest.findUnique.mockResolvedValue(openRequest({ status: 'intake', identityVerifiedAt: null }));

    await admin.verifyKvkkIdentity('u1', 'kv1', 'e-Devlet doğrulaması', 'kimlik geldi');

    expect(tx.kvkkRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'in_progress', identityMethod: 'e-Devlet doğrulaması' }),
      }),
    );
    expect(tx.kvkkEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'identity_verified' }) }),
    );
  });

  it('zaten doğrulanmışsa reddeder', async () => {
    tx.kvkkRequest.findUnique.mockResolvedValue(openRequest({ status: 'intake' }));
    await expect(admin.verifyKvkkIdentity('u1', 'kv1', 'x', 's')).rejects.toThrow('zaten doğrulanmış');
  });
});

describe('assignKvkkOwner', () => {
  it('sahip staff değilse reddeder', async () => {
    tx.user.findFirst.mockResolvedValue(null);
    await expect(admin.assignKvkkOwner('u1', 'kv1', 'x@y.com', 's')).rejects.toThrow('personel olmalı');
    expect(tx.kvkkRequest.update).not.toHaveBeenCalled();
  });

  it('staff sahibi bağlar ve olay düşer', async () => {
    await admin.assignKvkkOwner('u1', 'kv1', 'destek@voldi.net', 'iş bölümü');

    expect(tx.kvkkRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: 'u2', ownerEmail: 'destek@voldi.net' }),
      }),
    );
    expect(tx.kvkkEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'owner_assigned' }) }),
    );
  });

  it('completed talebe sahip atanamaz', async () => {
    tx.kvkkRequest.findUnique.mockResolvedValue(openRequest({ status: 'completed' }));
    await expect(admin.assignKvkkOwner('u1', 'kv1', 'destek@voldi.net', 's')).rejects.toThrow('kapatılmış');
  });
});

describe('addKvkkEvidence', () => {
  it('kanıt satırı + olay (payload yalnız label — konum defterde ama olayda değil)', async () => {
    await admin.addKvkkEvidence('u1', 'kv1', { label: 'Kimlik teyidi', location: '/dosya/x.pdf' }, 'arşiv');

    expect(tx.kvkkEvidence.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ label: 'Kimlik teyidi' }) }),
    );
    const event = tx.kvkkEvent.create.mock.calls[0]![0] as { data: { payload: Record<string, unknown> } };
    expect(event.data.payload).toEqual({ label: 'Kimlik teyidi' });
  });

  it('completed talebe kanıt eklenemez', async () => {
    tx.kvkkRequest.findUnique.mockResolvedValue(openRequest({ status: 'completed' }));
    await expect(
      admin.addKvkkEvidence('u1', 'kv1', { label: 'L', location: '/x' }, 's'),
    ).rejects.toThrow('kapatılmış');
  });
});

describe('setKvkkStatus', () => {
  it('izinli geçiş: in_progress → legal_review', async () => {
    await admin.setKvkkStatus('u1', 'kv1', 'legal_review', 'hukuk görüşü');

    expect(tx.kvkkRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'legal_review' }) }),
    );
    const event = tx.kvkkEvent.create.mock.calls[0]![0] as { data: { payload: Record<string, unknown> } };
    expect(event.data.payload).toEqual({ from: 'in_progress', to: 'legal_review' });
  });

  it('izinsiz geçiş reddedilir (intake → legal_review)', async () => {
    tx.kvkkRequest.findUnique.mockResolvedValue(openRequest({ status: 'intake', identityVerifiedAt: null }));
    await expect(admin.setKvkkStatus('u1', 'kv1', 'legal_review', 's')).rejects.toThrow('geçilemez');
  });

  it('identity_check → in_progress yalnız kimlik doğrulanmışsa', async () => {
    tx.kvkkRequest.findUnique.mockResolvedValue(
      openRequest({ status: 'identity_check', identityVerifiedAt: null }),
    );
    await expect(admin.setKvkkStatus('u1', 'kv1', 'in_progress', 's')).rejects.toThrow('doğrulanmadan');
  });
});

describe('completeKvkkRequest', () => {
  it('kimlik doğrulanmadan kapatılamaz', async () => {
    tx.kvkkRequest.findUnique.mockResolvedValue(openRequest({ identityVerifiedAt: null }));
    await expect(admin.completeKvkkRequest('u1', 'kv1', 'özet', 's')).rejects.toThrow(
      'Kimlik doğrulanmadan',
    );
  });

  it('in_progress → completed: respondedAt + özet + iki olay', async () => {
    await admin.completeKvkkRequest('u1', 'kv1', 'Verinin kopyası iletildi.', 'yanıt gitti');

    expect(tx.kvkkRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'completed', responseSummary: 'Verinin kopyası iletildi.' }),
      }),
    );
    const eventTypes = tx.kvkkEvent.create.mock.calls.map(
      (c) => (c[0] as { data: { type: string } }).data.type,
    );
    expect(eventTypes).toEqual(['responded', 'completed']);
    assertNoSubjectEmailInLedgers();
  });
});
