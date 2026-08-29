import { appUrl } from '../app-url';
import { prisma } from '../db';
import { getMailer, inboundLeadEmail } from '../mail';

/**
 * Pazarlama sitesinin formlarından gelen talep. `admin.ts`'teki
 * `createLead`in halka açık kardeşi — üç farkı var ve üçü de kasıtlı:
 *
 * ① Staff kimliği yok, `requireStaff` çağrılmaz (gönderen ziyaretçi).
 * ② Denetim defterine (`AdminAction`) satır YAZILMAZ. Defter personelin ne
 *    yaptığını tutar; burada personel bir şey yapmıyor. Üstelik payload'a
 *    kişi bilgisi koymama sözleşmesi (admin.ts §createLead) burada da
 *    geçerli ve en temiz uygulaması hiç yazmamak.
 * ③ `stage`/`nextStep` verilmez — şemanın kendi varsayılanları geçerli olur;
 *    gelen talebin aşamasını personel belirler.
 *
 * Kırpma sessiz: alan doğrulaması ucun işi (`app/api/leads/route.ts`),
 * buradaki amaç kolon sınırını aşan girdinin veritabanı hatasına dönüşmemesi.
 */
export interface InboundLeadInput {
  company: string;
  contact: string;
  source: string;
  seats?: number;
  note?: string;
}

export async function createInboundLead(input: InboundLeadInput): Promise<{ id: string }> {
  const company = input.company.trim().slice(0, 160);
  if (!company) throw new Error('Şirket adı zorunlu.');
  const contact = input.contact.trim().slice(0, 255);
  if (!contact) throw new Error('İletişim bilgisi zorunlu.');
  const source = input.source.trim().slice(0, 48);
  if (!source) throw new Error('Kaynak zorunlu.');

  // Aralık seçeneklerinden gelen değer tam sayı olmayabilir; 1'in altına
  // düşmesine de izin verilmez (şemadaki `@default(1)` ile aynı taban).
  // Üst sınır INT taşmasına karşı tavan; ziyaretçi girdisi lead değerini
  // korur (kırpılır), reddedilmez.
  const seats =
    typeof input.seats === 'number' && Number.isInteger(input.seats) && input.seats >= 1
      ? Math.min(input.seats, 1_000_000)
      : 1;

  // `note` TEXT (64KB) kolonuna gidiyor; kolon sınırı sözleşmesinin devamı
  // (company/contact/source'taki `slice` ile aynı gerekçe) — burada da
  // sessizce kırpılır, veritabanı hatasına dönüşmez.
  const note = (input.note?.trim() || null)?.slice(0, 10_000) ?? null;

  const lead = await prisma.lead.create({
    data: { company, contact, source, seats, note },
    select: { id: true },
  });

  // Bildirim EN-İYİ-ÇABA: talep deftere yazıldı, SMTP çökmesi ziyaretçiye
  // hata göstermeyi haklı çıkarmaz (`lib/mail/index.ts`teki teslim defteri
  // kararının aynı mantığı — posta işin kendisi değil, haber verme).
  const notifyTo = process.env.LEADS_NOTIFY_TO;
  if (notifyTo) {
    try {
      await getMailer().send({
        to: notifyTo,
        kind: 'notification',
        ...inboundLeadEmail({
          actionUrl: `${appUrl()}/admin/growth/leads`,
          company,
          contact,
          source,
          seats,
          note,
        }),
      });
    } catch {
      // yutulur — bkz. yukarıdaki gerekçe
    }
  }

  return lead;
}
