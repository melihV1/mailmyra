import { currentSession } from '../../../../lib/auth/current';
import { requestEmailChange } from '../../../../lib/auth/flows';
import { getMailer } from '../../../../lib/mail';
import { field, json, readJsonBody } from '../../auth/_shared';

/** Spec §3. Doğrulama YENİ adrese gider — eski adres onaya kadar değişmez. */
export async function POST(req: Request): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const body = await readJsonBody(req);
  const result = await requestEmailChange(
    session.user.id,
    { newEmail: field(body, 'newEmail'), password: field(body, 'password') },
    getMailer(),
  );
  if (result.ok) return json(200, { ok: true });

  const status =
    result.reason === 'invalid_email' ? 400 : result.reason === 'email_taken' ? 409 : 403; // invalid_credentials
  return json(status, { error: result.reason });
}
