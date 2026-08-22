import { readJsonBody, field } from '../../auth/_shared';
import { createLead, type LeadStage } from '../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../_shared';

const LEAD_STAGES: readonly LeadStage[] = ['new', 'qualified', 'scheduled', 'won', 'lost'];

/** Lead açar. `seats` panelden JSON SAYI gelir — `field()` yalnız string
 *  döndürdüğü için ham gövdeden tip kontrolüyle okunur (approvals route'undaki
 *  `requiredApprovals` dersinin aynısı). `stage` opsiyonel: geçersiz/eksikse
 *  repo'nun kendi varsayılanına (`'new'`) düşsün diye `undefined` geçilir. */
export async function POST(req: Request): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const body = await readJsonBody(req);

  const seats = typeof body.seats === 'number' ? body.seats : undefined;
  const stageRaw = field(body, 'stage');
  const stage = LEAD_STAGES.includes(stageRaw as LeadStage) ? (stageRaw as LeadStage) : undefined;

  try {
    const res = await createLead(
      auth.userId,
      {
        company: field(body, 'company'),
        contact: field(body, 'contact'),
        source: field(body, 'source'),
        seats,
        stage,
        nextStep: field(body, 'nextStep') || undefined,
      },
      field(body, 'reason'),
      staffCtx(req),
    );
    return json(200, { ok: true, id: res.id });
  } catch (err) {
    return adminError(err);
  }
}
