import { currentSession } from '../../../lib/auth/current';
import { createSender } from '../../../lib/repo/senders';
import { field, json, readJsonBody } from '../auth/_shared';

export async function POST(req: Request): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const body = await readJsonBody(req);
  const displayName = field(body, 'displayName').trim();
  const email = field(body, 'email').trim();
  if (!displayName || !email.includes('@')) return json(400, { error: 'invalid_input' });

  const result = await createSender(session.user.id, {
    displayName,
    email,
    jobTitle: field(body, 'jobTitle') || undefined,
  });

  if (!result.ok) {
    return json(result.reason === 'forbidden' ? 403 : 409, { error: result.reason });
  }
  return json(200, { ok: true, id: result.id });
}
