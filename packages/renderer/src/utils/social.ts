import type { SignatureData } from '../types';

export type SocialPlatform = SignatureData['social'][number]['platform'];
export type IconStyle = SignatureData['layout']['iconStyle'];

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
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
 * Sosyal ikon PNG'sinin `icons/` kökünden itibaren göreli yolu
 * (`<variant>/<platform>.png`). `filled` statiktir (platform renkleri);
 * `outline`/`mono` kullanıcının iconColor'ına göre üretilir (brandColor'dan
 * bağımsız — karar: 2026-07-27), bu yüzden yol renge anahtarlanır.
 *
 * Üç şablonda (classic-horizontal, stacked-minimal, card-bordered) birebir
 * aynı olan variantPath mantığının taşınmış hali — davranış değişmedi.
 */
export function socialIconPath(
  iconStyle: IconStyle,
  iconHex: string,
  platform: SocialPlatform,
): string {
  const variantPath =
    iconStyle === 'filled' ? 'filled' : `${iconStyle}-${iconHex.slice(1)}`;
  return `${variantPath}/${platform}.png`;
}
