import { verifyEmailToken } from '../../../../lib/auth/flows';
import { field, json, readJsonBody } from '../_shared';

export async function POST(req: Request): Promise<Response> {
  const body = await readJsonBody(req);
  const result = await verifyEmailToken(field(body, 'token'));
  return result.ok ? json(200, { ok: true }) : json(400, { error: result.reason });
}
