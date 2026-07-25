import type { SignatureData, RenderOptions } from '../types';
import { table, row, cell } from '../utils/table';
import { styleToString } from '../utils/inline-style';
import { htmlEscape, sanitizeUrl } from '../utils/escape';
import { normalizeHex, readableTextOn } from '../utils/color';

type Size = SignatureData['layout']['size'];

interface SizeScale {
  name: number;
  title: number;
  body: number;
  small: number;
  avatar: number;
  gap: number;
}

const SIZES: Record<Size, SizeScale> = {
  small: { name: 15, title: 12, body: 12, small: 11, avatar: 64, gap: 12 },
  medium: { name: 18, title: 13, body: 13, small: 11, avatar: 90, gap: 16 },
  large: { name: 22, title: 15, body: 14, small: 12, avatar: 110, gap: 20 },
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

function ensureHttp(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function classicHorizontal(data: SignatureData, opts?: RenderOptions): string {
  const s = SIZES[data.layout.size] ?? SIZES.medium;
  const font = data.visuals.fontFamily;
  const text = normalizeHex(data.visuals.textColor);
  const muted = normalizeHex(data.visuals.mutedColor);
  const brand = normalizeHex(data.visuals.brandColor);

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

  // Ayraç (1px arka plan çizgisi — div yok)
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
  // (geriye uyumlu — eski çağrılar ve testler aynen çalışır).
  if (data.social.length) {
    const socialCellStyle = {
      'padding-top': `${Math.round(s.gap / 2)}px`,
      'padding-bottom': '2px',
    };
    if (opts?.iconBaseUrl) {
      const base = opts.iconBaseUrl.replace(/\/$/, '');
      const variantPath =
        data.layout.iconStyle === 'mono'
          ? `mono-${brand.slice(1)}`
          : data.layout.iconStyle;
      const iconCells = data.social
        .map((soc, i) =>
          cell(
            `<a href="${sanitizeUrl(soc.url)}" style="text-decoration:none"><img src="${base}/icons/${variantPath}/${soc.platform}.png" width="24" height="24" alt="${PLATFORM_LABELS[soc.platform]}" border="0" style="${styleToString(
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

  // CTA butonu (bulletproof)
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

  // Alt satır: disclaimer (sol) + el imzası (sağ) — spec §2.
  // El imzası varken 2 hücreli nested table kullanılır (colspan'a bulaşmadan);
  // sağ kolon 150px sabittir, imza hücreyi doldurur → sağa hizalı görünür.
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

  // Sol görsel sütunu: avatar üstte, logo altta — İKİ BAĞIMSIZ SLOT
  // (eski `avatarUrl ?? logoUrl` tek-yuva davranışı kaldırıldı, spec §2).
  // Logo genişliği = kolon genişliği (s.avatar); height BİLEREK verilmez —
  // SignatureData görsel oranı saklamıyor. Outlook width-only ölçeklemeyi
  // genelde doğru yapar; 6-istemci testinde özellikle kontrol edilecek.
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
        ),
      ),
    );
  }
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
          { style: data.visuals.avatarUrl ? { 'padding-top': '8px' } : undefined },
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

  const rightCell = cell(rightInner, { valign: 'top' });

  return table(row(leftCell + rightCell), { style: { 'max-width': '600px' } });
}
