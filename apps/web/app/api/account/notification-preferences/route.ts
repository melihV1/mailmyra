import { currentSession } from '../../../../lib/auth/current';
import { savePreferences } from '../../../../lib/repo/notification-prefs';
import { json, readJsonBody } from '../../auth/_shared';

/** Tercih tablosu tek çağrıda kaydedilir (ekranda tek "Save" düğmesi). */
export async function POST(req: Request): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const body = await readJsonBody(req);
  const raw = (body as { preferences?: unknown }).preferences;
  if (!Array.isArray(raw)) return json(400, { error: 'invalid_input' });

  // Bilinmeyen tipler `savePreferences` içinde eleniyor; burada yalnız şekil.
  const rows = raw
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      type: String(r.type ?? ''),
      inApp: r.inApp !== false,
      email: r.email !== false,
    }));

  await savePreferences(session.user.id, rows);
  return json(200, { ok: true });
}
