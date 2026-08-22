import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regresyon: `field()` yalnız string döner — `grant` panelden JSON BOOLEAN
 * gelir, `field()` ile okunsaydı sessizce '' → `undefined` olurdu
 * (api-approvals-route.test.ts'teki `requiredApprovals` dersinin boolean
 * hali). `grant` string olmayan HER değerde 400 "grant (true|false)
 * gerekli." — sessiz undefined-passthrough burada YOK, çünkü `setStaffFlag`
 * `grant: boolean` parametresini zorunlu alıyor (opsiyonel değil).
 * Route seviyesinde: `setStaffFlag`e ne GEÇTİĞİ önemli, repo davranışı
 * değil (o admin-staff-flag.test.ts'te test ediliyor).
 */

const setStaffFlag = vi.fn();

vi.mock('../lib/repo/admin', () => ({
  setStaffFlag: (...args: unknown[]) => setStaffFlag(...args),
  NotStaffError: class NotStaffError extends Error {},
}));

vi.mock('../lib/auth/current', () => ({
  currentSession: async () => ({
    id: 'sess1',
    user: { id: 'u1', email: 'staff@voldi.net', emailVerifiedAt: new Date(), avatarUrl: null },
    expiresAt: new Date(Date.now() + 60_000),
  }),
}));

const { POST } = await import('../app/api/admin/staff/flag/route');

function jsonReq(body: unknown): Request {
  return new Request('https://app.mailmyra.com/api/admin/staff/flag', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  setStaffFlag.mockReset();
  setStaffFlag.mockResolvedValue(undefined);
});

describe('POST /api/admin/staff/flag — gövde → repo argümanı', () => {
  it('grant true olarak gelirse repo çağrısına boolean true olarak gider', async () => {
    const res = await POST(
      jsonReq({
        targetEmail: 'yeni@voldi.net',
        grant: true,
        approvalRequestId: 'req1',
        reason: 'onaylandı',
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(setStaffFlag).toHaveBeenCalledWith(
      'u1',
      'yeni@voldi.net',
      true,
      'req1',
      'onaylandı',
      expect.anything(),
    );
  });

  it('grant false olarak gelirse repo çağrısına boolean false olarak gider', async () => {
    const res = await POST(
      jsonReq({
        targetEmail: 'eski@voldi.net',
        grant: false,
        approvalRequestId: 'req2',
        reason: 'ayrıldı',
      }),
    );

    expect(res.status).toBe(200);
    expect(setStaffFlag).toHaveBeenCalledWith(
      'u1',
      'eski@voldi.net',
      false,
      'req2',
      'ayrıldı',
      expect.anything(),
    );
  });

  it("grant string 'true' olarak gelirse 400 döner, repo çağrılmaz", async () => {
    const res = await POST(
      jsonReq({
        targetEmail: 'yeni@voldi.net',
        grant: 'true',
        approvalRequestId: 'req1',
        reason: 'onaylandı',
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: 'grant (true|false) gerekli.' });
    expect(setStaffFlag).not.toHaveBeenCalled();
  });

  it('grant hiç gönderilmezse 400 döner, repo çağrılmaz', async () => {
    const res = await POST(
      jsonReq({
        targetEmail: 'yeni@voldi.net',
        approvalRequestId: 'req1',
        reason: 'onaylandı',
      }),
    );

    expect(res.status).toBe(400);
    expect(setStaffFlag).not.toHaveBeenCalled();
  });
});
