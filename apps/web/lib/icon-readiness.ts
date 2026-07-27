import type { SignatureData } from '@mailmyra/renderer';

/**
 * Export kilidi, ikonların brandColor'a göre ÜRETİLMESİ gereken stillerde
 * devreye girer. `filled` platform renkleriyle deploy-time statiktir;
 * sosyal listesi boşken hiç ikon basılmaz.
 */
export function needsGeneratedIcons(data: SignatureData): boolean {
  const colourKeyed = data.layout.iconStyle === 'outline' || data.layout.iconStyle === 'mono';
  return colourKeyed && data.social.length > 0;
}
