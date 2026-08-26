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
  handSig: number;
  gap: number;
  /** Kartın iç dolgusu. */
  pad: number;
  /** Sol marka şeridinin kalınlığı. */
  stripe: number;
  /**
   * Kartın toplam genişliği — SABİT, yüzde DEĞİL.
   * Sebep: kartın içi `width="100%"` iç içe tablolarla kurulu ve Word
   * (Outlook Classic) `max-width`'i tanımıyor; dış tabloya piksel genişlik
   * verilmezse yüzdeler okuma bölmesinin tamamına yayılıyor. Hepsi 600px
   * sınırının altında (CLAUDE.md §E-posta HTML Kısıtları).
   */
  width: number;
}

const SIZES: Record<Size, SizeScale> = {
  small: { name: 15, title: 11, body: 12, small: 10, avatar: 48, logo: 90, handSig: 120, gap: 10, pad: 14, stripe: 3, width: 460 },
  medium: { name: 18, title: 13, body: 13, small: 11, avatar: 60, logo: 110, handSig: 150, gap: 12, pad: 18, stripe: 4, width: 520 },
  large: { name: 21, title: 14, body: 14, small: 12, avatar: 72, logo: 130, handSig: 170, gap: 14, pad: 22, stripe: 6, width: 580 },
};

/**
 * Hex rengi beyaza doğru karıştırır (0 = aynı renk, 1 = beyaz).
 * SignatureData'da "kenarlık rengi" diye bir alan YOK ve mutedColor tam
 * gücüyle 1px hairline için fazla koyu; kullanıcının paletinden türetmek
 * sabit gri gömmekten iyi (koyu marka paletinde sabit gri yamalı durur).
 */
