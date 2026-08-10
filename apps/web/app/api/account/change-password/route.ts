import { changePassword } from '../../../../lib/auth/account';
import { currentSession } from '../../../../lib/auth/current';
import { field, json, readJsonBody } from '../../auth/_shared';

export async function POST(req: Request): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const body = await readJsonBody(req);
  const result = await changePassword(
    session.user.id,
    {
      currentPassword: field(body, 'currentPassword'),
      newPassword: field(body, 'newPassword'),
    },
    // İşlemi yapan oturum yaşar; diğerleri ölür.
    { keepSessionId: session.id },
  );

  if (!result.ok) {
    return json(result.reason === 'wrong_password' ? 403 : 400, { error: result.reason });
  }
  return json(200, { ok: true });
}
