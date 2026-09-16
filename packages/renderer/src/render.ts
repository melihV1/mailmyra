import type { SignatureData, RenderOptions } from './types';
import { classicHorizontal } from './templates/classic-horizontal';
import { stackedMinimal } from './templates/stacked-minimal';
import { cardBordered } from './templates/card-bordered';
import { dividerColumns } from './templates/divider-columns';
import { photoFirst } from './templates/photo-first';
import { ctaBanner } from './templates/cta-banner';
import { TEMPLATE_ACCENT_SURFACE } from './capabilities';

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
 * Hangi şablonun aksan yükleme haritasında karşılığı var — derleme zamanı
 * eksiksizlik koruması. Harita artık `./capabilities`'te yaşıyor (şablonlar
 * onu ithal edip `accentSurfaceAvailable` çağıracak, döngü oluşmasın diye);
 * ama TEMPLATES burada, o yüzden koruma da burada kalmalı.
 *
 * Bu atama yalnız tip düzeyinde bir iddia — değeri hiç okunmaz. `capabilities.ts`
 * içindeki `ACCENT_SURFACE`'ten bir şablon anahtarı EKSİLİRSE (ör. yeni bir
 * şablon `TEMPLATES`'e eklenip orada unutulursa) bu satır DERLEMEYİ KIRAR:
 * `Record<keyof typeof TEMPLATES, unknown>` her anahtarın var olmasını ister.
 */
const _accentCoverage: Record<keyof typeof TEMPLATES, unknown> = TEMPLATE_ACCENT_SURFACE;
void _accentCoverage;

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