function lightenToWhite(hex: string, amount: number): string {
  const n = normalizeHex(hex).slice(1);
  const mix = (start: number) => {
    const c = parseInt(n.slice(start, start + 2), 16);
    return Math.round(c + (255 - c) * amount)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${mix(0)}${mix(2)}${mix(4)}`;
}

/**
 * card-bordered — imzanın tamamı ince kenarlıklı bir KART içinde.
 *
 * Yapısal farklar (classic-horizontal'ın kopyası değil):
 *  - Dış kurgu iki hücre: solda marka renginde dikey aksan şeridi, sağda
 *    kenarlıklı + dolgulu kart gövdesi. Şerit kartın sol kenarlığının
 *    yerine geçer (bu yüzden gövdenin sol kenarlığı yoktur).
 *  - Kart içi ÜÇ kolonlu başlık bandı: avatar | ad-ünvan-şirket | logo (sağa
 *    yaslı). classic'te logo avatarın altında, sol kolonda duruyor.
 *  - İletişim başlığın ALTINDA tam genişlik ve İKİ KOLONLU ızgara
 *    (telefon/cep/e-posta/web ikişerli). classic'te hepsi tek kolonda
 *    alt alta.
 *  - Ayraç, ayrı bir 1px tablo değil, iletişim bloğunun `border-top`'u.
 *  - Feragatname kartın DIŞINDA, altında: hukuk metni kimlik kartının
 *    parçası değil, eki.
 */
export function cardBordered(data: SignatureData, opts?: RenderOptions): string {
  const s = SIZES[data.layout.size] ?? SIZES.medium;
  const font = data.visuals.fontFamily;
  const text = normalizeHex(data.visuals.textColor);
  const muted = normalizeHex(data.visuals.mutedColor);
  const brand = normalizeHex(data.visuals.brandColor);
  const iconHex = normalizeHex(data.visuals.iconColor);
  const borderColor = lightenToWhite(muted, 0.78);

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
  const labelStyle = styleToString({
    'font-family': font,
    'font-size': `${s.small}px`,
    color: muted,
  });

  const halfGap = Math.round(s.gap / 2);

  /* ---- 1) Başlık bandı: avatar | kimlik | logo -------------------------- */
  const headerCells: string[] = [];
  if (data.visuals.avatarUrl) {
    headerCells.push(
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
        { valign: 'top', width: s.avatar, style: { 'padding-right': `${s.gap}px` } },
      ),
    );
  }

  const identityRows: string[] = [];
  identityRows.push(
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
  const titleParts = [data.identity.jobTitle, data.identity.department].filter(
    (v): v is string => Boolean(v),
  );
  if (titleParts.length) {
    identityRows.push(
      row(
        cell(
          `<span style="${styleToString({
            'font-family': font,
            'font-size': `${s.title}px`,
            color: muted,
            'line-height': '1.4',
          })}">${titleParts.map((v) => htmlEscape(v)).join(' · ')}</span>`,
          { style: { 'padding-bottom': '2px' } },
        ),
      ),
    );
  }
  if (data.identity.company) {
    identityRows.push(
      row(
        cell(
          `<span style="${styleToString({
            'font-family': font,
            'font-size': `${s.title}px`,
            'font-weight': 'bold',
            color: text,
            'line-height': '1.4',
          })}">${htmlEscape(data.identity.company)}</span>`,
        ),
      ),
    );
  }
  headerCells.push(cell(table(identityRows.join(''), { width: '100%' }), { valign: 'top' }));

  // Logo sağ üstte — kurumsal kartvizit mantığı: kişi solda, marka sağda.
  // height verilmez (oran bilinmiyor), yalnız width ile ölçeklenir.
  if (data.visuals.logoUrl) {
    headerCells.push(
      cell(
        `<img src="${sanitizeUrl(data.visuals.logoUrl)}" width="${s.logo}" alt="${htmlEscape(
          data.identity.company ?? 'Logo',
        )}" border="0" style="${styleToString({
          display: 'block',
          border: '0',
          width: `${s.logo}px`,
        })}" />`,
        { valign: 'top', align: 'right', width: s.logo, style: { 'padding-left': `${s.gap}px` } },
      ),
    );
  }
  const headerTable = table(row(headerCells.join('')), { width: '100%' });

  /* ---- 2) İletişim: iki kolonlu ızgara ---------------------------------- */
  const contact = data.contact;
  const telLink = (raw: string) =>
    `<a href="${sanitizeUrl(`tel:${raw.replace(/[^\d+]/g, '')}`)}" style="${bodyStyle}">${htmlEscape(raw)}</a>`;

  // Kısa alanlar ızgaraya girer; adres ve özel alanlar uzun olabildiği için
  // tam genişlik satır olur (iki kolona sıkışınca kelime kelime kırılıyor).
  const gridItems: string[] = [];
  if (contact.phone) gridItems.push(telLink(contact.phone));
  if (contact.mobile) gridItems.push(telLink(contact.mobile));
  if (contact.email) {
    gridItems.push(
      `<a href="${sanitizeUrl(`mailto:${contact.email}`)}" style="${linkStyle}">${htmlEscape(contact.email)}</a>`,
    );
  }
  if (contact.website) {
    const href = sanitizeUrl(ensureHttp(contact.website));
    const label = contact.website.replace(/^https?:\/\//i, '');
    gridItems.push(`<a href="${href}" style="${linkStyle}">${htmlEscape(label)}</a>`);
  }

  const contactRows: string[] = [];
  for (let i = 0; i < gridItems.length; i += 2) {
    const left = gridItems[i]!;
    const right = gridItems[i + 1];
    // Tek kalan öğe boş hücre bırakmaz, iki kolonu birden kaplar.
    contactRows.push(
      row(
        cell(left, {
          valign: 'top',
          width: right ? '50%' : undefined,
          colspan: right ? undefined : 2,
          style: { 'padding-bottom': '3px', 'padding-right': right ? `${s.gap}px` : undefined },
        }) +
          (right
            ? cell(right, { valign: 'top', width: '50%', style: { 'padding-bottom': '3px' } })
            : ''),
      ),
    );
  }
  if (contact.address) {
    contactRows.push(
      row(
        cell(
          `<span style="${styleToString({
            'font-family': font,
            'font-size': `${s.body}px`,
            color: muted,
            'line-height': '1.4',
          })}">${htmlEscape(contact.address).replace(/\n/g, '<br>')}</span>`,
          { colspan: 2, style: { 'padding-bottom': '3px' } },
        ),
      ),
    );
  }
  for (const field of data.extras?.customFields ?? []) {
    const value = field.url
      ? `<a href="${sanitizeUrl(ensureHttp(field.url))}" style="${linkStyle}">${htmlEscape(field.value)}</a>`
      : `<span style="${bodyStyle}">${htmlEscape(field.value)}</span>`;
    contactRows.push(
      row(
        cell(`<span style="${labelStyle}">${htmlEscape(field.label)}: </span>${value}`, {
          colspan: 2,
          style: { 'padding-bottom': '3px' },
        }),
      ),
    );
  }

  /* ---- 3) Sosyal -------------------------------------------------------- */
  // iconBaseUrl verilirse CDN PNG ikonları, verilmezse metin-link
  // (classic-horizontal ile birebir aynı sözleşme).
  let socialHtml = '';
  if (data.social.length) {
    if (opts?.iconBaseUrl) {
      const base = opts.iconBaseUrl.replace(/\/$/, '');
      const iconCells = data.social
        .map((soc, i) =>
          cell(
            `<a href="${sanitizeUrl(soc.url)}" style="text-decoration:none"><img src="${base}/icons/${socialIconPath(data.layout.iconStyle, iconHex, soc.platform)}" width="24" height="24" alt="${PLATFORM_LABELS[soc.platform]}" border="0" style="${styleToString(
              { border: 'none', display: 'inline-block' },
            )}" /></a>`,
            {
              style: i < data.social.length - 1 ? { 'padding-right': '8px' } : undefined,
            },
          ),
        )
        .join('');
      socialHtml = table(row(iconCells));
    } else {
      const sep = `<span style="color:${muted}">&nbsp;·&nbsp;</span>`;
      socialHtml = data.social
        .map(
          (soc) =>
            `<a href="${sanitizeUrl(soc.url)}" style="${linkStyle}">${PLATFORM_LABELS[soc.platform]}</a>`,
        )
        .join(sep);
    }
  }

  /* ---- 4) Kart gövdesi -------------------------------------------------- */
  const bodyRows: string[] = [row(cell(headerTable))];

  if (contactRows.length) {
    // Ayraç burada ayrı bir tablo değil, bloğun üst kenarlığı. Yalnızca
    // gerçekten iletişim satırı varsa çizilir — tek başına ayraç kalmaz.
    bodyRows.push(
      row(
        cell(table(contactRows.join(''), { width: '100%' }), {
          style: {
            'padding-top': `${s.gap}px`,
            'border-top': data.layout.showDividers ? `1px solid ${borderColor}` : undefined,
          },
        }),
      ),
    );
  }

  if (socialHtml) {
    bodyRows.push(row(cell(socialHtml, { style: { 'padding-top': `${halfGap}px` } })));
  }

  // El imzası kartın İÇİNDE: kimliğin parçası. (Feragatname ise kartın dışına
  // çıkar — bkz. montaj.)
  if (data.visuals.handSignatureUrl) {
    bodyRows.push(
      row(
        cell(
          `<img src="${sanitizeUrl(data.visuals.handSignatureUrl)}" width="${s.handSig}" alt="${htmlEscape(
            data.identity.fullName,
          )}" border="0" style="${styleToString({
            display: 'block',
            border: '0',
            width: `${s.handSig}px`,
          })}" />`,
          { style: { 'padding-top': `${halfGap}px` } },
        ),
      ),
    );
  }

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
    bodyRows.push(row(cell(btn, { style: { 'padding-top': `${s.gap}px` } })));
  }

  /* ---- 5) Montaj: şerit + kart, altında feragatname --------------------- */
  // Şerit hücresi kendi başına yüksekliği belirlemez; satırın yüksekliği
  // gövdeden gelir, şerit onu doldurur. İçeriği &nbsp; çünkü Outlook boş
  // hücreye arka plan boyamıyor.
  const stripeCell = cell('&nbsp;', {
    width: s.stripe,
    style: {
      width: `${s.stripe}px`,
      'background-color': brand,
      'font-size': '1px',
      'line-height': '1px',
    },
  });
  // Kartın arka planı açıkça beyaz: koyu mod uygulayan istemcilerde şeffaf
  // gövde metni okunamaz hale getiriyor.
  const cardBodyCell = cell(table(bodyRows.join(''), { width: '100%' }), {
    valign: 'top',
    style: {
      'background-color': '#ffffff',
      'border-top': `1px solid ${borderColor}`,
      'border-right': `1px solid ${borderColor}`,
      'border-bottom': `1px solid ${borderColor}`,
      padding: `${s.pad}px`,
    },
  });
  const card = table(row(stripeCell + cardBodyCell), { width: '100%' });

  const outerRows: string[] = [row(cell(card))];
  if (data.extras?.disclaimer) {
    outerRows.push(
      row(
        cell(
          `<span style="${styleToString({
            'font-family': font,
            'font-size': `${s.small}px`,
            color: muted,
            'line-height': '1.3',
          })}">${htmlEscape(data.extras.disclaimer).replace(/\n/g, '<br>')}</span>`,
          { style: { 'padding-top': `${halfGap}px` } },
        ),
      ),
    );
  }

  return table(outerRows.join(''), {
    width: s.width,
    style: { 'max-width': `${s.width}px` },
  });
}
