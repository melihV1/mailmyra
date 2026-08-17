import { currentSession } from '../../../../../lib/auth/current';
import { renderSavedSignature } from '../../../../../lib/repo/export';
import { json } from '../../../auth/_shared';

/**
 * İmzanın gerçek render çıktısı — panel tablosundaki önizleme modalı için.
 *
 * Okuma ucu olduğu için GET; yazan uçların POST kuralı (IIS/WebDAV) burada
 * geçerli değil. `iconBaseUrl` builder/brand/export ile aynı desende her
 * istekte env'den okunur — CDN adresi derleme çıktısına gömülmez.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const { id } = await params;
  const result = await renderSavedSignature(session.user.id, id, process.env.CDN_PUBLIC_URL);
  if (!result.ok) {
    if (result.reason === 'render_failed') return json(500, { error: result.reason });
    return json(result.reason === 'forbidden' ? 403 : 404, { error: result.reason });
  }
  return json(200, { ok: true, html: result.html });
}
