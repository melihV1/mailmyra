/**
 * Next.js enstrümantasyonu — sunucu tarafı istek hatalarını gerçek bir
 * deftere yazar (`ErrorGroup` + `ErrorEvent`). Admin panelinin "Errors"
 * ekranının TEK kaynağı budur; başka hiçbir yer hata satırı üretmez.
 *
 * TAMAMEN en-iyi-çaba: burada fırlatan hiçbir şey isteği İKİNCİ kez
 * öldüremez — her yol try/catch içinde ve prisma dinamik import (edge
 * çalışma zamanında ve DB'siz ortamlarda sessizce vazgeçer).
 */
export function register(): void {
  // Başlangıçta yapılacak iş yok — dosya onRequestError için var.
}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    const { createHash } = await import('node:crypto');
    const { prisma } = await import('./lib/db');

    const e = err instanceof Error ? err : new Error(String(err));
    // Parmak izi: ad + mesaj — aynı hata tek grupta birikir. Yol dahil
    // DEĞİL: aynı hata iki rotadan gelirse iki grup istemeyiz; yüzey
    // grubun `surface` alanında son görülen olarak durur.
    const fingerprint = createHash('sha256')
      .update(`${e.name}|${e.message}`)
      .digest('hex')
      .slice(0, 32);
    const surface = `${request.method} ${request.path}`.slice(0, 100);

    await prisma.errorGroup.upsert({
      where: { fingerprint },
      update: { lastSeenAt: new Date(), surface },
      create: {
        fingerprint,
        title: e.message.slice(0, 200) || e.name,
        surface,
        severity: 'error',
      },
    });
    await prisma.errorEvent.create({ data: { fingerprint } });
  } catch {
    // gözlem katmanı isteğe asla ikinci zarar veremez
  }
}
