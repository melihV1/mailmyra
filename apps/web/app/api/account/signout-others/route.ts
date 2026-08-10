import { currentSession } from '../../../../lib/auth/current';
import { revokeOtherSessions } from '../../../../lib/auth/session';
import { json } from '../../auth/_shared';

export async function POST(): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  await revokeOtherSessions(session.user.id, session.id);
  return json(200, { ok: true });
}
