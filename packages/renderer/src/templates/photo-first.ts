import type { SignatureData, RenderOptions } from '../types';
import { table, row, cell } from '../utils/table';
import { styleToString } from '../utils/inline-style';
import { ensureHttp, htmlEscape, sanitizeUrl } from '../utils/escape';
import { normalizeHex, readableTextOn } from '../utils/color';
import { PLATFORM_LABELS, socialIconPath } from '../utils/social';

type Size = SignatureData['layout']['size'];

interface SizeScale {
  name: number;
  title: number;
  body: number;
  small: number;
  avatar: number;
  logo: number;
  gap: number;
  /**
   * Kök tablonun toplam genişliği — SABİT piksel, yüzde DEĞİL.
   * Sebep (cta-banner.ts'teki `SizeScale.width` gerekçesiyle birebir, bkz.
   * de card-bordered.ts:23-29): bu şablonun içi `width="100%"` iç içe
   * tablolarla kurulu (logo satırı VE ikonlu sosyal tablosu) ve Word
   * (Outlook Classic) CSS `max-width`'i tanımıyor — dış tabloya piksel
   * genişlik verilmezse yüzdeler okuma bölmesinin tamamına yayılıyor.
   * Değerler cta-banner ile birebir aynı (480/540/600), hepsi 600px
   * sınırının altında/eşit (CLAUDE.md §E-posta HTML Kısıtları).
   */
  width: number;
}

// title/body/small/gap classic-horizontal'ın ölçeğinden BİREBİR alınır
// (brief §1.2: "diğer SIZES değerleri classic'in ölçeğinden türeyebilir").
// name ve avatar bilerek FARKLI: bu şablonun kimliği "avatar baskın solda +
// ad bir kademe büyük" — photo-first'ün small/medium/large adı, classic'in
// bir üst kademesinin adıyla eşleşir (15→18, 18→22, 22→26). avatar
// 88/104/120 brief'te bağlayıcı olarak sabitlenmiş. logo ise avatardan
// AYRI ve KÜÇÜK — "small bottom row" (brief), avatar'ın ~%70'i. `width`
// cta-banner emsali (bkz. SizeScale.width yorumu) — 480/540/600.
const SIZES: Record<Size, SizeScale> = {
  small: { name: 18, title: 12, body: 12, small: 11, avatar: 88, logo: 64, gap: 12, width: 480 },
  medium: { name: 22, title: 13, body: 13, small: 11, avatar: 104, logo: 76, gap: 16, width: 540 },
  large: { name: 26, title: 15, body: 14, small: 12, avatar: 120, logo: 88, gap: 20, width: 600 },
};

/**
 * photo-first — portre öncelikli, yaratıcı vurgu.
 *
 * Yapısal farklar (classic-horizontal / divider-columns'ın kopyası değil,
 * spec §1.2 bağlayıcı):
 *  - SOL hücre YALNIZ avatar taşır (logo ile TEK yuva paylaşmaz — classic ve
 *    divider-columns'ta ikisi aynı dar sütunda üst üste dururken, burada
 *    avatar sütunu baskın ve tek başına). Avatar `border-radius:50%` inline
 *    taşır: Outlook'un masaüstü Word render motoru bunu YOK SAYAR ve görsel
 *    KARE görünür. Bu KABUL EDİLEN bir bozulmadır (brief §1.2) — dairesel
 *    kırpma yalnız border-radius'u destekleyen istemcilerde (Gmail, Apple
 *    Mail, iOS Mail, Yeni Outlook/Outlook.com) çalışır; Outlook Classic'te
 *    kare avatar dökülür. Alternatif (görseli sunucuda dairesel kırpmak)
 *    kapsam dışı — CDN'e ikinci bir varyant üretimi gerektirir.
 *  - SAĞ hücre: ad diğer üç şablondan bir kademe BÜYÜK (yaratıcı vurgu,
 *    bkz. SIZES yorumu), ünvan `muted` yerine `brandColor` — kimlik bloğu
 *    markayı doğrudan taşısın.
 *  - `showDividers` bu şablonda ad bloğunun HEMEN ALTINA 40px'lik kısa bir
 *    aksan çubuğu ekler (stacked-minimal emsali: `height:2px` + brandColor
 *    zemin, `width:40`) — classic'in tam genişlik 1px çizgisinden ve
 *    divider-columns'un dikey `border-left` kuralından FARKLI bir sinyal.
 *  - Logo ATILMAZ ama avatarla aynı sütunu PAYLAŞMAZ: imzanın EN ALTINDA,
 *    tam genişlikte küçük bir satırda (avatar sütunundan sonra, sağ metin
 *    bloğunun da altında) görünür — HTML çıktı sırasında avatardan SONRA
 *    gelir. `height` BİLEREK verilmez (SignatureData görsel oranı
 *    saklamıyor, yalnız width ile ölçekleriz — canon kural).
 *  - El imzası + feragatname deseni classic'ten birebir (sağ kolonun içinde,
 *    en altta).
 *  - Kök tablo `SIZES.width` ile SABİT PİKSEL genişlik taşır (yalnız
 *    `max-width` stili DEĞİL — cta-banner.ts'teki `SizeScale.width`
 *    yorumundaki gerekçeyle birebir: Word/Outlook Classic CSS `max-width`'i
 *    tanımıyor, bu şablonun içi `width="100%"` iç içe tablolarla kurulu
 *    (logo satırı + sosyal ikon tablosu), piksel çapa yoksa yüzdeler okuma
 *    bölmesinin tamamına yayılır).
 */
