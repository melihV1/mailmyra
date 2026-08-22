import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regresyon: `field()` yalnız string döner — `recipients` panelden JSON
 * DİZİ gelir, `field()` ile okunsaydı sessizce '' → boş listeye düşerdi
 * (api-approvals-route.test.ts'teki `requiredApprovals` dersinin dizi hali).
 * Route seviyesinde: `createReportSchedule`/`setReportScheduleStatus`e ne
 * GEÇTİĞİ önemli, repo davranışı değil (o report-schedule.test.ts'te test
 * ediliyor).
 */

const createReportSchedule = vi.fn();
const setReportScheduleStatus = vi.fn();

vi.mock('../lib/repo/admin', () => ({
  createReportSchedule: (...args: unknown[]) => createReportSchedule(...args),
  setReportScheduleStatus: (...args: unknown[]) => setReportScheduleStatus(...args),
  NotStaffError: class NotStaffError extends Error {},
}));

vi.mock('../lib/auth/current', () => ({
  currentSession: async () => ({
    id: 'sess1',
    user: { id: 'u1', email: 'staff@voldi.net', emailVerifiedAt: new Date(), avatarUrl: null },
    expiresAt: new Date(Date.now() + 60_000),
  }),
}));

const { POST: postCreate } = await import('../app/api/admin/report-schedules/route');
const { POST: postStatus } = await import('../app/api/admin/report-schedules/[id]/status/route');

function jsonReq(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  createReportSchedule.mockReset();
  setReportScheduleStatus.mockReset();
  createReportSchedule.mockResolvedValue({ id: 'sched1' });
});

describe('POST /api/admin/report-schedules — gövde → repo argümanı', () => {
  it('tam gövde repo çağrısına birebir gider, recipients dizi olarak kalır', async () => {
    const res = await postCreate(
      jsonReq('https://app.mailmyra.com/api/admin/report-schedules', {
        reportId: 'support-operations',
        cadence: 'weekly',
        format: 'digest',
        recipients: ['a@voldi.net', 'b@voldi.net'],
        reason: 'haftalık takip',
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, id: 'sched1' });
    expect(createReportSchedule).toHaveBeenCalledWith(
      'u1',
      {
        reportId: 'support-operations',
        cadence: 'weekly',
        format: 'digest',
        recipients: ['a@voldi.net', 'b@voldi.net'],
      },
      'haftalık takip',
      expect.anything(),
    );
  });

  it('recipients dizi değilse (string çöp) boş diziye düşer, repo yine çağrılır', async () => {
    const res = await postCreate(
      jsonReq('https://app.mailmyra.com/api/admin/report-schedules', {
        reportId: 'support-operations',
        cadence: 'weekly',
        format: 'digest',
        recipients: 'a@voldi.net',
        reason: 'haftalık takip',
      }),
    );

    expect(res.status).toBe(200);
    expect(createReportSchedule).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ recipients: [] }),
      'haftalık takip',
      expect.anything(),
    );
  });

  it('dizideki string olmayan elemanlar elenir', async () => {
    const res = await postCreate(
      jsonReq('https://app.mailmyra.com/api/admin/report-schedules', {
        reportId: 'support-operations',
        cadence: 'weekly',
        format: 'digest',
        recipients: ['a@voldi.net', 42, null, 'b@voldi.net'],
        reason: 'haftalık takip',
      }),
    );

    expect(res.status).toBe(200);
    expect(createReportSchedule).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ recipients: ['a@voldi.net', 'b@voldi.net'] }),
      'haftalık takip',
      expect.anything(),
    );
  });

  it('geçersiz kadans 400 döner, repo çağrılmaz', async () => {
    const res = await postCreate(
      jsonReq('https://app.mailmyra.com/api/admin/report-schedules', {
        reportId: 'support-operations',
        cadence: 'hourly',
        format: 'digest',
        recipients: ['a@voldi.net'],
        reason: 'x',
      }),
    );

    expect(res.status).toBe(400);
    expect(createReportSchedule).not.toHaveBeenCalled();
  });

  it('geçersiz format 400 döner, repo çağrılmaz', async () => {
    const res = await postCreate(
      jsonReq('https://app.mailmyra.com/api/admin/report-schedules', {
        reportId: 'support-operations',
        cadence: 'weekly',
        format: 'pdf',
        recipients: ['a@voldi.net'],
        reason: 'x',
      }),
    );

    expect(res.status).toBe(400);
    expect(createReportSchedule).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/report-schedules/[id]/status', () => {
  it('geçerli durum repo çağrısına gider', async () => {
    const res = await postStatus(
      jsonReq('https://app.mailmyra.com/api/admin/report-schedules/sched1/status', {
        status: 'paused',
        reason: 'gürültü çok',
      }),
      params('sched1'),
    );

    expect(res.status).toBe(200);
    expect(setReportScheduleStatus).toHaveBeenCalledWith(
      'u1',
      'sched1',
      'paused',
      'gürültü çok',
      expect.anything(),
    );
  });

  it('geçersiz durum 400 döner, repo çağrılmaz', async () => {
    const res = await postStatus(
      jsonReq('https://app.mailmyra.com/api/admin/report-schedules/sched1/status', {
        status: 'deleted',
        reason: 'x',
      }),
      params('sched1'),
    );

    expect(res.status).toBe(400);
    expect(setReportScheduleStatus).not.toHaveBeenCalled();
  });
});
