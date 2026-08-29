/**
 * Panelin kendi kökü — e-postalara konan bağlantılar buradan kurulur.
 *
 * Dört dosyada birebir kopyalanmıştı (`auth/flows.ts`, `repo/admin.ts`,
 * `repo/members.ts`, `repo/senders.ts`); beşinci tüketici gelince tek yere
 * alındı. Env'den okunur ve istekten TÜRETİLMEZ — `marketingOrigin()`
 * ile aynı gerekçe: `Origin`/`Referer`e güvenmek açık yönlendirmedir.
 */
export function appUrl(env: Record<string, string | undefined> = process.env): string {
  return env.APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
}
