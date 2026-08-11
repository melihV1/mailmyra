import { currentSession } from '../../../../lib/auth/current';
import { bulkCreateSenders } from '../../../../lib/repo/senders';
import { json, readJsonBody } from '../../auth/_shared';

const MAX_ROWS = 1000;

export async function POST(req: Request): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const body = await readJsonBody(req);
  const rows = (body as { rows?: unknown }).rows;
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_ROWS) {
    return json(400, { error: 'invalid_input' });
  }
  const clean: Array<{ displayName: string; email: string; jobTitle?: string }> = [];
  for (const r of rows) {
    const displayName = typeof (r as { displayName?: unknown }).displayName === 'string' ? (r as { displayName: string }).displayName.trim() : '';
    const email = typeof (r as { email?: unknown }).email === 'string' ? (r as { email: string }).email.trim() : '';
    const jobTitle = typeof (r as { jobTitle?: unknown }).jobTitle === 'string' ? (r as { jobTitle: string }).jobTitle : undefined;
    // İstemci zaten doğruladı; burası kemer-pantolon askısı.
    if (!displayName || !email.includes('@')) return json(400, { error: 'invalid_input' });
    clean.push({ displayName, email, jobTitle });
  }

  const result = await bulkCreateSenders(session.user.id, clean);
  if (!result.ok) return json(403, { error: result.reason });
  return json(200, { ok: true, created: result.created, skipped: result.skipped });
}
