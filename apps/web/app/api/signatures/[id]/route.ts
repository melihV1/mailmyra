import { currentSession } from '../../../../lib/auth/current';
import { deleteSignature, getSignature } from '../../../../lib/repo/signatures';
import { json } from '../../auth/_shared';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const { id } = await params;
  const result = await getSignature(session.user.id, id);
  if (!result.ok) return json(404, { error: result.reason });
  return json(200, { ok: true, signature: result.signature });
}

export async function DELETE(_req: Request, { params }: Params): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const { id } = await params;
  const result = await deleteSignature(session.user.id, id);
  if (!result.ok) {
    return json(result.reason === 'forbidden' ? 403 : 404, { error: result.reason });
  }
  return new Response(null, { status: 204 });
}
