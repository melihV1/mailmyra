import { currentSession } from '../../../../lib/auth/current';
import { acceptInvitation } from '../../../../lib/repo/members';
import { field, json, readJsonBody } from '../../auth/_shared';

export async function POST(req: Request): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const body = await readJsonBody(req);
  const result = await acceptInvitation(field(body, 'token'), session.user.id);
  if (!result.ok) {
    return json(result.reason === 'already_member' ? 409 : 400, { error: result.reason });
  }
  return json(200, { ok: true, orgId: result.orgId });
}
