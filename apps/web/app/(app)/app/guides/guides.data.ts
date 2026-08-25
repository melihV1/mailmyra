/**
 * Kurulum rehberleri — TİPLER ve dil girişi. İçerik dil başına ayrı
 * dosyada yaşar: `guides-content.en.ts` / `guides-content.tr.ts`
 * (Dalga B, spec 2026-08-24). İçerik kuralları o dosyaların başında;
 * iskelet eşliğinin bekçisi `test/guides-parity.test.ts`. Bileşen
 * sadece çizer.
 *
 * Adım gövdelerinde `backtick` → <code> (bileşendeki RichText). Veri
 * dosyaları düz TS kalsın diye tek işaretleme kuralı bu; başka
 * biçimlendirme yok.
 */

import type { Lang } from '../../../../lib/i18n/types';
import { EXPORT_CHAIN_EN, GUIDES_EN } from './guides-content.en';
import { EXPORT_CHAIN_TR, GUIDES_TR } from './guides-content.tr';

/** İstemcinin zengin HTML imzayı taşıyıp taşımadığı — rozet dili. */
export type Fidelity = 'rich' | 'text';

export interface GuideStep {
  readonly title: string;
  readonly body: string;
}

export interface StepGroup {
  readonly title: string;
  /** Grubun ne zaman tercih edileceği — kart altbaşlığı. */
  readonly note?: string;
  readonly steps: readonly GuideStep[];
}

export interface Guide {
  /** Derin bağlantı anahtarı: /app/guides?client=<slug> */
  readonly slug: string;
  /** Sol sekme etiketi (kısa). */
  readonly label: string;
  readonly icon: string;
  /** Sağ panel başlığı (tam ad). */
  readonly headline: string;
  readonly blurb: string;
  readonly fidelity: Fidelity;
  /** "Neyi kullanır" rozeti: pano, .htm dosyası, düz metin. */
  readonly uses: string;
  readonly groups: readonly StepGroup[];
  /** Sorun giderme / dürüstlük notları — abartısız. */
  readonly notes?: readonly string[];
}

export function getGuides(lang: Lang): readonly Guide[] {
  return lang === 'tr' ? GUIDES_TR : GUIDES_EN;
}

export function getExportChain(lang: Lang): readonly GuideStep[] {
  return lang === 'tr' ? EXPORT_CHAIN_TR : EXPORT_CHAIN_EN;
}

/** Geçersiz/eksik `?client=` ilk istemciye düşer (ölü uç yok). */
export function guideFor(lang: Lang, slug: string | null): Guide {
  const guides = lang === 'tr' ? GUIDES_TR : GUIDES_EN;
  return guides.find((g) => g.slug === slug) ?? guides[0];
}
