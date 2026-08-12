import { TEMPLATE_IDS, type WebSafeFont } from '@mailmyra/renderer';

/**
 * Marka belgesi (spec §3). Her alan İSTEĞE BAĞLI { value, mode } — belgede
 * olmayan alanı org yönetmiyordur. Doğrulama SIKI (spec §6): belge org
 * genelini yönetir; imza kaydının gevşekliği burada geçerli değil.
 */

export type BrandMode = 'locked' | 'default';
export interface BrandField<T> {
  value: T;
  mode: BrandMode;
}
export interface BrandDocument {
  templateId?: BrandField<string>;
  brandColor?: BrandField<string>;
  textColor?: BrandField<string>;
  mutedColor?: BrandField<string>;
  fontFamily?: BrandField<WebSafeFont>;
  logoUrl?: BrandField<string>;
  cta?: BrandField<{ label: string; url: string }>;
  disclaimer?: BrandField<string>;
}

/** Tek runtime listesi — StyleStep de burayı kullanır. `satisfies` tip
 *  birliğinden saparsa derlemede yakalar. */
export const WEB_SAFE_FONTS = [
  'Arial, Helvetica, sans-serif',
  'Georgia, serif',
  'Times New Roman, serif',
  'Verdana, Geneva, sans-serif',
  'Tahoma, Geneva, sans-serif',
  'Trebuchet MS, sans-serif',
] as const satisfies readonly WebSafeFont[];

const MODES: readonly string[] = ['locked', 'default'];
const HEX = /^#[0-9a-f]{6}$/i;

function httpUrl(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function entry(raw: unknown): { value: unknown; mode: BrandMode } | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (Object.keys(raw).length !== 2) return null; // fazla anahtar da ret
  const { value, mode } = raw as { value?: unknown; mode?: unknown };
  if (typeof mode !== 'string' || !MODES.includes(mode)) return null;
  if (value === undefined) return null;
  return { value, mode: mode as BrandMode };
}

export function parseBrandDocument(input: unknown): BrandDocument | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const out: BrandDocument = {};
  for (const [key, raw] of Object.entries(input)) {
    const f = entry(raw);
    if (!f) return null;
    switch (key) {
      case 'templateId':
        if (typeof f.value !== 'string' || !(TEMPLATE_IDS as readonly string[]).includes(f.value))
          return null;
        out.templateId = { value: f.value, mode: f.mode };
        break;
      case 'brandColor':
      case 'textColor':
      case 'mutedColor':
        if (typeof f.value !== 'string' || !HEX.test(f.value)) return null;
        out[key] = { value: f.value, mode: f.mode };
        break;
      case 'fontFamily':
        if (typeof f.value !== 'string' || !(WEB_SAFE_FONTS as readonly string[]).includes(f.value))
          return null;
        out.fontFamily = { value: f.value as WebSafeFont, mode: f.mode };
        break;
      case 'logoUrl':
        if (!httpUrl(f.value)) return null;
        out.logoUrl = { value: f.value, mode: f.mode };
        break;
      case 'cta': {
        const v = f.value as { label?: unknown; url?: unknown } | null;
        if (!v || typeof v !== 'object') return null;
        if (Object.keys(v).length !== 2) return null;
        if (typeof v.label !== 'string' || !v.label.trim() || !httpUrl(v.url)) return null;
        out.cta = { value: { label: v.label, url: v.url }, mode: f.mode };
        break;
      }
      case 'disclaimer':
        if (typeof f.value !== 'string') return null;
        out.disclaimer = { value: f.value, mode: f.mode };
        break;
      default:
        return null; // tanınmayan alan adı
    }
  }
  return out;
}
