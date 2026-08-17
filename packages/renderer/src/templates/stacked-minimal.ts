import type { SignatureData, RenderOptions } from '../types';
import { table, row, cell } from '../utils/table';
import { styleToString } from '../utils/inline-style';
import { ensureHttp, htmlEscape, sanitizeUrl } from '../utils/escape';
import { normalizeHex, readableTextOn } from '../utils/color';

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
  /** İmzanın toplam genişliği. classic-horizontal 600px'e kadar açılır;
   *  bu şablon bilerek DAR — tek kolon geniş olursa satırlar seyrekleşir. */
  width: number;
}

const SIZES: Record<Size, SizeScale> = {
  small: { name: 16, title: 11, body: 12, small: 10, avatar: 56, logo: 96, handSig: 120, gap: 10, width: 300 },
  medium: { name: 19, title: 12, body: 13, small: 11, avatar: 72, logo: 120, handSig: 150, gap: 12, width: 340 },
  large: { name: 23, title: 14, body: 14, small: 12, avatar: 88, logo: 144, handSig: 170, gap: 14, width: 380 },
};

const PLATFORM_LABELS: Record<
  SignatureData['social'][number]['platform'],
  string
> = {
  linkedin: 'LinkedIn',
  x: 'X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  github: 'GitHub',
  behance: 'Behance',
  dribbble: 'Dribbble',
};

/**
 * stacked-minimal — TEK KOLON, dikey yığın.
 *
 * classic-horizontal'ın "solda görsel · sağda metin" iki-kolon kurgusunun
 * tersi: görseller EN ÜSTTE, altında kimlik, altında iletişim. Yapısal
 * farklar (CSS farkı değil, spec §"Şablon Motoru"):
 *  - Tek kolonlu dış tablo, dar sabit genişlik (SIZES.width).
 *  - Avatar ve logo üst üste, imzanın tepesinde.
 *  - Telefon + cep TEK satırda birleşir (classic'te ikisi ayrı satır) —
 *    "minimal" burada satır sayısını düşürmek demek.
 *  - Ayraç: tam genişlik 1px çizgi değil, marka renginde 40px'lik kısa
 *    aksan çubuğu.
 *  - CTA tam genişlik (dar kolonda inline-block düğme kırık görünüyor).
 *  - El imzası kimliğin hemen altında (elle atılan imza adın altına gelir),
 *    feragatname en altta tam genişlik.
 */
