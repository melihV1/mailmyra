import { currentSession } from '../../../../lib/auth/current';
import { renameWorkspaceAs } from '../../../../lib/repo/members';
import { field, json, readJsonBody } from '../../auth/_shared';

/** POST (PATCH değil — IIS/WebDAV yalnız GET/POST geçirir, bkz. deploy notları). */
export async function POST(req: Request): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const body = await readJsonBody(req);
  const result = await renameWorkspaceAs(session.user.id, field(body, 'name'));

  if (!result.ok) {
    return json(result.reason === 'forbidden' ? 403 : 400, { error: result.reason });
  }
  return json(200, { ok: true });
}
