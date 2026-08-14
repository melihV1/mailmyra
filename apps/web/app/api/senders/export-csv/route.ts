import { currentSession } from '../../../../lib/auth/current';
import { sendersToCsv } from '../../../../lib/csv';
import { listSenders } from '../../../../lib/repo/senders';
import { json } from '../../auth/_shared';

/**
 * Gönderici listesi CSV'si. Rol kapısı YOK bilerek: liste zaten her role
 * ekranda görünüyor (`signature:view` herkeste), CSV aynı verinin dosyası —
 * zip export'un aksine imza İÇERİĞİ vermez, o yüzden onun kapısına girmez.
 */
export async function GET(): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const rows = await listSenders(session.user.id);
  const csv = sendersToCsv(rows);
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="mailmyra-senders-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
