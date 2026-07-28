# Mailmyra — Sayfa Planı

Bu belge `docs/design-system.md`'deki bileşenleri sayfalara dağıtır. Her
sayfa için: iş (job), hedef kitle, bölüm sırası, bölümün kullandığı
bileşenler, birincil dönüşüm eylemi. **Her sayfa ve her bölüm MVP veya
LATER olarak işaretlidir.**

**Genel ilke:** MVP = satmak için gerekli olan, süsleme değil. Bir bölüm
LATER işaretliyse ya (a) gerçek içerik yoksa yayınlanmayacağı için (sahte
logo/testimonial yayınlanmaz), ya (b) henüz kodlanmamış bir özelliğe
dayandığı için (`CLAUDE.md §4 Haftalık Plan`'da Hafta 4'e ait), ya da (c)
`CLAUDE.md §YAPILMAYACAKLAR`'da doğrudan yasaklı olduğu için hiç
planlanmıyor.

**Tümü MVP:** 10 sayfanın 10'u da MVP kapsamında — bunlar `CLAUDE.md §Site
Yapısı`'ndaki halka açık sitenin iskeleti, hiçbiri ertelenebilir değil.
LATER işaretleri sayfa içi BÖLÜM seviyesinde.

**TR+EN mimarisi notu (tüm sayfalar için geçerli, tekrar yazılmıyor):**
İçerik TR öncelikli yazılır ama her sayfanın metni ayrı bir içerik
sözlüğünde tutulur — `apps/web/app/home.content.ts`'teki mevcut `TR`
deseninin (JSX'ten ayrı, tek objede toplanmış metin) her yeni sayfaya
uygulanması, ileride `EN` sözlüğü eklendiğinde JSX'e dokunmadan
genişleyebilmesi için yeterlidir. Routing/dil değiştirici tasarımı bu
belgenin kapsamı DIŞINDA (owner'ın "bunu tasarlama, sonraki karar" talimatı
gereği) — yalnız "içerik sözlük deseni" bir mimari ön koşul olarak
belirtiliyor.

---

## 1. Ana Sayfa — MVP

**İş:** Konumlandırmayı bir bakışta anlat (ajans/kurumsal), gerçek ürünü
göster (canlı render, ekran görüntüsü değil), güven kur, builder'a veya
fiyatlandırmaya yönlendir.

**Hedef kitle:** Birincil — ajans ve kurumsal karar vericiler. İkincil —
KOBİ/freelancer (ön kapı değiller ama reddedilmezler).

| # | Bölüm | Bileşenler | Durum |
|---|---|---|---|
| 1 | Header (nav) | §3.3 basit nav + dropdown | MVP |
| 2 | Hero: kicker + başlık + alt başlık + çift CTA + canlı imza demo kartı + güven şeridi | §3.1 buton, §3.5 rozet, §6 glow reçetesi — **mevcut `page.tsx`/`home.module.css` zaten bunu uyguluyor, değişiklik gerekmez** | MVP (yapıldı) |
| 3 | Nasıl çalışır (3 adım: tasarla → önizle → dağıt) | §3.7 bölüm başlığı + 3 sütunlu ikon+metin kartı | MVP |
| 4 | Şablon önizleme şeridi (3 şablon, gerçek render, "Galeriye git") | §3.2 kart | MVP |
| 5 | Ajans / Kurumsal ayrımı — 2 büyük kart, ilgili sayfaya yönlendirir | §3.2 kart, §3.1 ghost buton | MVP |
| 6 | Fiyatlandırma özeti (4 plan adı + başlangıç fiyatı, "Tüm fiyatlandırmayı gör") | §3.9 fiyat kartı (özet versiyon, madde listesi yok) | MVP |
| 7 | Kanıt bloğu — doğrulanabilir iddialar (6 istemci test matrisi, koltuk bazlı şeffaf fiyat, kopyala/indir mekanizması) | §3.5 rozet, mevcut `trustItems` deseni | MVP |
| 8 | Müşteri logo bulutu | §3.11 logo cloud | **LATER** — ilk referans müşteriden logo izni alınana kadar hiç yayınlanmaz |
| 9 | Testimonial | §3.8 testimonial kartı | **LATER** — gerçek alıntı olmadan boş/uydurma içerik yayınlanmaz (CodeTwo dersi, bkz. design-system §0) |
| 10 | Kısa SSS özeti (3-4 soru + "Tüm SSS") | §3.10 akordeon (kısaltılmış) | **LATER** — MVP'de tam SSS sayfasına link yeterli, ana sayfada tekrar etmek zorunlu değil |
| 11 | Son CTA bandı | §3.1 buton | MVP |
| 12 | Footer | §3.4 footer | MVP |

**Birincil dönüşüm eylemi:** "Builder'ı Ücretsiz Dene" (deneme login
gerektirmez — yalnız export login+ödeme gerektirir, `CLAUDE.md
§Fiyatlandırma`'daki `EXPORT_REQUIRES_AUTH` ayrımı).

---

## 2. Ürün / Özellikler — MVP

**İş:** Ne yaptığımızı somut anlat (alan zenginliği, Outlook uyumu, export
mekanizması); rakiplerin vitrin özelliği olan ama bizde olmayan şeyleri
(analitik, dizin senkronizasyonu) **hiç anmadan** atla.

**Hedef kitle:** Teknik değerlendirici (IT'ye danışan marketing/HR
kişisi) + karar verici.

| # | Bölüm | Bileşenler | Durum |
|---|---|---|---|
| 1 | Header | §3.3 | MVP |
| 2 | Hero (kısa başlık + alt başlık, görsel yok) | §3.7 | MVP |
| 3 | Alan zenginliği — ad/ünvan/şirket/2 telefon/e-posta/web/adres/CTA/yasal metin/avatar/logo/el imzası listesi | §3.2 kart grid (ikon + kısa etiket, 3-4 sütun) | MVP |
| 4 | Outlook uyumu vurgusu — table-based layout, inline stil, 6 istemci test matrisi | §3.5 rozet + kısa açıklama paragrafı | MVP — bu, rakiplerin çoğunun hiç bahsetmediği en somut farklılaştırıcı |
| 5 | Marka tutarlılığı (bir imza tasarla, ekip aynı markayla imza atsın) | §3.7 | MVP |
| 6 | Görsel/CDN politikası (kalıcı URL, retina, dark-mode güvenli logo) | Kısa madde listesi, ayrı bölüm değil | MVP (kısa) — derin teknik ayrıntı kurulum rehberlerine bırakılır |
| 7 | Export mekanizması (kopyala + `.htm` indir, panoya `text/html` olarak) | §3.7 + küçük demo görseli/GIF (statik açıklama yeterli, GIF LATER) | MVP metin, GIF/animasyon **LATER** |
| 8 | Merkezi şablon uygulama (organizasyon geneline tek şablon) | §3.7 | **LATER olarak NOTLANIR** — bu `CLAUDE.md §4 Haftalık Plan`'da Hafta 4 kontrol noktası; sayfa MVP lansmanında bu özellik henüz yoksa bölüm ya çıkarılır ya da "yakında" etiketiyle net şekilde işaretlenir, ör olmayan bir özellik "şu an var" gibi anlatılmaz |
| 9 | CTA bandı | §3.1 | MVP |
| 10 | Footer | §3.4 | MVP |

**Birincil dönüşüm eylemi:** "Builder'ı Dene" (ikincil: "Fiyatlandırmayı
Gör").

**`CLAUDE.md §YAPILMAYACAKLAR` çapraz kontrolü:** Bu sayfada asla şu
maddeler geçmez — imza analitiği/tıklama takibi/banner kampanyaları,
Google Workspace/Entra ID dizin senkronizasyonu, Outlook eklentisi/server-
side transport rule, onay akışları, public API, AI imza üretimi. Bunlar
rakiplerin (WiseStamp, MySignature, CodeTwo) vitrin özellikleri — bizim
listemizde yok ve sayfa bunun etrafından dolanmaz, sessizce atlar.

---

## 3. Şablon Galerisi — MVP

**İş:** Şablonları gerçek render ile göster (screenshot değil), her
şablonu SEO için ayrı URL'de sun, builder'a şablon seçimiyle geçiş yaptır.

**Hedef kitle:** Karar verme aşamasındaki her kitle + SEO trafiği ("outlook
e-posta imza şablonu" gibi aramalar).

| # | Bölüm | Bileşenler | Durum |
|---|---|---|---|
| 1 | Header | §3.3 | MVP |
| 2 | Başlık + kısa açıklama — **şeffaflık notu**: "Şu an 3 özenle tasarlanmış şablon var, motor oturdukça büyür" | §3.7 | MVP |
| 3 | Galeri grid — 3 şablon kartı, her biri gerçek renderer çıktısı (aynı `demoSignatureHtml()` deseninin şablon-parametreli hali) | §3.2 kart, §4 grid `repeat(auto-fit, minmax(280px,1fr))` | MVP |
| 4 | Her şablon için ayrı detay sayfası (`/sablonlar/[id]`) — büyük önizleme + "hangi durumda kullanılır" kısa metin + "Bu şablonla başla" CTA | §3.2, §3.1 | MVP |
| 5 | CTA bandı | §3.1 | MVP |
| 6 | Footer | §3.4 | MVP |

**Birincil dönüşüm eylemi:** "Bu şablonla başla" → builder, seçilen
`templateId` ile ön dolu.

**`CLAUDE.md §YAPILMAYACAKLAR` çapraz kontrolü:** "3'ten fazla şablon"
yasağı — bu sayfa o sınırı en görünür şekilde taşıyan sayfa; grid 3
kartla tasarlanır, "daha fazla şablon yakında" gibi bir vaat de verilmez
(motor oturmadan tarih taahhüdü yok).

---

## 4. Fiyatlandırma — MVP

**İş:** Fiyatı ilk ekranda, saklamadan, tablo halinde göster. Rakip
araştırmasının en net dersi: Exclaimer, WiseStamp, MySignature, CodeTwo
— dördü de fiyatı ya tamamen gizliyor ya "contact sales" arkasına
koyuyor. Mailmyra bunun tam tersini yapıyor.

**Hedef kitle:** Tüm segmentler, ama sayfa tasarımı ajans/kurumsal
büyüklüğüne öncelik verir (koltuk sayısı arttıkça fiyat tablosu daha
belirgin).

| # | Bölüm | Bileşenler | Durum |
|---|---|---|---|
| 1 | Header | §3.3 | MVP |
| 2 | Başlık + "koltuk başına fiyatlandırma" ilkesi tek cümlede | §3.7 | MVP |
| 3 | Fiyat kartları — Pro $5/ay sabit · Team $1/koltuk (min 5) · Business kademeli (10–49: $0.83 · 50–199: $0.75 · 200+: görüşmeli) · Agency havuzlanmış+white-label "Bize ulaşın" | §3.9 fiyat kartı — **kademeli fiyat üç satır halinde gösterilir, tek rakama indirilmez** | MVP |
| 4 | Export kısıtı açıklaması — "Tasarla ve önizle her zaman ücretsiz. Kopyala/indir hesap gerektirir" | §3.7 kısa paragraf | MVP — `EXPORT_REQUIRES_AUTH` iş kuralının kullanıcıya görünen yüzü |
| 5 | Manuel faturalama/ödeme notu — "Şu an elle faturalandırıyoruz, kart bilgisi saklamıyoruz" | §3.7 kısa paragraf | MVP — dürüstlük: self-serve otomatik ödeme YOK (`CLAUDE.md §YAPILMAYACAKLAR`), bunu gizlemek güven kırar |
| 6 | Fiyatlandırmaya özel kısa SSS (3-4 soru: "Koltuk sayısını sonra artırabilir miyim", "Yıllık fatura var mı") | §3.10 akordeon (kısaltılmış) | MVP |
| 7 | CTA: "Bize Ulaşın" (satış görüşmesi, form) | §3.1 | MVP |
| 8 | Footer | §3.4 | MVP |

**Birincil dönüşüm eylemi:** İletişim formu / "Bize Ulaşın" — **self-serve
ödeme butonu YOK**, bu bilinçli bir tasarım kararı (`CLAUDE.md`: "otomatik
abonelik sistemi YAZILMAYACAK", "ilk 10 müşteri manuel faturalanacak").

**`CLAUDE.md §YAPILMAYACAKLAR` çapraz kontrolü:** Kupon/indirim kutusu
yok — kademeli fiyat elle uygulanır, sayfada otomatik hesaplayan bir
"kaç koltuk?" input'u bile MVP'de opsiyonel/LATER (basit statik tablo
MVP için yeterli, interaktif hesaplayıcı **LATER**).

---

## 5. Ajanslar İçin — MVP

**İş:** Ajansın kendi müşterileri için tek panelden yönetim + white-label
+ havuzlanmış koltuk hikâyesini anlat. "Tek satışta 200 koltuk" mantığını
somutlaştır.

**Hedef kitle:** Reklam/kreatif ajans karar vericisi (CLAUDE.md'nin
belirttiği ön kapı kitlesi — Voldi Creative'in kendisi de bu profil).

| # | Bölüm | Bileşenler | Durum |
|---|---|---|---|
| 1 | Header | §3.3 | MVP |
| 2 | Hero — ajansa özel başlık ("Her müşteriniz için tek panelden marka tutarlılığı") | §3.7 | MVP |
| 3 | Senaryo anlatımı — havuzlanmış koltuk + white-label açıklaması, "bir satışta çok koltuk" ekonomisi | §3.7 + 3 madde kart | MVP |
| 4 | Nasıl çalışır (ajans özelinde: müşteri başına marka ayarı, tek panelden yönetim) | §3.2 kart | MVP — **not:** "merkezi şablon uygulama" Hafta 4 özelliği; bu bölüm o özelliğe dayanıyorsa Ürün sayfasındaki aynı kısıtla launch sırasında gözden geçirilir |
| 5 | Fiyatlandırma özeti (Agency satırına link) | §3.9 (özet) | MVP |
| 6 | Voldi Creative köken hikâyesi ("kendi ihtiyacımızdan doğdu") | §3.7 | **LATER** — güçlü bir otantiklik hikâyesi ama MVP'nin satış için zorunlu değil, ayrı bir "Hakkımızda" içeriği gerektirir |
| 7 | Ajans logo bulutu | §3.11 | **LATER** — izin alınana kadar |
| 8 | CTA: "Ajans demosu iste" | §3.1 | MVP |
| 9 | Footer | §3.4 | MVP |

**Birincil dönüşüm eylemi:** İletişim/demo talebi formu.

---

## 6. Kurumsal İçin — MVP

**İş:** Güven kur (test matrisi, şeffaf kademeli fiyat), IT/marketing
karar vericisine "kontrolü sen tutuyorsun" hissi ver — ama sahip
olmadığımız sertifikaları (SOC2, ISO, HIPAA gibi rakiplerin vitrin
rozetleri) **asla iddia etme**.

**Hedef kitle:** 50–200+ koltuklu şirketlerde IT/marketing/HR karar
vericisi.

| # | Bölüm | Bileşenler | Durum |
|---|---|---|---|
| 1 | Header | §3.3 | MVP |
| 2 | Hero — kurumsal mesaj ("Aynı e-posta. Daha güçlü kimlik.") | §3.7 | MVP |
| 3 | Güven bloğu — doğrulanabilir iddialar: 6 istemci test matrisi, table-based Outlook uyumu, koltuk bazlı şeffaf fiyat | §3.5 rozet | MVP — **sertifika rozeti YOK**, elimizde olmayan bir uygunluk iddiası (SOC2/ISO/HIPAA gibi) konmaz; KVKK metinleri Hafta 4'te hazır olduğunda oraya link verilir, rozet olarak değil |
| 4 | Kademeli fiyat detayı (Business planı, 3 basamak) | §3.9 (özet) | MVP |
| 5 | Toplu kurulum / CSV içe-dışa aktarma | §3.7 | **LATER** — `CLAUDE.md §4 Haftalık Plan`'da Hafta 4 özelliği, henüz kodlanmadan vaat edilmez |
| 6 | Kanıt/testimonial | §3.8 | **LATER** — gerçek müşteri alıntısı olmadan yayınlanmaz |
| 7 | CTA: "Kurumsal demo iste" | §3.1 | MVP |
| 8 | Footer | §3.4 | MVP |

**Birincil dönüşüm eylemi:** İletişim/demo talebi formu.

**`CLAUDE.md §YAPILMAYACAKLAR` çapraz kontrolü:** Bu sayfa kurumsal
alıcıya en çok hitap eden sayfa olduğu için en yüksek risk taşıyor —
Google Workspace/Entra ID dizin senkronizasyonu, onay akışları, public
API gibi "kurumsal olgunluk" işaretleri rakiplerde var ama bizde yok;
metin bunları hiç anmaz, olmayan bir şeyin yokluğunu açıklamaya çalışmaz.

---

## 7. Kurulum Rehberleri — MVP (öncelikli)

**İş:** En çok aranan SEO içeriği + destek yükünü azaltan self-service
doküman. `CLAUDE.md` bunu açıkça öncelikli işaretliyor.

**Hedef kitle:** Son kullanıcı (imzasını e-posta istemcisine kuran
çalışan), yüksek SEO niyeti taşıyan arama trafiği.

| # | Bölüm | Bileşenler | Durum |
|---|---|---|---|
| 1 | Header | §3.3 | MVP |
| 2 | Rehber index — 6 kart, test matrisindeki 6 istemciyle birebir: Outlook Classic (Windows), Yeni Outlook/Outlook.com, Gmail web, Gmail mobil, Apple Mail, iOS Mail | §3.2 kart grid | MVP |
| 3 | Her istemci için ayrı sayfa (`/kurulum/[istemci]`) — numaralı adım listesi, `.htm` indirme veya panoya kopyalama talimatı | §3.7 | MVP metin |
| 4 | Adım görselleri/ekran görüntüleri | — | **LATER** — gerçek ürün arayüzünden alınmış ekran görüntüsü gerekir, placeholder/mockup görsel yayınlanmaz |
| 5 | "Yardım mı lazım?" CTA → İletişim | §3.1 | MVP |
| 6 | Footer | §3.4 | MVP |

**Birincil dönüşüm eylemi:** Başarılı kurulum (dolaylı) + İletişim'e
dönüş oranı düşük olmalı (rehberin başarı ölçütü budur).

---

## 8. SSS — MVP

**İş:** Tekrarlayan soruları tek yerde topla, destek yükünü azalt.

**Hedef kitle:** Karar aşamasındaki + kurulum aşamasındaki tüm kullanıcılar.

| # | Bölüm | Bileşenler | Durum |
|---|---|---|---|
| 1 | Header | §3.3 | MVP |
| 2 | Başlık | §3.7 | MVP |
| 3 | Kategorilere ayrılmış statik liste (Genel, Fiyatlandırma, Teknik/Outlook, Hesap) | §3.10 akordeon | MVP |
| 4 | Arama kutusu (istemci taraflı filtre) | Form alanı (§3.6 varyantı) | **LATER** — soru sayısı azken gereksiz, liste büyüyünce eklenir |
| 5 | "Sorunuz mu var?" CTA → İletişim | §3.1 | MVP |
| 6 | Footer | §3.4 | MVP |

**Birincil dönüşüm eylemi:** Dolaylı — kendi kendine yanıt bulma oranı.

---

## 9. İletişim — MVP (satış kapısı)

**İş:** Otomatik ödeme olmadığı için bu sayfa fiilen "satın alma" akışının
kendisi — Fiyatlandırma sayfasındaki her CTA burada biter.

**Hedef kitle:** Satın almaya hazır veya soru soran her kitle.

| # | Bölüm | Bileşenler | Durum |
|---|---|---|---|
| 1 | Header | §3.3 | MVP |
| 2 | Başlık + kısa metin (kimin yanıtlayacağı, beklenen yanıt süresi — Hüseyin/Voldi Creative tek kişilik, dürüst beklenti yönetimi) | §3.7 | MVP |
| 3 | Form: ad, e-posta, şirket, tahmini koltuk sayısı, mesaj | §3.6 (koyu varyant) | MVP |
| 4 | Doğrudan e-posta alternatifi (mailto) | §3.7 | MVP |
| 5 | Footer | §3.4 | MVP |

**Birincil dönüşüm eylemi:** Form gönderimi.

**Not (Explicit-permission sınırı bu belgenin kapsamı dışında ama
hatırlatma):** Form implementasyonu yapılırken kullanıcının kişisel
verisini toplayan gerçek bir form olacağı için KVKK metnine link zorunlu
(bkz. §10) — bu belge yalnız yerleşimi/bileşeni tanımlıyor, form işleme
mantığı ayrı bir iştir.

---

## 10. KVKK / Gizlilik / Şartlar — MVP (iskelet)

**İş:** Yasal zorunluluk. **Bu belge hukuki metin YAZMAZ** — yalnız sayfa
iskeletini tanımlar. Gerçek metin `CLAUDE.md §4 Haftalık Plan`'da Hafta
4'e ait ve owner/hukuki onay gerektirir.

**Hedef kitle:** Yasal uyum arayan ziyaretçi + kurumsal alıcının hukuk
departmanı.

| # | Bölüm | Bileşenler | Durum |
|---|---|---|---|
| 1 | Header | §3.3 | MVP |
| 2 | 3 ayrı sayfa: KVKK Aydınlatma Metni, Gizlilik Politikası, Kullanım Şartları | §3.7 (düz metin sayfası, akordeon/kart yok — hukuki metin gövdesi tek sütun `--maxw` ile sınırlı, `--step-body` boyutunda) | MVP iskelet — **içerik owner onayı olmadan yayınlanmaz** |
| 3 | "Son güncelleme" tarihi | §3.7 caption | MVP |
| 4 | Footer | §3.4 | MVP |

**Birincil dönüşüm eylemi:** Yok — bilgilendirme sayfası, dönüşüm hedefi
taşımaz.

---

## Kapsam Dışı Bırakılanlar (bilerek, `CLAUDE.md §YAPILMAYACAKLAR` gereği)

- **Blog:** `CLAUDE.md §Site Yapısı`'nda "yapı kurulur, yazılar sonra"
  deniyor ve `§YAPILMAYACAKLAR`'da "blog yazıları → lansmandan sonra"
  net. Bu plan blog'u 10 sayfalık listeye dahil ETMİYOR — istenirse boş
  bir `/blog` index'i iskelet olarak MVP sonrasına bırakılır, bu belgenin
  kapsamında değil.
- **Otomatik ödeme/checkout akışı:** Fiyatlandırma ve İletişim sayfaları
  bunun yerine satış-destekli form akışı kullanır (bkz. §4, §9).
- **Şablon sayısı sınırı:** Galeri sayfası 3 şablonla tasarlanır (§3),
  büyütme vaadi verilmez.
- **Dizin senkronizasyonu, Outlook eklentisi, analitik/takip, onay
  akışları, public API, AI imza üretimi:** Ürün, Kurumsal ve Ajanslar
  sayfalarının hiçbirinde anılmaz (§2, §5, §6'daki çapraz kontrol
  notları).

## Özet Tablo — MVP/LATER Dağılımı

| Sayfa | Sayfa durumu | LATER işaretli bölüm sayısı |
|---|---|---|
| Ana sayfa | MVP | 3 (logo cloud, testimonial, SSS özeti) |
| Ürün/Özellikler | MVP | 2 (merkezi şablon uygulama, export GIF) |
| Şablon galerisi | MVP | 0 |
| Fiyatlandırma | MVP | 1 (interaktif koltuk hesaplayıcı) |
| Ajanslar için | MVP | 2 (köken hikâyesi, logo cloud) |
| Kurumsal için | MVP | 2 (CSV toplu aktarım, testimonial) |
| Kurulum rehberleri | MVP | 1 (ekran görüntüleri) |
| SSS | MVP | 1 (arama kutusu) |
| İletişim | MVP | 0 |
| KVKK/Gizlilik/Şartlar | MVP (iskelet) | içerik owner onayına bağlı |

**10/10 sayfa MVP, 0 sayfa tamamen LATER.** LATER işaretleri yalnız
bölüm seviyesinde — çoğunlukla ya henüz kodlanmamış bir özelliğe (Hafta 4
maddeleri) ya da henüz elimizde olmayan gerçek içeriğe (logo izni,
testimonial, ekran görüntüsü) bağlı, süsleme değil.
