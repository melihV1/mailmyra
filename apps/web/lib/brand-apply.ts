import type { SignatureData } from '@mailmyra/renderer';

import type { BrandDocument, BrandField } from './brand-doc';

/**
 * Zorlamanın gerçek yeri (spec §4): kilitli input UX'tir, bindirme kapıdır.
 * Kayıtlı veri DEĞİŞMEZ — bindirme çıktıya işler; kilit kalkınca altta
 * duran kişisel değer geri görünür.
 */

function pick<T>(f: BrandField<T> | undefined, wantLockedOnly: boolean): T | undefined {
  if (!f) return undefined;
  if (wantLockedOnly && f.mode !== 'locked') return undefined;
  return f.value;
}

function overlay(data: SignatureData, brand: BrandDocument, lockedOnly: boolean): SignatureData {
  const visuals = { ...data.visuals };
  const layout = { ...data.layout };
  const extras = { ...(data.extras ?? {}) };

  const t = pick(brand.templateId, lockedOnly);
  if (t !== undefined) layout.templateId = t;
  const bc = pick(brand.brandColor, lockedOnly);
  if (bc !== undefined) visuals.brandColor = bc;
  const tc = pick(brand.textColor, lockedOnly);
  if (tc !== undefined) visuals.textColor = tc;
  const mc = pick(brand.mutedColor, lockedOnly);
  if (mc !== undefined) visuals.mutedColor = mc;
  const ff = pick(brand.fontFamily, lockedOnly);
  if (ff !== undefined) visuals.fontFamily = ff;
  const lg = pick(brand.logoUrl, lockedOnly);
  if (lg !== undefined) visuals.logoUrl = lg;
  const cta = pick(brand.cta, lockedOnly);
  if (cta !== undefined) {
    extras.ctaLabel = cta.label;
    extras.ctaUrl = cta.url;
  }
  const dc = pick(brand.disclaimer, lockedOnly);
  if (dc !== undefined) extras.disclaimer = dc;

  return { ...data, visuals, layout, extras };
}

/** Her render ÇIKIŞINDA koşar — yalnız kilitliler biner. */
export function applyBrand(data: SignatureData, brand: BrandDocument | null): SignatureData {
  if (!brand) return data;
  return overlay(data, brand, true);
}

/** YENİ imza tohumu — kilitli + varsayılan birlikte biner (spec §3). */
export function seedBrandDefaults(
  empty: SignatureData,
  brand: BrandDocument | null,
): SignatureData {
  if (!brand) return empty;
  return overlay(empty, brand, false);
}

/**
 * Builder UI'nin tek karar noktası (T8): hangi kontrol `disabled` olacak.
 * Mod mantığı burada bir kez değerlendirilir — adımlar yalnız `.has(...)`
 * sorar, kilit kararını kendileri tekrar yazmaz.
 */
export type BrandFieldName = keyof BrandDocument;

export function lockedBrandFields(brand: BrandDocument | null): Set<BrandFieldName> {
  const out = new Set<BrandFieldName>();
  if (!brand) return out;
  for (const key of Object.keys(brand) as BrandFieldName[]) {
    if (brand[key]?.mode === 'locked') out.add(key);
  }
  return out;
}
