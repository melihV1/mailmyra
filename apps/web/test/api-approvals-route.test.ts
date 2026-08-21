import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regresyon: `field()` yalnız string döner, panelin gönderdiği JSON SAYI
 * `requiredApprovals` onunla okunursa sessizce '' → `undefined` olur ve her
 * istek eşik 1'e düşerdi (bkz. ApprovalActions.tsx `NewApprovalButton`, gövde
 * `JSON.stringify({ requiredApprovals: Number(...) })` yolluyor).
 *
 * Route seviyesinde test: `createApprovalRequest`e ne GEÇTİĞİ önemli, repo
 * davranışı değil (o admin-approval-writes.test.ts'te, gerçek transaction
 * taklidiyle test ediliyor). Auth ve repo burada taklit edilir — amaç
 * yalnız HTTP gövdesinden repo çağrısına giden tip çevirisi.
 */

const createApprovalRequest = vi.fn();

vi.mock('../lib/repo/admin', () => ({
  createApprovalRequest: (...args: unknown[]) => createApprovalRequest(...args),
  // `../_shared` (admin/_shared.ts) `adminError`de `instanceof NotStaffError`
  // kontrolü yapıyor — modül tamamen taklit edildiği için gerçek sınıf
  // olmadan o satır `instanceof undefined` ile patlardı.
  NotStaffError: class NotStaffError extends Error {},
}));

vi.mock('../lib/auth/current', () => ({
  currentSession: async () => ({
    id: 'sess1',
    user: { id: 'u1', email: 'staff@voldi.net', emailVerifiedAt: new Date(), avatarUrl: null },
    expiresAt: new Date(Date.now() + 60_000),
  }),
}));

const { POST } = await import('../app/api/admin/approvals/route');

function jsonReq(body: unknown): Request {
  return new Request('https://app.mailmyra.com/api/admin/approvals', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  createApprovalRequest.mockReset();
  createApprovalRequest.mockResolvedValue({ id: 'req1' });
});

describe('POST /api/admin/approvals — requiredApprovals geçişi', () => {
  it('JSON sayı olarak gelirse repo çağrısına sayı olarak gider', async () => {
    const res = await POST(
      jsonReq({
        title: 'Koltuk artışı',
        domain: 'entitlement',
        riskLevel: 'high',
        reason: 'müşteri istedi',
        requiredApprovals: 2,
      }),
    );

    expect(res.status).toBe(200);
    expect(createApprovalRequest).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ requiredApprovals: 2 }),
      'müşteri istedi',
      expect.anything(),
    );
  });

  it('sayı olmayan (string) değer repo çağrısına undefined olarak gider — çöp değeri 1-3 koruması eler, burada sadece geçişi doğru okumak test edilir', async () => {
    const res = await POST(
      jsonReq({
        title: 'Koltuk artışı',
        domain: 'entitlement',
        riskLevel: 'high',
        reason: 'müşteri istedi',
        requiredApprovals: 'abc',
      }),
    );

    expect(res.status).toBe(200);
    expect(createApprovalRequest).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ requiredApprovals: undefined }),
      'müşteri istedi',
      expect.anything(),
    );
  });
});
