import { TEMPLATE_IDS } from '@mailmyra/renderer';

/**
 * `/builder?template=<id>` — pazarlama sitesindeki şablon galerisinin
 * "Open in builder" linkleri buradan geliyor.
 *
 * Geçersiz değer sessizce yok sayılır, 404 verilmez: galeri statik bir
 * sitede yaşıyor, bir şablon adı değişirse eski linkler bir süre daha
 * dolaşımda kalır. O linke tıklayan ziyaretçiyi hata sayfasına düşürmek
 * varsayılan şablonla builder'ı açmaktan kötüdür.
 */
export function templateFromParam(raw: string | string[] | undefined): string | undefined {
  if (typeof raw !== 'string' || !raw) return undefined;
  return (TEMPLATE_IDS as readonly string[]).includes(raw) ? raw : undefined;
}
