/**
 * Auth uçlarının ortak küçük parçaları.
 *
 * Uçlar bilerek ince: bütün davranış `lib/auth/flows.ts`'te yaşıyor ve orada
 * gerçek veritabanına karşı test ediliyor. Burada yalnız HTTP çevirisi var —
 * gövdeyi oku, akışı çağır, sonucu statü koduna ve çereze çevir.
 */

export async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await req.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // düşerek boş gövdeye
  }
  return {};
}

/** Alan yoksa ya da string değilse boş string — akışlar boşu zaten reddeder. */
export function field(body: Record<string, unknown>, name: string): string {
  const value = body[name];
  return typeof value === 'string' ? value : '';
}

export function json(status: number, payload: unknown, headers?: HeadersInit): Response {
  return Response.json(payload, { status, headers });
}
