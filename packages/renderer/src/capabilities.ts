import type { SignatureData } from './types';

/**
 * Şablonun aksan alanı var mı, VARSA hangi veriyi gerektiriyor.
 * `null` = o şablon aksan çizmez.
 *
 * Bu dosya YALNIZ `./types`'ı ithal eder — `./render`'ı DEĞİL. Şablonlar
 * bu modülü ithal edecek (`accentSurfaceAvailable` çağırmak için) ve
 * `render.ts` zaten şablonları ithal ediyor; `capabilities.ts` da
 * `render.ts`'i ithal etseydi döngü oluşurdu.
 *
 * Anahtarlar `render.ts`'teki `TEMPLATES` haritasıyla elle eşleşir.
 * Uyuşmazlık — yeni şablon eklenip burası güncellenmezse — `render.ts`
 * içindeki tip düzeyinde iddia (`_accentCoverage`) yüzünden DERLEME
 * KIRILIR; bkz. orada.
 */
const ACCENT_SURFACE = {
  'classic-horizontal': null,
  'stacked-minimal': null,
  'card-bordered': 'always',
  'divider-columns': null,
  'photo-first': 'needs-avatar',
  'cta-banner': null,
} as const;

export const TEMPLATE_ACCENT_SURFACE = ACCENT_SURFACE;

/**
 * Bu şablon + bu veri ile aksan alanı ÇİZİLEBİLİR mi.
 *
 * 🔴 Kullanıcının `layout.accentBand` tercihine BAKMAZ — o ayrı bir soru
 * (`shouldShowAccentBand`, `utils/accent.ts`). Sebebi kritik: builder bu
 * yüklemi anahtarın GÖRÜNÜRLÜĞÜ için kullanıyor; tercihi de hesaba katsaydı
 * kullanıcı anahtarı kapattığı anda anahtar EKRANDAN KAYBOLUR ve bir daha
 * açamazdı.
 */
export function accentSurfaceAvailable(data: SignatureData, templateId: string): boolean {
  const req = (ACCENT_SURFACE as Record<string, unknown>)[templateId];
  // 🔴 `===` ile karşılaştır. Prototip anahtarları (`constructor`,
  // `toString`, `valueOf`) bu nesnede FONKSİYON döndürür; `?? null` ya da
  // truthy kontrolü onları yakalamaz ve bilinmeyen bir templateId için
  // yanlışlıkla `true` dönerdi.
  if (req === 'always') return true;
  if (req === 'needs-avatar') return Boolean(data.visuals.avatarUrl);
  return false;
}
