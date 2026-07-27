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
  brandKicker: 'One brand. Every inbox.',
  eyebrow: 'Ajanslar ve kurumsal ekipler için',
  title: 'Bir imza tasarlayın, bütün ekip aynı markayla imza atsın.',
  subtitle:
    'Mailmyra e-posta imzasını merkezden tasarlar, koltuk sayısı kadar çalışana dağıtır. Herkes aynı logo, aynı renk, aynı yazı tipiyle imza atar — kimse kendi versiyonunu uydurmaz.',
  ctaPrimary: "Builder'ı Ücretsiz Dene",
  ctaSecondary: 'Örnek imzaya bak',
  demoEyebrow: 'Gerçek çıktı',
  demoCaption:
    "Builder'da düzenlenen imza, alıcının gelen kutusunda tam olarak böyle görünür — ekran görüntüsü değil, tıpkı bu HTML kopyalanıp yapıştırılır.",
} as const;
