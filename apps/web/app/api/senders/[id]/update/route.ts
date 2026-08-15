import { currentSession } from '../../../../../lib/auth/current';
import { updateSenderAs } from '../../../../../lib/repo/senders';
import { field, json, readJsonBody } from '../../../auth/_shared';

/* POST (PATCH değil): IIS/WebDAV canlıda yalnız GET/POST geçirir. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const body = await readJsonBody(req);
  const displayName = field(body, 'displayName').trim();
  const email = field(body, 'email').trim();
  if (!displayName || !email.includes('@')) return json(400, { error: 'invalid_input' });

  const { id } = await params;
  const result = await updateSenderAs(session.user.id, id, {
    displayName,
    email,
    jobTitle: field(body, 'jobTitle') || undefined,
  });

  if (!result.ok) {
    const status =
      result.reason === 'forbidden'
        ? 403
        : result.reason === 'not_found'
          ? 404
          : 409; /* email_taken | email_locked */
    return json(status, { error: result.reason });
  }
  return json(200, { ok: true });
}
