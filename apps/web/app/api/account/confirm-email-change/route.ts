import { confirmEmailChange } from '../../../../lib/auth/flows';
import { getMailer } from '../../../../lib/mail';
import { field, json, readJsonBody } from '../../auth/_shared';

/**
 * Oturum GEREKMEZ — linke tıklayan kullanıcı farklı bir tarayıcıda/cihazda
 * olabilir (yeni adresin gelen kutusu genelde başka yerde açık). Token
 * kanıtın kendisi.
 */
export async function POST(req: Request): Promise<Response> {
  const body = await readJsonBody(req);
  const result = await confirmEmailChange(field(body, 'token'), getMailer());
  if (result.ok) return json(200, { ok: true });

  const status = result.reason === 'email_taken' ? 409 : 400; // invalid_token
  return json(status, { error: result.reason });
}