export function photoFirst(data: SignatureData, opts?: RenderOptions): string {
  const s = SIZES[data.layout.size] ?? SIZES.medium;
  const font = data.visuals.fontFamily;
  const text = normalizeHex(data.visuals.textColor);
  const muted = normalizeHex(data.visuals.mutedColor);
  const brand = normalizeHex(data.visuals.brandColor);
  const iconHex = normalizeHex(data.visuals.iconColor);

  const linkStyle = styleToString({
    'font-family': font,
    'font-size': `${s.body}px`,
    color: brand,
    'text-decoration': 'none',
  });
  const bodyStyle = styleToString({
    'font-family': font,
    'font-size': `${s.body}px`,
    color: text,
    // İnce iletişim satırları (brief §1.2): classic'in 1.4'üne göre biraz
    // daha sıkı satır aralığı — kompakt, "thin" his.
    'line-height': '1.3',
    'text-decoration': 'none',
  });

  const lines: string[] = [];

  // Ad — diğer şablonlardan bir kademe büyük (SIZES.name, yukarıdaki yorum).
  lines.push(
    row(
      cell(
        `<span style="${styleToString({
          'font-family': font,
          'font-size': `${s.name}px`,
          'font-weight': 'bold',
          color: text,
          'line-height': '1.2',
        })}">${htmlEscape(data.identity.fullName)}</span>`,
        { style: { 'padding-bottom': '2px' } },
      ),
    ),
  );

  // Aksan çubuğu — YALNIZ showDividers true iken, ad bloğunun hemen altında
  // (stacked-minimal emsali: kısa 40px marka renginde çubuk).
  if (data.layout.showDividers) {
    const bar = table(
      row(
        cell('&nbsp;', {
          style: {
            height: '2px',
            'line-height': '2px',
            'font-size': '2px',
            'background-color': brand,
          },
        }),
      ),
      { width: 40 },
    );
    lines.push(
      row(cell(bar, { style: { 'padding-bottom': `${Math.round(s.gap / 2)}px` } })),
    );
  }

  // Ünvan + departman — brandColor (brief §1.2: classic'in muted'inden
  // FARKLI, kimlik bloğu markayı doğrudan taşısın).
  const titleParts = [data.identity.jobTitle, data.identity.department].filter(
    (v): v is string => Boolean(v),
  );
  if (titleParts.length) {
    lines.push(
      row(
        cell(
          `<span style="${styleToString({
            'font-family': font,
            'font-size': `${s.title}px`,
            color: brand,
          })}">${titleParts.map((v) => htmlEscape(v)).join(' · ')}</span>`,
          { style: { 'padding-bottom': '2px' } },
        ),
      ),
    );
  }

  // Şirket
  if (data.identity.company) {
    lines.push(
      row(
        cell(
          `<span style="${styleToString({
            'font-family': font,
            'font-size': `${s.title}px`,
            'font-weight': 'bold',
            color: text,
          })}">${htmlEscape(data.identity.company)}</span>`,
          { style: { 'padding-bottom': `${Math.round(s.gap / 2)}px` } },
        ),
      ),
    );
  }

  // İnce iletişim satırları
  const contact = data.contact;
  const pushLine = (inner: string) =>
    lines.push(row(cell(inner, { style: { 'padding-bottom': '2px' } })));

  if (contact.phone) {
    const tel = sanitizeUrl(`tel:${contact.phone.replace(/[^\d+]/g, '')}`);
    pushLine(`<a href="${tel}" style="${bodyStyle}">${htmlEscape(contact.phone)}</a>`);
  }
  if (contact.mobile) {
    const tel = sanitizeUrl(`tel:${contact.mobile.replace(/[^\d+]/g, '')}`);
    pushLine(`<a href="${tel}" style="${bodyStyle}">${htmlEscape(contact.mobile)}</a>`);
  }
  if (contact.email) {
    const mail = sanitizeUrl(`mailto:${contact.email}`);
    pushLine(`<a href="${mail}" style="${linkStyle}">${htmlEscape(contact.email)}</a>`);
  }
  if (contact.website) {
    const href = sanitizeUrl(ensureHttp(contact.website));
    const label = contact.website.replace(/^https?:\/\//i, '');
    pushLine(`<a href="${href}" style="${linkStyle}">${htmlEscape(label)}</a>`);
  }
  if (contact.address) {
    pushLine(
      `<span style="${bodyStyle}">${htmlEscape(contact.address).replace(/\n/g, '<br>')}</span>`,
    );
  }

  // Özel alanlar
  for (const field of data.extras?.customFields ?? []) {
    const value = field.url
      ? `<a href="${sanitizeUrl(ensureHttp(field.url))}" style="${linkStyle}">${htmlEscape(field.value)}</a>`
      : `<span style="${bodyStyle}">${htmlEscape(field.value)}</span>`;
    pushLine(
      `<span style="${styleToString({
        'font-family': font,
        'font-size': `${s.body}px`,
        color: muted,
      })}">${htmlEscape(field.label)}: </span>${value}`,
    );
  }

  // Sosyal: iconBaseUrl verilirse CDN PNG ikonları, verilmezse metin-link
  // (canon sözleşme — üç şablonla birebir aynı, çağıran taraf şablona göre
  // davranış değiştirmez).
  if (data.social.length) {
    const socialCellStyle = {
      'padding-top': `${Math.round(s.gap / 2)}px`,
      'padding-bottom': '2px',
    };
    if (opts?.iconBaseUrl) {
      const base = opts.iconBaseUrl.replace(/\/$/, '');
      const iconCells = data.social
        .map((soc, i) =>
          cell(
            `<a href="${sanitizeUrl(soc.url)}" style="text-decoration:none"><img src="${base}/icons/${socialIconPath(data.layout.iconStyle, iconHex, soc.platform)}" width="24" height="24" alt="${PLATFORM_LABELS[soc.platform]}" border="0" style="${styleToString(
              {
                border: 'none',
                display: 'inline-block',
              },
            )}" /></a>`,
            {
              style:
                i < data.social.length - 1 ? { 'padding-right': '8px' } : undefined,
            },
          ),
        )
        .join('');
      lines.push(row(cell(table(row(iconCells)), { style: socialCellStyle })));
    } else {
      const sep = `<span style="color:${muted}">&nbsp;·&nbsp;</span>`;
      const socialHtml = data.social
        .map(
          (soc) =>
            `<a href="${sanitizeUrl(soc.url)}" style="${linkStyle}">${PLATFORM_LABELS[soc.platform]}</a>`,
        )
        .join(sep);
      lines.push(row(cell(socialHtml, { style: socialCellStyle })));
    }
  }

  // CTA butonu (bulletproof) — sözleşme: yalnız label VEYA yalnız url varsa
  // hiçbir şey basılmaz, ikisi birlikte gerekir.
  if (data.extras?.ctaLabel && data.extras?.ctaUrl) {
    const ctaText = readableTextOn(brand);
    const btn = table(
      row(
        cell(
          `<a href="${sanitizeUrl(ensureHttp(data.extras.ctaUrl))}" style="${styleToString({
            'font-family': font,
            'font-size': `${s.body}px`,
            'font-weight': 'bold',
            color: ctaText,
            'text-decoration': 'none',
            display: 'inline-block',
          })}">${htmlEscape(data.extras.ctaLabel)}</a>`,
          {
            align: 'center',
            style: {
              'background-color': brand,
              'border-radius': '4px',
              padding: '8px 16px',
            },
          },
        ),
      ),
      { align: 'left' },
    );
    lines.push(
      row(cell(btn, { style: { 'padding-top': `${Math.round(s.gap / 2)}px` } })),
    );
  }

  // Alt satır: disclaimer (sol) + el imzası (sağ) — classic'ten birebir
  // (spec §2), sağ kolonun içinde kalır.
  const disclaimerSpan = data.extras?.disclaimer
    ? `<span style="${styleToString({
        'font-family': font,
        'font-size': `${s.small}px`,
        color: muted,
        'line-height': '1.3',
      })}">${htmlEscape(data.extras.disclaimer).replace(/\n/g, '<br>')}</span>`
    : '';
  const handSigImg = data.visuals.handSignatureUrl
    ? `<img src="${sanitizeUrl(data.visuals.handSignatureUrl)}" width="150" alt="${htmlEscape(
        data.identity.fullName,
      )}" border="0" style="${styleToString({
        display: 'block',
        border: '0',
        width: '150px',
      })}" />`
    : '';
  if (handSigImg) {
    const bottom = table(
      row(
        cell(disclaimerSpan || '&nbsp;', { valign: 'top' }) +
          cell(handSigImg, {
            valign: 'bottom',
            width: 150,
            style: { 'padding-left': '12px' },
          }),
      ),
      { width: '100%' },
    );
    lines.push(
      row(cell(bottom, { style: { 'padding-top': `${Math.round(s.gap / 2)}px` } })),
    );
  } else if (disclaimerSpan) {
    lines.push(
      row(
        cell(disclaimerSpan, { style: { 'padding-top': `${Math.round(s.gap / 2)}px` } }),
      ),
    );
  }

  const rightInner = table(lines.join(''), { width: '100%' });

  // Sol hücre: YALNIZ avatar (baskın, tek görsel yuva — brief §1.2).
  const hasAvatar = Boolean(data.visuals.avatarUrl);
  const leftCell = hasAvatar
    ? cell(
        `<img src="${sanitizeUrl(data.visuals.avatarUrl!)}" width="${s.avatar}" height="${s.avatar}" alt="${htmlEscape(
          data.identity.fullName,
        )}" border="0" style="${styleToString({
          display: 'block',
          border: '0',
          'border-radius': '50%',
          width: `${s.avatar}px`,
          height: `${s.avatar}px`,
        })}" />`,
        {
          valign: 'top',
          width: s.avatar,
          style: { 'padding-right': `${s.gap}px` },
        },
      )
    : '';

  const rightCell = cell(rightInner, { valign: 'top' });
  const mainRow = row(leftCell + rightCell);

  // Logo alt satırda küçük — avatar sütununun DIŞINDA, imzanın en altında,
  // tam genişlikte ayrı bir satır (brief §1.2). HTML çıktı sırasında avatar
  // her zaman logo'dan ÖNCE gelir (mainRow logoRow'dan önce eklenir).
  // `height` BİLEREK verilmez (canon kural — oran bilinmiyor).
  const logoRow = data.visuals.logoUrl
    ? row(
        cell(
          `<img src="${sanitizeUrl(data.visuals.logoUrl)}" width="${s.logo}" alt="${htmlEscape(
            data.identity.company ?? 'Logo',
          )}" border="0" style="${styleToString({
            display: 'block',
            border: '0',
            width: `${s.logo}px`,
          })}" />`,
          {
            ...(hasAvatar ? { colspan: 2 } : {}),
            style: { 'padding-top': `${s.gap}px` },
          },
        ),
      )
    : '';

  // Literal piksel width ZORUNLU (yukarıdaki SizeScale.width yorumu) —
  // max-width TEK BAŞINA yeterli değil, Word/Outlook Classic onu tanımıyor.
  return table(mainRow + logoRow, {
    width: s.width,
    style: { 'max-width': `${s.width}px` },
  });
}
