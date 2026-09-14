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
 */
const SITE = 'https://mailmyra.com';

export const LEGAL = {
  terms: { path: `${SITE}/terms`, version: '2026-08-14', title: 'Terms of Service' },
  privacy: { path: `${SITE}/privacy`, version: '2026-08-14', title: 'Privacy Policy' },
  kvkk: { path: `${SITE}/kvkk`, version: '2026-08-14', title: 'KVKK Aydınlatma Metni' },
} as const;
