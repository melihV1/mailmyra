import { currentSession } from '../../../../../lib/auth/current';
import { revokeInvitation } from '../../../../../lib/repo/members';
import { json } from '../../../auth/_shared';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const { id } = await params;
  const result = await revokeInvitation(session.user.id, id);
  if (!result.ok) {
    return json(result.reason === 'forbidden' ? 403 : 404, { error: result.reason });
  }
  return json(200, { ok: true });
}
