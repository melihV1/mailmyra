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
  gap: number;
  /**
   * Kök tablonun toplam genişliği — SABİT piksel, yüzde DEĞİL.
   * Sebep (cta-banner.ts'teki `SizeScale.width` gerekçesiyle birebir, bkz.
   * de card-bordered.ts:23-29): bu şablonun sağ hücresi `width="100%"` iç içe
   * tablolarla kurulu (yatay ayraç çizgisi VE sosyal ikon tablosu) ve Word
   * (Outlook Classic) CSS `max-width`'i tanımıyor — dış tabloya piksel
   * genişlik verilmezse yüzdeler okuma bölmesinin tamamına yayılıyor.
   * Değerler cta-banner ile birebir aynı (480/540/600), hepsi 600px
   * sınırının altında/eşit (CLAUDE.md §E-posta HTML Kısıtları).
   */
  width: number;
}

// SIZES classic-horizontal'dan BİREBİR kopyalanır (brief §Yapı, spec §1.1) —
// iki şablon aynı görsel ölçekte hizalı kalsın, boyut seçimi şablonlar
// arasında geçişte sürpriz yapmasın. `width` cta-banner emsali (bkz.
// SizeScale.width yorumu) — 480/540/600.
const SIZES: Record<Size, SizeScale> = {
  small: { name: 15, title: 12, body: 12, small: 11, avatar: 64, gap: 12, width: 480 },
  medium: { name: 18, title: 13, body: 13, small: 11, avatar: 90, gap: 16, width: 540 },
  large: { name: 22, title: 15, body: 14, small: 12, avatar: 110, gap: 20, width: 600 },
};

/**
 * divider-columns — kurumsal ikiye bölünmüş yerleşim.
 *
 * Yapısal farklar (classic-horizontal'ın kopyası değil, spec §1.1 bağlayıcı):
 *  - SOL hücre: logo ÜSTTE, avatar ALTTA — classic-horizontal'ın TAM TERSİ
 *    sırası, ama aynı kural: iki bağımsız slot (avatar??logo tek-yuva YOK).
 *  - SAĞ hücre `border-left: 2px solid <brandColor>` + padding-left taşır.
 *    Bu dikey ayraç ŞABLON KİMLİĞİDİR — `layout.showDividers`'tan bağımsız
 *    olarak HER ZAMAN çizilir, kapatılamaz (görsel sütun boş olsa bile).
 *  - `showDividers` bu şablonda FARKLI bir şeyi kontrol eder: yalnızca
 *    iletişim bloğu ile sosyal/CTA arasındaki İNCE YATAY çizgiyi açıp
 *    kapatır (classic'in 1px arka-plan tekniğiyle aynı, ama muted renginde —
 *    dikey ayracın brand renginden bilerek ayrılır, ikisi karışmasın).
 *  - El imzası + feragatname alt iki hücreli deseni classic'ten birebir
 *    (sağ kolonun içinde, en altta).
 *  - Kök tablo `SIZES.width` ile SABİT PİKSEL genişlik taşır (yalnız
 *    `max-width` stili DEĞİL — cta-banner.ts'teki `SizeScale.width`
 *    yorumundaki gerekçeyle birebir: Word/Outlook Classic CSS `max-width`'i
 *    tanımıyor, bu şablonun sağ hücresi `width="100%"` iç içe tablolarla
 *    kurulu (yatay ayraç çizgisi + sosyal ikon tablosu), piksel çapa yoksa
 *    yüzdeler okuma bölmesinin tamamına yayılır).
 */
export function dividerColumns(data: SignatureData, opts?: RenderOptions): string {
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
    'line-height': '1.4',
    'text-decoration': 'none',
  });

  const lines: string[] = [];

  // Ad
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

  // Ünvan + departman
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
            color: muted,
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

  // İletişim satırları
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

  // İnce yatay çizgi — YALNIZ showDividers true iken (brief §1.1: sıra
  // burada classic'ten farklı, iletişim ile sosyal/CTA ARASINDA). Muted
  // renginde: sağ hücrenin daima çizilen brand renkli dikey ayracıyla
  // karışmasın diye bilerek farklı bir sinyal taşır.
  if (data.layout.showDividers) {
    const line = table(
      row(
        cell('&nbsp;', {
          style: {
            height: '1px',
            'line-height': '1px',
            'font-size': '1px',
            'background-color': muted,
          },
        }),
      ),
      { width: '100%' },
    );
    lines.push(
      row(
        cell(line, {
          style: {
            'padding-top': `${Math.round(s.gap / 2)}px`,
            'padding-bottom': `${Math.round(s.gap / 2)}px`,
          },
        }),
      ),
    );
  }

  // Sosyal: iconBaseUrl verilirse CDN PNG ikonları, verilmezse metin-link
  // (classic-horizontal ile birebir aynı sözleşme).
  if (data.social.length) {
    const socialCellStyle = {
      'padding-top': data.layout.showDividers ? '0px' : `${Math.round(s.gap / 2)}px`,
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
  // (spec §2). Sağ kolonun içinde kalır, sol kolonu etkilemez.
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

  // Sol görsel sütunu: LOGO ÜSTTE, AVATAR ALTTA — classic'in tam tersi sırası
  // (brief §1.1). İKİ BAĞIMSIZ SLOT, tek-yuva `??` fallback'i YOK.
  const visualRows: string[] = [];
  if (data.visuals.logoUrl) {
    visualRows.push(
      row(
        cell(
          `<img src="${sanitizeUrl(data.visuals.logoUrl)}" width="${s.avatar}" alt="${htmlEscape(
            data.identity.company ?? 'Logo',
          )}" border="0" style="${styleToString({
            display: 'block',
            border: '0',
            width: `${s.avatar}px`,
          })}" />`,
        ),
      ),
    );
  }
  if (data.visuals.avatarUrl) {
    visualRows.push(
      row(
        cell(
          `<img src="${sanitizeUrl(data.visuals.avatarUrl)}" width="${s.avatar}" height="${s.avatar}" alt="${htmlEscape(
            data.identity.fullName,
          )}" border="0" style="${styleToString({
            display: 'block',
            border: '0',
            'border-radius': '4px',
            width: `${s.avatar}px`,
            height: `${s.avatar}px`,
          })}" />`,
          { style: data.visuals.logoUrl ? { 'padding-top': '8px' } : undefined },
        ),
      ),
    );
  }
  const leftCell = visualRows.length
    ? cell(table(visualRows.join('')), {
        valign: 'top',
        width: s.avatar,
        style: { 'padding-right': `${s.gap}px` },
      })
    : '';

  // Sağ hücre: DAİMA `border-left` + `padding-left` — şablon kimliği, kapatılamaz.
  const rightCell = cell(rightInner, {
    valign: 'top',
    style: {
      'border-left': `2px solid ${brand}`,
      'padding-left': `${s.gap}px`,
    },
  });

  // Literal piksel width ZORUNLU (yukarıdaki SizeScale.width yorumu) —
  // max-width TEK BAŞINA yeterli değil, Word/Outlook Classic onu tanımıyor.
  return table(row(leftCell + rightCell), {
    width: s.width,
    style: { 'max-width': `${s.width}px` },
  });
}
