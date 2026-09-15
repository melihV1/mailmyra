/**
 * Hukuki sayfaların tek kaynağı.
 *
 * **Metinler PAZARLAMA SİTESİNDE yaşar** (karar 2026-09-14, Hüseyin).
 * Uygulamanın kendi `(marketing)/privacy|terms|kvkk` sayfaları vardı ama
 * onlar sitedekinden FARKLI, daha kısa ve üstünde *"Draft — this document
 * has not yet been reviewed by counsel"* yazan bir sürümdü. Kayıt onayı
 * akışı ona link verdiği için kullanıcılar taslağı onaylıyordu; sitede
 * ise bir gün sonraki gerçek metin yayındaydı. Site sürümü geçerli
 * sayıldı, app kopyaları kaldırıldı ve rotaları `next.config.js`
 * üzerinden siteye 308'liyor (yer imleri ve eski linkler için).
 *
 * `path` bu yüzden MUTLAK: app'ten verilen link doğrudan geçerli metne
 * gitsin, araya yönlendirme adımı girmesin.
 *
 * `version` = yürürlük günü; sitedeki üç belge de "Last updated:
 * August 14, 2026" diyor. Metin değişince BURASI güncellenir.
 *
 * ⚠️ Geriye dönük DEĞİL: `2026-08-13` yazan mevcut `LegalAcceptance`
 * satırları olduğu gibi kalır — o kullanıcılar gerçekten o taslağı
 * gördü ve kayıt bunu dürüstçe söylemeye devam eder. Kodda saklanan
 * sürümü güncelle karşılaştıran bir "yeniden onayla" kapısı yok
 * (arandı), yani bu değişiklik kimseyi yeniden onaya zorlamaz.
 *
 * Silinen 13 Ağustos taslakları bugün yalnız git geçmişinde yaşıyor:
 * `6f06328` (kökün siteye yönlendirildiği, ama üç hukuki sayfanın henüz
 * silinmediği commit — bir sonraki commit onları kaldırdı) taslakların
 * SON hâlini taşır. Talep gelirse:
 *   git show 6f06328:"apps/web/app/(marketing)/privacy/page.tsx"
 * (aynı şekilde `terms` ve `kvkk` için).
 *
 * Origin `NEXT_PUBLIC_MARKETING_ORIGIN`den okunur, `MARKETING_ORIGIN`den
 * DEĞİL — ikisi ayrı env değişkeni ve kasıtlı: bu dosyayı `SignupForm.tsx`
 * import ediyor, o da bir `'use client'` bileşeni, yani tarayıcıda çalışıyor.
 * Next.js yalnız `NEXT_PUBLIC_` önekli değişkenleri DERLEME sırasında
 * istemci paketine gömer; sunucu-yalnız `process.env.MARKETING_ORIGIN`
 * (bkz. `api/auth/_shared.ts` → `marketingOrigin()`) istemcide her zaman
 * `undefined` okunur — bu dosya o deseni KULLANAMAZ. Staging gibi
 * mailmyra.com dışı bir origin'e geçen bir deploy, iki değişkeni de
 * (`MARKETING_ORIGIN` sunucu tarafı yönlendirmeler için, buradaki
 * `NEXT_PUBLIC_MARKETING_ORIGIN` istemci linkleri için) birlikte ayarlamalı.
 */
/*
 * ⚠️ `NEXT_PUBLIC_*` DERLEME ANINDA gömülür, çalışma anında okunmaz.
 * Bu projede deploy `next build` yapıp `.next`i yüklüyor, ortam
 * değişkenleri SONRADAN Plesk > Node.js panelinden veriliyor — yani bu
 * değişkeni oraya yazmak SESSİZCE hiçbir şey yapmaz: istemci paketi
 * derleme anında gömülen origin'i taşımaya devam ederken, çalışma anında
 * okunan `MARKETING_ORIGIN` (next.config.js ve marketingOrigin()) paneli
 * izler. İkisi ayrışır ve hata vermez. Üretim dışı bir origin BUILD
 * ortamında ayarlanmalı, Plesk panelinde değil.
 */
const SITE = (process.env.NEXT_PUBLIC_MARKETING_ORIGIN ?? 'https://mailmyra.com').replace(
  /\/+$/,
  '',
);

export const LEGAL = {
  terms: { path: `${SITE}/terms`, version: '2026-08-14', title: 'Terms of Service' },
  privacy: { path: `${SITE}/privacy`, version: '2026-08-14', title: 'Privacy Policy' },
  kvkk: { path: `${SITE}/kvkk`, version: '2026-08-14', title: 'KVKK Aydınlatma Metni' },
} as const;
