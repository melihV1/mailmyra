import { currentSession } from '../../../../../lib/auth/current';
import { changeMemberRole } from '../../../../../lib/repo/members';
import { field, json, readJsonBody } from '../../../auth/_shared';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const { userId } = await params;
  const body = await readJsonBody(req);
  const result = await changeMemberRole(session.user.id, userId, field(body, 'role'));
  if (!result.ok) {
    const status =
      result.reason === 'forbidden' ? 403 : result.reason === 'not_found' ? 404 : 409;
    return json(status, { error: result.reason });
  }
  return json(200, { ok: true });
}