export function stackedMinimal(data: SignatureData, opts?: RenderOptions): string {
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
    'line-height': '1.5',
    'text-decoration': 'none',
  });
  const mutedStyle = styleToString({
    'font-family': font,
    'font-size': `${s.small}px`,
    color: muted,
    'line-height': '1.5',
  });

  const halfGap = Math.round(s.gap / 2);

  /* ---- 1) Üst görsel yığını -------------------------------------------- */
  // Avatar ve logo İKİ BAĞIMSIZ SLOT (classic ile aynı kural, spec §2).
  // Logo'ya height BİLEREK verilmez — SignatureData görsel oranını saklamıyor,
  // yalnız width ile ölçekleriz.
  const visualRows: string[] = [];
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
          { style: { 'padding-bottom': `${halfGap}px` } },
        ),
      ),
    );
  }
  if (data.visuals.logoUrl) {
    visualRows.push(
      row(
        cell(
          `<img src="${sanitizeUrl(data.visuals.logoUrl)}" width="${s.logo}" alt="${htmlEscape(
            data.identity.company ?? 'Logo',
          )}" border="0" style="${styleToString({
            display: 'block',
            border: '0',
            width: `${s.logo}px`,
          })}" />`,
          { style: { 'padding-bottom': `${halfGap}px` } },
        ),
      ),
    );
  }

  /* ---- 2) Kimlik -------------------------------------------------------- */
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

  // Şirket marka renginde: bu şablonda logo her zaman olmayabilir, markayı
  // taşıyan tek tipografik öğe şirket adı.
  if (data.identity.company) {
    identityRows.push(
      row(
        cell(
          `<span style="${styleToString({
            'font-family': font,
            'font-size': `${s.title}px`,
            'font-weight': 'bold',
            color: brand,
            'line-height': '1.4',
          })}">${htmlEscape(data.identity.company)}</span>`,
        ),
      ),
    );
  }

  /* ---- 3) İletişim ------------------------------------------------------ */
  const contact = data.contact;
  const contactRows: string[] = [];
  const pushContact = (inner: string) =>
    contactRows.push(row(cell(inner, { style: { 'padding-bottom': '2px' } })));

  const telLink = (raw: string) =>
    `<a href="${sanitizeUrl(`tel:${raw.replace(/[^\d+]/g, '')}`)}" style="${bodyStyle}">${htmlEscape(raw)}</a>`;

  // Telefon + cep TEK satırda — dar kolonda iki ayrı satır israf.
  const phones = [contact.phone, contact.mobile].filter((v): v is string => Boolean(v));
  if (phones.length) {
    pushContact(
      phones.map(telLink).join(`<span style="color:${muted}">&nbsp;·&nbsp;</span>`),
    );
  }
  if (contact.email) {
    pushContact(
      `<a href="${sanitizeUrl(`mailto:${contact.email}`)}" style="${linkStyle}">${htmlEscape(contact.email)}</a>`,
    );
  }
  if (contact.website) {
    const href = sanitizeUrl(ensureHttp(contact.website));
    const label = contact.website.replace(/^https?:\/\//i, '');
    pushContact(`<a href="${href}" style="${linkStyle}">${htmlEscape(label)}</a>`);
  }
  if (contact.address) {
    pushContact(
      `<span style="${mutedStyle}">${htmlEscape(contact.address).replace(/\n/g, '<br>')}</span>`,
    );
  }
  for (const field of data.extras?.customFields ?? []) {
    const value = field.url
      ? `<a href="${sanitizeUrl(ensureHttp(field.url))}" style="${linkStyle}">${htmlEscape(field.value)}</a>`
      : `<span style="${bodyStyle}">${htmlEscape(field.value)}</span>`;
    pushContact(
      `<span style="${styleToString({
        'font-family': font,
        'font-size': `${s.small}px`,
        color: muted,
      })}">${htmlEscape(field.label)}: </span>${value}`,
    );
  }

  /* ---- 4) Sosyal -------------------------------------------------------- */
  // iconBaseUrl verilirse CDN PNG ikonları, verilmezse metin-link
  // (classic-horizontal ile birebir aynı sözleşme — çağıran taraf şablona
  // göre davranış değiştirmek zorunda kalmasın).
  let socialRow = '';
  if (data.social.length) {
    const socialCellStyle = { 'padding-top': `${halfGap}px` };
    if (opts?.iconBaseUrl) {
      const base = opts.iconBaseUrl.replace(/\/$/, '');
      // filled statiktir (platform renkleri); outline ve mono kullanıcının
      // iconColor'ına göre üretilir (brandColor'dan bağımsız — karar:
      // 2026-07-27), bu yüzden yol renge anahtarlanır.
      const variantPath =
        data.layout.iconStyle === 'filled'
          ? 'filled'
          : `${data.layout.iconStyle}-${iconHex.slice(1)}`;
      const iconCells = data.social
        .map((soc, i) =>
          cell(
            `<a href="${sanitizeUrl(soc.url)}" style="text-decoration:none"><img src="${base}/icons/${variantPath}/${soc.platform}.png" width="24" height="24" alt="${PLATFORM_LABELS[soc.platform]}" border="0" style="${styleToString(
              { border: 'none', display: 'inline-block' },
            )}" /></a>`,
            {
              style: i < data.social.length - 1 ? { 'padding-right': '8px' } : undefined,
            },
          ),
        )
        .join('');
      socialRow = row(cell(table(row(iconCells)), { style: socialCellStyle }));
    } else {
      const sep = `<span style="color:${muted}">&nbsp;·&nbsp;</span>`;
      const socialHtml = data.social
        .map(
          (soc) =>
            `<a href="${sanitizeUrl(soc.url)}" style="${linkStyle}">${PLATFORM_LABELS[soc.platform]}</a>`,
        )
        .join(sep);
      socialRow = row(cell(socialHtml, { style: socialCellStyle }));
    }
  }

  /* ---- 5) Montaj -------------------------------------------------------- */
  const lines: string[] = [...visualRows, ...identityRows];

  // El imzası kimliğin hemen altında: gerçek hayatta el yazısı imza adın
  // altına atılır. classic'te feragatnameyle yan yana duruyor — orada sağ
  // kolon var, burada yok.
  if (data.visuals.handSignatureUrl) {
    lines.push(
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

  // Aksan çubuğu: yalnızca ALTINDA gerçekten içerik varsa çizilir — tek
  // başına asılı kalan ayraç bırakmayız.
  const hasBodyBelow = contactRows.length > 0 || socialRow !== '';
  if (data.layout.showDividers && hasBodyBelow) {
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
      row(cell(bar, { style: { 'padding-top': `${s.gap}px`, 'padding-bottom': `${s.gap}px` } })),
    );
  } else if (hasBodyBelow) {
    // Ayraç kapalıyken de kimlik ile iletişim bloğu arasında nefes payı kalsın.
    lines.push(row(cell('&nbsp;', { style: { height: `${s.gap}px`, 'line-height': `${s.gap}px`, 'font-size': '1px' } })));
  }

  lines.push(...contactRows);
  if (socialRow) lines.push(socialRow);

  // CTA tam genişlik: dar tek kolonda sola yaslı küçük düğme kırık görünür.
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
              padding: '10px 16px',
            },
          },
        ),
      ),
      { width: '100%' },
    );
    lines.push(row(cell(btn, { style: { 'padding-top': `${s.gap}px` } })));
  }

  if (data.extras?.disclaimer) {
    lines.push(
      row(
        cell(
          `<span style="${styleToString({
            'font-family': font,
            'font-size': `${s.small}px`,
            color: muted,
            'line-height': '1.3',
          })}">${htmlEscape(data.extras.disclaimer).replace(/\n/g, '<br>')}</span>`,
          { style: { 'padding-top': `${s.gap}px` } },
        ),
      ),
    );
  }

  return table(lines.join(''), {
    width: s.width,
    style: { 'max-width': `${s.width}px` },
  });
}
