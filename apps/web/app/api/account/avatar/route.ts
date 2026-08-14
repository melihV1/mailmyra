import { currentSession } from '../../../../lib/auth/current';
import { prisma } from '../../../../lib/db';
import { processImage, PipelineError } from '../../../../lib/image-pipeline';
import { getStorageAdapter } from '../../../../lib/storage';
import { json } from '../../auth/_shared';

/**
 * Kullanıcı avatarı (2026-08-15, profil sayfasıyla): imza görsel boru
 * hattının 'avatar' türü AYNEN kullanılır (180px/2x, PNG/JPG) — yeni bir
 * işleme yolu icat edilmedi. multipart file → yükle+kaydet; JSON
 * {remove:true} → kaldır. CDN URL'leri değişmezlik kuralına tabi: eski
 * dosya SİLİNMEZ, yalnız kullanıcı kaydı yeni URL'yi gösterir.
 */
export async function POST(req: Request): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const body = (await req.json().catch(() => ({}))) as { remove?: boolean };
    if (body.remove !== true) return json(400, { error: 'invalid_input' });
    await prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl: null } });
    return json(200, { ok: true, url: null });
  }

  if (!process.env.CDN_WRITE_PATH || !process.env.CDN_PUBLIC_URL) {
    return json(500, { error: 'storage_unconfigured' });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) return json(400, { error: 'invalid_input' });

  const input = Buffer.from(await file.arrayBuffer());
  try {
    const result = await processImage(input, 'avatar');
    const { url } = await getStorageAdapter().save(result.filename, result.buffer);
    await prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl: url } });
    return json(200, { ok: true, url, warning: result.warning });
  } catch (e) {
    if (e instanceof PipelineError) return json(e.status, { error: e.message });
    throw e;
  }
}
