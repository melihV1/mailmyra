/**
 * Ana sayfa hero'su için tek sözlük — tüm kullanıcıya-görünür metin burada.
 * Site ileride TR+EN olacak (CLAUDE.md §Kilitli Kararlar); i18n altyapısı,
 * routing veya dil değiştirici bilerek YOK — bu yalnız o geçişi kolaylaştıran
 * bir kısayol.
 *
 * Next.js App Router page dosyaları yalnız belirli export'lara izin verir
 * (default, metadata, ...) — bu yüzden sözlük page.tsx'in dışında, ayrı bir
 * modülde tutulur ve oradan içe aktarılır.
 */
export const TR = {
  navLogoAlt: 'Mailmyra',
  navLogin: 'Giriş yap',
  navCta: "Builder'ı Dene",
  brandKicker: 'One brand. Every inbox.',
  eyebrow: 'Ajanslar ve kurumsal ekipler için',
  title: 'Bir imza tasarlayın, bütün ekip aynı markayla imza atsın.',
  subtitle:
    'Mailmyra e-posta imzasını merkezden tasarlar, koltuk sayısı kadar çalışana dağıtır. Herkes aynı logo, aynı renk, aynı yazı tipiyle imza atar — kimse kendi versiyonunu uydurmaz.',
  ctaPrimary: "Builder'ı Ücretsiz Dene",
  ctaSecondary: 'Örnek imzaya bak',
  demoEyebrow: 'Gerçek çıktı',
  // Kartın altındaki mikro rozetler — gerçek, doğrulanabilir iddialar
  // (uydurma kullanım rakamı yok): bu render, renderer paketinin kendi
  // çıktısı ve ekran görüntüsü değil.
  badgeApproved: 'Marka onaylı çıktı',
  badgeReal: 'Gerçek render, ekran görüntüsü değil',
  demoCaption:
    "Builder'da düzenlenen imza, alıcının gelen kutusunda tam olarak böyle görünür — ekran görüntüsü değil, tıpkı bu HTML kopyalanıp yapıştırılır.",
  // Güven şeridi — CLAUDE.md'de kilitli olan gerçek ürün özellikleri
  // (test matrisi, fiyatlandırma modeli, export mekanizması).
  trustItems: [
    'Tablo tabanlı, Outlook uyumlu düzen',
    '6 e-posta istemcisinde test edilir',
    'Koltuk başına fiyatlandırma',
    'Kopyala-yapıştır veya .htm indir',
  ],
} as const;
