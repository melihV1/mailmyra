import { currentSession } from '../../../../../lib/auth/current';
import { publishSenderAs } from '../../../../../lib/repo/senders';
import { json } from '../../../auth/_shared';

/** Koltuk burada tükenir — kilitli transaction repo katmanında. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const { id } = await params;
  const result = await publishSenderAs(session.user.id, id);
  if (result.allowed) return json(200, { ok: true });

  const status =
    result.reason === 'not_found'
      ? 404
      : result.reason === 'forbidden'
        ? 403
        : 402; // seat_limit | not_entitled — spec §4
  return json(status, { error: result.reason });
}
