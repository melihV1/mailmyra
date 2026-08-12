import { currentSession } from '../../../lib/auth/current';
import { parseBrandDocument } from '../../../lib/brand-doc';
import { saveBrandAs } from '../../../lib/repo/brand';
import { json, readJsonBody } from '../auth/_shared';

/** Spec §6. Doğrulama SIKI: belge org genelini yönetir. */
export async function POST(req: Request): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const body = await readJsonBody(req);
  const doc = parseBrandDocument((body as { data?: unknown }).data);
  if (!doc) return json(400, { error: 'invalid_input' });

  const result = await saveBrandAs(session.user.id, doc);
  if (!result.ok) return json(403, { error: result.reason });
  return json(200, { ok: true });
}
