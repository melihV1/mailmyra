import { currentSession } from '../../../../../lib/auth/current';
import { deleteSenderAs } from '../../../../../lib/repo/senders';
import { json } from '../../../auth/_shared';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const { id } = await params;
  const result = await deleteSenderAs(session.user.id, id);

  if (!result.ok) {
    const status =
      result.reason === 'forbidden' ? 403 : result.reason === 'is_live' ? 409 : 404;
    return json(status, { error: result.reason });
  }
  return json(200, { ok: true });
}
