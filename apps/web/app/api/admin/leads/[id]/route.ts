import { readJsonBody, field } from '../../../auth/_shared';
import { updateLead, type LeadStage } from '../../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../../_shared';

const LEAD_STAGES: readonly LeadStage[] = ['new', 'qualified', 'scheduled', 'won', 'lost'];

/** Lead günceller — repo en az bir alan ister (`Değiştirilecek alan yok.`). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await readJsonBody(req);

  const seats = typeof body.seats === 'number' ? body.seats : undefined;
  const stageRaw = field(body, 'stage');
  const stage = LEAD_STAGES.includes(stageRaw as LeadStage) ? (stageRaw as LeadStage) : undefined;
  const nextStep = field(body, 'nextStep') || undefined;

  try {
    await updateLead(auth.userId, id, { stage, nextStep, seats }, field(body, 'reason'), staffCtx(req));
    return json(200, { ok: true });
  } catch (err) {
    return adminError(err);
  }
}
