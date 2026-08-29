import { field, marketingOrigin, readBody, seeOther } from '../auth/_shared';
import { clientIp } from '../../../lib/client-ip';
import { envInt } from '../../../lib/env';
import { createInboundLead } from '../../../lib/repo/leads';
import { createRateLimiter } from '../../../lib/rate-limit';

/**
 * Pazarlama sitesindeki iki formun (anasayfadaki "Schedule a demo" ve
 * /contact) yazdığı halka açık uç.
 *
 * Neden `/api/admin/leads` kullanılmıyor: o uç staff oturumu ve denetim
 * gerekçesi istiyor; ziyaretçide ikisi de yok.
 *
 * Neden cevap 303: gövde düz bir `<form method="post">` gönderimiyle geliyor
 * ve tarayıcı cevabı doğrudan ekrana basıyor — JSON dönmek ziyaretçiye ham
 * `{"error":"..."}` göstermek demek (auth uçlarındaki gerekçenin aynısı,
 * `_shared.ts` baş yorumu). Aynı sebeple JavaScript kapalıyken de çalışır.
 *
 * Dönüş adresi WHITELIST'ten seçilir, `Referer`dan TÜRETİLMEZ — açık
 * yönlendirme açığı olurdu (`marketingOrigin()` yorumundaki aynı ders).
 * `form` alanı bilinmeyen bir değer taşırsa contact sayılır; böylece
 * dışarıdan gelen hiçbir dize hedefi belirleyemez.
 */

const RETURN = {
  demo: { page: 'index.html', hash: '#mailmyra-demo-form' },
  contact: { page: 'contact.html', hash: '#mm-contact-form' },
} as const;

type FormKey = keyof typeof RETURN;

/** contact.html'deki segment çipinin beş değeri — başkası jeneriğe düşer. */
const SEGMENTS: readonly string[] = ['agency', 'enterprise', 'team', 'freelancer', 'support'];

/** contact.html'deki `<select name="seats">` seçenekleri → aralığın alt sınırı. */
const SEAT_RANGES: Record<string, number> = {
  '1': 1,
  '5-9': 5,
  '10-49': 10,
  '50-199': 50,
  '200+': 200,
};

const limiter = createRateLimiter({
  limit: envInt(process.env.LEADS_RATE_LIMIT_PER_HOUR, 5),
  windowMs: 60 * 60 * 1000,
});

function back(form: FormKey, query: string): Response {
  const { page, hash } = RETURN[form];
  // Sorgu FRAGMENT'TEN ÖNCE gelmeli: `#y?x` yazılırsa tarayıcı sorguyu
  // fragment'in parçası sayar ve sayfa şeridi hiç açılmaz.
  return seeOther(`${marketingOrigin()}/${page}?${query}${hash}`);
}

function seatsFrom(body: Record<string, unknown>): number {
  const range = field(body, 'seats');
  if (range && Object.prototype.hasOwnProperty.call(SEAT_RANGES, range)) return SEAT_RANGES[range]!;
  const teamSize = Number.parseInt(field(body, 'team_size'), 10);
  return Number.isInteger(teamSize) && teamSize >= 1 ? teamSize : 1;
}

/** Serbest alanları tek metne toplar; boş olan hiç yazılmaz. */
function noteFrom(body: Record<string, unknown>): string {
  const parts: string[] = [];
  const message = field(body, 'message').trim();
  const platform = field(body, 'platform').trim();
  const jobTitle = field(body, 'job_title').trim();
  const companyUrl = field(body, 'company_url').trim();

  if (message) parts.push(`Message: ${message}`);
  if (platform) parts.push(`Platform: ${platform}`);
  if (jobTitle) parts.push(`Job title: ${jobTitle}`);
  if (companyUrl) parts.push(`Company URL: ${companyUrl}`);

  return parts.join('\n');
}

export async function POST(req: Request): Promise<Response> {
  // Gövde okunmadan önce kaba boyut kapısı: gerçek bir form gönderimi 64KB'a
  // yaklaşamaz bile; bundan büyüğü ayrıştırmaya değmez (upload ucundaki
  // content-length dersinin aynısı). Hangi forma ait olduğu henüz
  // bilinmediği için süslü bir yönlendirme de kurulamaz — düz 413 yeter.
  const contentLengthHeader = req.headers.get('content-length');
  const contentLength = contentLengthHeader === null ? NaN : Number(contentLengthHeader);
  if (Number.isFinite(contentLength) && contentLength > 64 * 1024) {
    return new Response(null, { status: 413 });
  }

  const { body } = await readBody(req);

  const form: FormKey = field(body, 'form') === 'demo' ? 'demo' : 'contact';

  // Gizli alan: gerçek ziyaretçi göremez, bot doldurur. Doluysa BAŞARI gibi
  // davranılır — bota "yakalandın" demek denemesini değiştirmesine yarar.
  if (field(body, 'website').trim()) return back(form, 'sent=1');

  if (!limiter.check(clientIp(req), Date.now())) return back(form, 'error=rate_limited');

  const name = field(body, 'name').trim();
  const email = field(body, 'email').trim();
  const company = field(body, 'company').trim();
  if (!name || !email || !company) return back(form, 'error=missing_fields');

  // KVKK onayı yalnız contact formunda var ve zorunlu; demo formunda kutu yok.
  if (form === 'contact' && !field(body, 'consent').trim()) {
    return back(form, 'error=consent_required');
  }

  const segment = field(body, 'segment').trim();
  const source =
    form === 'demo'
      ? 'inbound-demo'
      : SEGMENTS.includes(segment)
        ? `inbound-${segment}`
        : 'inbound-contact';

  const note = noteFrom(body);

  try {
    await createInboundLead({
      company,
      contact: `${name} <${email}>`,
      source,
      seats: seatsFrom(body),
      note: note || undefined,
    });
  } catch {
    return back(form, 'error=server_error');
  }

  return back(form, 'sent=1');
}
