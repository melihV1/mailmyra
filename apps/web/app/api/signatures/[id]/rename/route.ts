import { currentSession } from '../../../../../lib/auth/current';
import { renameSignature } from '../../../../../lib/repo/signatures';
import { field, json, readJsonBody } from '../../../auth/_shared';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const body = await readJsonBody(req);
  const name = field(body, 'name').trim();
  if (!name || name.length > 255) return json(400, { error: 'invalid_input' });

  const { id } = await params;
  const result = await renameSignature(session.user.id, id, name);

  if (!result.ok) {
    return json(result.reason === 'forbidden' ? 403 : 404, { error: result.reason });
  }
  return json(200, { ok: true });
}
