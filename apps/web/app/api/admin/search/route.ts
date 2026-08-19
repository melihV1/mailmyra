import { searchAdmin } from '../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId } from '../_shared';

/** Global arama: org adı (parça) · fatura no (parça) · e-posta (birebir). */
export async function GET(req: Request): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;

  const q = new URL(req.url).searchParams.get('q') ?? '';
  try {
    return json(200, await searchAdmin(auth.userId, q));
  } catch (err) {
    return adminError(err);
  }
}
