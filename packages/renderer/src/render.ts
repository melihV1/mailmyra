import type { SignatureData, RenderOptions } from './types';
import { classicHorizontal } from './templates/classic-horizontal';
import { stackedMinimal } from './templates/stacked-minimal';
import { cardBordered } from './templates/card-bordered';
import { dividerColumns } from './templates/divider-columns';
import { photoFirst } from './templates/photo-first';
import { ctaBanner } from './templates/cta-banner';

type TemplateFn = (data: SignatureData, opts?: RenderOptions) => string;

/**
 * 🔴 Bu nesne `Record<string, TemplateFn>` diye ANOTASYONLANMAZ — `satisfies`
 * ile bildirilir. Sebep: anotasyon anahtarları `string`e genişletir ve
 * aşağıdaki `TEMPLATE_ACCENT_SURFACE`'in `satisfies` koruması hiçbir şeyi
 * tutmaz hâle gelir (eksik anahtarlı harita hatasız derlenir — ölçüldü).
 * `satisfies` ile literal anahtarlar korunur, koruma ısırır.
 */
const TEMPLATES = {
  'classic-horizontal': classicHorizontal,
  'stacked-minimal': stackedMinimal,
  'card-bordered': cardBordered,
  'divider-columns': dividerColumns,
  'photo-first': photoFirst,
  'cta-banner': ctaBanner,
} satisfies Record<string, TemplateFn>;

export const TEMPLATE_IDS = Object.keys(TEMPLATES);

/**
 * Hangi şablonun aksan alanı (bant/panel) var. `layout.accentBand` yalnız
 * burada `true` olanlarda bir şey yapar; builder anahtarı da yalnız onlarda
 * gösterir. Arayüz bu listeyi KOPYALAMAZ, buradan okur — yoksa yedinci
 * şablona aksan eklendiğinde arayüz sessizce sunmamaya devam ederdi.
 *
 * `satisfies Record<keyof typeof TEMPLATES, boolean>` bilinçli: yeni şablon
 * eklendiğinde DERLEME KIRILIR ve yazan kişi karar vermek zorunda kalır.
 */
export const TEMPLATE_ACCENT_SURFACE = {
  'classic-horizontal': false,
  'stacked-minimal': false,
  'card-bordered': true,
  'divider-columns': false,
  'photo-first': true,
  'cta-banner': false,
} satisfies Record<keyof typeof TEMPLATES, boolean>;

export function renderSignature(
  data: SignatureData,
  templateId: string,
  opts?: RenderOptions,
): string {
  // Literal anahtarlı nesne `string` ile indekslenemez; çalışma zamanı
  // "bilinmeyen şablon" kontrolü aşağıda KORUNUYOR.
  const template = (TEMPLATES as Record<string, TemplateFn>)[templateId];
  if (!template) {
    throw new Error(
      `Unknown templateId: "${templateId}". Available: ${TEMPLATE_IDS.join(', ')}`,
    );
  }
  return template(data, opts);
}
