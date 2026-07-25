import type { SignatureData } from '@mailmyra/renderer';

/**
 * Export kilidi yalnız mono gerektiğinde devreye girer (spec §3d):
 * filled/outline deploy-time statiktir, sosyal boşken ikon hiç basılmaz.
 */
export function needsMonoIcons(data: SignatureData): boolean {
  return data.layout.iconStyle === 'mono' && data.social.length > 0;
}
