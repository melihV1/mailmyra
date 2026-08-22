import { readJsonBody, field } from '../../../../auth/_shared';
import { setReportScheduleStatus } from '../../../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../../../_shared';

/** Duraklat/sürdür — repo yalnız DİĞER durumdan geçişe izin verir. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await readJsonBody(req);

  const status = field(body, 'status');
  if (!['active', 'paused'].includes(status)) {
    return json(400, { error: 'Hedef durum gerekli.' });
  }

  try {
    await setReportScheduleStatus(
      auth.userId,
      id,
      status as 'active' | 'paused',
      field(body, 'reason'),
      staffCtx(req),
    );
    return json(200, { ok: true });
  } catch (err) {
    return adminError(err);
  }
}
