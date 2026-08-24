/** Panel/builder dil altyapısının çekirdek tipleri (Dalga B, spec 2026-08-24). */

export type Lang = 'en' | 'tr';

export const LANGS = ['en', 'tr'] as const;

/** Elle seçim çerezi — cihaz başına kalıcı, DB kolonu bilinçli yok (spec §2). */
export const LANG_COOKIE = 'mm-lang';

export function isLang(v: unknown): v is Lang {
  return v === 'en' || v === 'tr';
}

/**
 * tr sözlüğü en'in şeklini BİREBİR taşımak zorunda: string yaprak →
 * string, fonksiyon yaprak → aynı imza, iç içe nesne → aynı iskelet.
 * Eksik/fazla anahtar derlemede kırılır — bekçi test değil derleyicidir.
 */
export type Mirror<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => string
    ? (...args: A) => string
    : T[K] extends string
      ? string
      : T[K] extends readonly string[]
        ? readonly string[]
        : Mirror<T[K]>;
};
