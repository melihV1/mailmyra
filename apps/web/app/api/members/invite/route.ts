import { currentSession } from '../../../../lib/auth/current';
import { getMailer } from '../../../../lib/mail';
import { inviteMember } from '../../../../lib/repo/members';
import { field, json, readJsonBody } from '../../auth/_shared';

export async function POST(req: Request): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const body = await readJsonBody(req);
  const email = field(body, 'email').trim();
  if (!email.includes('@')) return json(400, { error: 'invalid_input' });

  const result = await inviteMember(
    session.user.id,
    { email, role: field(body, 'role') },
    getMailer(),
  );
  if (!result.ok) {
    const status = result.reason === 'forbidden' ? 403 : result.reason === 'already_member' ? 409 : 400;
    return json(status, { error: result.reason });
  }
  return json(200, { ok: true });
}
