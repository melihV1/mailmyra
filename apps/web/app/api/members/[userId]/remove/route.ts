import { currentSession } from '../../../../../lib/auth/current';
import { removeMember } from '../../../../../lib/repo/members';
import { json } from '../../../auth/_shared';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const { userId } = await params;
  const result = await removeMember(session.user.id, userId);
  if (!result.ok) {
    const status =
      result.reason === 'forbidden' ? 403 : result.reason === 'not_found' ? 404 : 409;
    return json(status, { error: result.reason });
  }
  return json(200, { ok: true });
}
