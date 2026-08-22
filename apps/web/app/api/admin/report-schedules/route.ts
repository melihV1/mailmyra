import { readJsonBody, field } from '../../auth/_shared';
import {
  createReportSchedule,
  type ReportCadence,
  type ReportScheduleFormat,
} from '../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../_shared';

/** Rapor zamanlaması açar. `recipients` panelden JSON DİZİ gelir — `field()`
 *  yalnız string döndürdüğü için ham gövdeden `Array.isArray` ile okunur
 *  (approvals route'undaki `requiredApprovals` dersinin dizi hali). */
export async function POST(req: Request): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const body = await readJsonBody(req);

  const cadence = field(body, 'cadence');
  if (!['daily', 'weekly', 'monthly'].includes(cadence)) {
    return json(400, { error: 'Kadans gerekli.' });
  }
  const format = field(body, 'format');
  if (!['digest', 'csv'].includes(format)) {
    return json(400, { error: 'Format gerekli.' });
  }
  const recipients = Array.isArray(body.recipients)
    ? body.recipients.filter((r): r is string => typeof r === 'string')
    : [];

  try {
    const res = await createReportSchedule(
      auth.userId,
      {
        reportId: field(body, 'reportId'),
        cadence: cadence as ReportCadence,
        format: format as ReportScheduleFormat,
        recipients,
      },
      field(body, 'reason'),
      staffCtx(req),
    );
    return json(200, { ok: true, id: res.id });
  } catch (err) {
    return adminError(err);
  }
}
