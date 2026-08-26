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
}

// title/body/small classic-horizontal'ın ölçeğine yakın kalır; name/avatar/gap
// bilerek KÜÇÜLTÜLMÜŞ (brief §1.3: "SIZES tuned for a compact block — base
// them on classic's values") — bu şablon tek satırlık yatay bir "kimlik
// şeridi" kuruyor, classic'in daha büyük dikey kimlik bloğunun aksine.
// `logo` avatar'dan AYRI bir alan (photo-first emsali): sağ sütunda küçük,
// height'siz — oranı bilinmeyen bir görsel avatarla aynı genişliği paylaşmaz.
const SIZES: Record<Size, SizeScale> = {
  small: { name: 14, title: 11, body: 11, small: 10, avatar: 40, logo: 56, gap: 10 },
  medium: { name: 16, title: 12, body: 12, small: 11, avatar: 48, logo: 68, gap: 12 },
  large: { name: 19, title: 14, body: 13, small: 12, avatar: 56, logo: 80, gap: 14 },
};

/**
 * cta-banner — CTA vurgulu, tam genişlik eylem şeridi ile kapanan imza.
 *
 * Yapısal iskelet (spec §1.3, bağlayıcı — üç kardeşinin kopyası değil):
 *  - Kök tablo TEK SÜTUNLU olarak yığılır (her satır kendi `<td>`'sinde tam
 *    genişlikte bir iç-tablo taşır). Bu, "identity satırı" ile "CTA bandı"
 *    arasında değişken sütun sayısı (avatar/logo bağımsız slot — biri veya
 *    ikisi de yok olabilir) yüzünden colspan uyuşmazlığı riskini tamamen
 *    ortadan kaldırır — bant her zaman kendi tam-genişlik satırında durur.
 *  - Satır 1 — kompakt yatay kimlik: avatar KÜÇÜK solda (kare, width+height —
 *    diğer şablonlarla aynı "avatar kare" varsayımı) · orta hücre ad/ünvan/
 *    şirket + (showDividers açıksa) ince yatay çizgi + iletişim satırları +
 *    özel alanlar + sosyal · logo SAĞDA, height'siz/width-ölçekli (canon
 *    kural — oran bilinmiyor).
 *  - Satır 2 (yalnız `ctaLabel && ctaUrl` ikisi de varsa) — TAM GENİŞLİK CTA
 *    bandı: tek `<td>` hem `width="100%"` hem `background-color:<brand>`
 *    taşır (mandatory test iddiası — "bant hücresi kök genişliğinde VE
 *    brandColor zeminli" TEK hücrede birleşir), metin `readableTextOn(brand)`,
 *    `ctaLabel` bold düz metin link (ok işareti YOK — spec §1.3 açıkça
 *    reddediyor), "buton hissi" hücre padding'iyle verilir (border-radius
 *    YOK — tam genişlik bir şerit, köşeli buton değil). CTA verisi eksikse
 *    bu satır HİÇ eklenmez — şablon CTA'sız da eksiksiz durur.
 *  - Satır 3 (el imzası ve/veya disclaimer varsa) — bandın ALTINDA, kendi
 *    tam-genişlik satırında (sağ kolona hapsedilmiş classic deseninin
 *    aksine — spec: "bant imzanın son güçlü vurgusu olarak kalır, yasal
 *    metin onu sulandırmaz", bu yüzden bilerek AYRI ve bandın dışında).
 */
export function ctaBanner(data: SignatureData, opts?: RenderOptions): string {
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

  // ---- Orta hücre: ad/ünvan/şirket + [çizgi] + iletişim + özel alanlar + sosyal ----
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

  // Ayraç — kimlik bloğu (ad/ünvan/şirket) ile iletişim arası, YALNIZ
  // showDividers açıkken (spec §1.3: "kimlik ile iletişim arasında ...
  // yatay çizgi" — classic-horizontal'ın 1px arka-plan tekniğiyle birebir).
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
            'padding-top': '2px',
            'padding-bottom': `${Math.round(s.gap / 2)}px`,
          },
        }),
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

  // Sosyal: iconBaseUrl verilirse CDN PNG ikonları, verilmezse metin-link
  // (canon sözleşme — dört şablonla birebir aynı).
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

  const centerCell = cell(table(lines.join(''), { width: '100%' }), { valign: 'top' });

  // ---- Sol: avatar (küçük, kare — width+height, diğer şablonlarla aynı varsayım) ----
  const avatarCell = data.visuals.avatarUrl
    ? cell(
        `<img src="${sanitizeUrl(data.visuals.avatarUrl)}" width="${s.avatar}" height="${s.avatar}" alt="${htmlEscape(
          data.identity.fullName,
        )}" border="0" style="${styleToString({
          display: 'block',
          border: '0',
          'border-radius': '4px',
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

  // ---- Sağ: logo — height'siz/width-ölçekli (canon kural, oran bilinmiyor) ----
  const logoCell = data.visuals.logoUrl
    ? cell(
        `<img src="${sanitizeUrl(data.visuals.logoUrl)}" width="${s.logo}" alt="${htmlEscape(
          data.identity.company ?? 'Logo',
        )}" border="0" style="${styleToString({
          display: 'block',
          border: '0',
          width: `${s.logo}px`,
        })}" />`,
        {
          valign: 'top',
          width: s.logo,
          style: { 'padding-left': `${s.gap}px` },
        },
      )
    : '';

  const identityRow = table(row(avatarCell + centerCell + logoCell), { width: '100%' });

  // ---- CTA bandı — tam genişlik, brandColor zemin, `label && url` sözleşmesi ----
  let band = '';
  if (data.extras?.ctaLabel && data.extras?.ctaUrl) {
    const ctaText = readableTextOn(brand);
    band = table(
      row(
        cell(
          `<a href="${sanitizeUrl(ensureHttp(data.extras.ctaUrl))}" style="${styleToString({
            'font-family': font,
            'font-size': `${s.body}px`,
            'font-weight': 'bold',
            color: ctaText,
            'text-decoration': 'none',
            display: 'block',
          })}">${htmlEscape(data.extras.ctaLabel)}</a>`,
          {
            align: 'center',
            width: '100%',
            style: {
              'background-color': brand,
              padding: '14px 16px',
            },
          },
        ),
      ),
      { width: '100%' },
    );
  }

  // ---- Alt satır: disclaimer (sol) + el imzası (sağ) — bandın ALTINDA, ----
  // ---- sağ kolona hapsedilmeden kendi tam-genişlik satırında (spec §1.3). ----
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
  let bottomRow = '';
  if (handSigImg) {
    bottomRow = table(
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
  } else if (disclaimerSpan) {
    bottomRow = table(row(cell(disclaimerSpan)), { width: '100%' });
  }

  // ---- Kök: tek sütunlu yığın — her bölüm kendi tam-genişlik satırında. ----
  const sections: string[] = [row(cell(identityRow))];
  if (band) {
    sections.push(row(cell(band, { style: { 'padding-top': `${s.gap}px` } })));
  }
  if (bottomRow) {
    sections.push(
      row(cell(bottomRow, { style: { 'padding-top': `${Math.round(s.gap / 2)}px` } })),
    );
  }

  return table(sections.join(''), { style: { 'max-width': '600px' } });
}
