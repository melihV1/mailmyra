import { currentSession } from '../../../../lib/auth/current';
import { assignSignature, deleteSignature, getSignature } from '../../../../lib/repo/signatures';
import { json, readJsonBody } from '../../auth/_shared';

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

/** Atama: gövdede `senderIdentityId` (string ya da null = çöz). */
export async function PATCH(req: Request, { params }: Params): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const { id } = await params;
  const body = await readJsonBody(req);
  const raw = (body as { senderIdentityId?: unknown }).senderIdentityId;
  if (raw !== null && typeof raw !== 'string') return json(400, { error: 'invalid_input' });

  const result = await assignSignature(session.user.id, id, raw);
  if (!result.ok) {
    return json(result.reason === 'forbidden' ? 403 : 404, { error: result.reason });
  }
  return json(200, { ok: true });
}
