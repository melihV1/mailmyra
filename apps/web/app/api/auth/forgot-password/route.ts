import { requestPasswordReset } from '../../../../lib/auth/flows';
import { clientIp } from '../../../../lib/client-ip';
import { getMailer } from '../../../../lib/mail';
import { field, json, readJsonBody } from '../_shared';

export async function POST(req: Request): Promise<Response> {
  const body = await readJsonBody(req);

  const result = await requestPasswordReset(
    { email: field(body, 'email'), ip: clientIp(req) },
    getMailer(),
  );

  if (!result.ok) {
    return json(
      429,
      { error: result.reason, retryAfterSeconds: result.retryAfterSeconds },
      { 'Retry-After': String(result.retryAfterSeconds) },
    );
  }

  // 202: kabul edildi. Hesap var mı yok mu — cevap ikisinde de bu.
  return json(202, { ok: true });
}
