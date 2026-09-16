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
/**
 * Aksan alanının veri gereksinimi. `null` = şablon aksan çizmez.
 *
 * 🔴 Bu birleşim OLMADAN harita yalnız `as const` olurdu ve bir yazım hatası
 * (`'alwyas'`) `tsc`'den TEMİZ geçerdi — ölçüldü. Yakalayan tek şey davranış
 * testleri olurdu; bu depo bekçiliği testte değil DERLEYİCİDE tutar.
 */
type AccentRequirement = null | 'always' | 'needs-avatar';

const ACCENT_SURFACE = {
  'classic-horizontal': null,
  'stacked-minimal': null,
  'card-bordered': 'always',
  'divider-columns': null,
  'photo-first': 'needs-avatar',
  'cta-banner': null,
} as const satisfies Record<string, AccentRequirement>;

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
  // 🔴 `===` ile karşılaştır. Prototip anahtarları (`constructor`,
  // `toString`, `valueOf`) bu nesnede FONKSİYON döndürür; `?? null` ya da
  // truthy kontrolü onları yakalamaz ve bilinmeyen bir templateId için
  // yanlışlıkla `true` dönerdi.
  // 🔴 `hasOwnProperty` ile bak, `[templateId]` sonucunu doğrudan kullanma:
  // prototip anahtarları (`constructor`, `toString`, `valueOf`) bu nesnede
  // FONKSİYON döndürür ve sahibi olmadığımız bir değer switch'e girerdi.
  //
  // 🔴 Ayrıca burada `raw === 'always' || ...` diye ÖN DARALTMA YAPMA.
  // Yaparsan `req` başlatıcısına göre daralır, aşağıdaki `default` dalı
  // erişilemez sayılır ve `never` bekçisi SESSİZCE ETKİSİZ kalır —
  // ölçüldü: o hâlde `AccentRequirement`'a yeni bir değer eklemek
  // derlemeyi hiç kırmıyordu.
  const req: AccentRequirement = Object.prototype.hasOwnProperty.call(
    ACCENT_SURFACE,
    templateId,
  )
    ? // `noUncheckedIndexedAccess` açık olduğu için indeksli erişim
      // `| undefined` taşır; `hasOwnProperty` varlığı zaten garanti etti,
      // `?? null` yalnız tipi kapatır ve birleşimi DARALTMAZ (daraltsaydı
      // `never` bekçisi yine etkisiz kalırdı).
      ((ACCENT_SURFACE as Record<string, AccentRequirement>)[templateId] ?? null)
    : null;

  switch (req) {
    case 'always':
      return true;
    case 'needs-avatar':
      return Boolean(data.visuals.avatarUrl);
    case null:
      return false;
    default: {
      // 🔴 Eksiksizlik bekçisi. Üçüncü bir gereksinim (`'needs-logo'` gibi)
      // eklenip burada ele alınmazsa bu satır DERLEMEYİ KIRAR. Onsuz
      // fonksiyon sessizce `false` dönerdi — yani o şablonun aksanı hiç
      // çizilmez, hiçbir hata da çıkmazdı.
      const _never: never = req;
      return _never;
    }
  }
}
