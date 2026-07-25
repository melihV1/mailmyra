/**
 * `X-Forwarded-For` zincirinde SOL taraf istemcinin kendisidir ve serbestçe
 * sahtelenebilir (spoofable) — arkadaki proxy zincirine ekleme yapan (append
 * eden) bir kurulumda güvenilecek tek girdi SAĞ uçtaki (en son eklenen)
 * girdidir. Boş/whitespace-only değer veya header'ın kendisi yoksa 'local'.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (!xff) return 'local';
  const last = xff.split(',').pop()?.trim();
  return last ? last : 'local';
}
