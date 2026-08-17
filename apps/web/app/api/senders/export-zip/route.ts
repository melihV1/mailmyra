import { currentSession } from '../../../../lib/auth/current';
import { prisma } from '../../../../lib/db';
import { recordActivity } from '../../../../lib/repo/activity';
import { collectExportBundle } from '../../../../lib/repo/export';
import { buildZip } from '../../../../lib/zip';
import { json, readJsonBody } from '../../auth/_shared';

/** Spec §4. Salt-okunur; kilit yok. Statü eşlemesi bire bir spec tablosu. */
const STATUS: Record<string, number> = {
  forbidden: 403,
  not_found: 404,
  no_exportable: 409,
  too_many: 413,
};

export async function POST(req: Request): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const body = await readJsonBody(req);
  const raw = (body as { senderIds?: unknown }).senderIds;
  const senderIds = Array.isArray(raw)
    ? raw.filter((x): x is string => typeof x === 'string')
    : undefined;

  const bundle = await collectExportBundle(
    session.user.id,
    senderIds,
    200,
    process.env.CDN_PUBLIC_URL || undefined,
  );
  if (!bundle.ok) return json(STATUS[bundle.reason] ?? 400, { error: bundle.reason });

  const zip = await buildZip(
    bundle.files.map((f) => ({ filename: f.filename, content: f.html })),
  );

  /* Export GERÇEKLEŞTİ — dış denetim kuralı: "Exported" bilgisi ancak
     gerçek bir olay kaydediliyorsa gösterilir. Zip ÜRETİLDİKTEN sonra
     yazılır (render patlarsa sahte kayıt kalmaz); ikisi de hata yutar,
     indirme muhasebe yüzünden devrilmez. */
  await prisma.senderIdentity
    .updateMany({
      where: { id: { in: bundle.exportedSenderIds } },
      data: { lastExportedAt: new Date() },
    })
    .catch((err: unknown) => console.error('[export] lastExportedAt yazılamadı:', err));
  await recordActivity({
    orgId: bundle.orgId,
    actorUserId: session.user.id,
    type: 'export.zip',
    targetType: 'export',
    targetId: bundle.exportedSenderIds.length === 1 ? bundle.exportedSenderIds[0] : null,
    payload: { fileCount: bundle.files.length, senderCount: bundle.exportedSenderIds.length },
  });

  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(zip), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="mailmyra-imzalar-${date}.zip"`,
    },
  });
}
