# Backlog ve Test Kayıtları

Kapsam disiplini: buraya yazılan hiçbir madde, sırası gelmeden yapılmaz.
(CLAUDE.md "Yapılmayacaklar" listesi her zaman önceliklidir.)

---

## Hafta 2'ye devredilen işler

- [ ] **Builder'a renk kontrastı uyarısı.** Kullanıcı okunmaz bir
  metin/zemin kombinasyonu seçerse (ör. koyu metin + koyu zemin) builder
  uyarı göstersin. Renderer hatası değil, builder UX işi.
  `readableTextOn()` (packages/renderer/src/utils/color.ts) temel alınabilir.
  _Kaynak: Hafta 1 koyu-zemin önizleme gözlemi (2026-07-24)._

- [ ] **CDN geçişi sonrası Outlook web görsel testi tekrarı.** Fixture'lardaki
  geçici `placehold.co` görselleri `cdn.mailmyra.com`'a taşınınca Outlook
  web'de görsel engelleme/yükleme davranışı yeniden test edilecek.

---

## Test Kayıtları

### Tur 1 — 2026-07-24 (classic-horizontal, Hafta 1 çıktıları)

| İstemci | Sonuç | Not |
|---|---|---|
| Gmail web (Mac) | ✅ temiz | |
| Gmail mobil (iPhone) | ✅ temiz | |
| Apple Mail (Mac) | ✅ temiz | |
| iOS Mail (iPhone) | ✅ temiz | |
| Outlook web | ✅ temiz | Görseller varsayılan engelli; "engellenen bağlantıları etkinleştir" sonrası doğru — normal davranış |
| Outlook Classic (Windows) | ⏳ ertelendi | Aşağıdaki karara bak |

Yerleşim, renkler, linkler, CTA butonu, ayraçlar: hepsi doğru.

**Karar (Hüseyin, 2026-07-24):** Outlook Classic testi ertelendi;
**Hafta 3 başlamadan önce** yapılacak. O zamana kadar **yeni şablon
yazılmayacak** (motor değişiklik riski taşırken şablon çoğaltılmaz).

### Hafta 2 kontrol noktası — 2026-07-24

Kullanıcı sıfırdan imza üretip kopyalayabiliyor — tarayıcıda (Chrome DevTools
MCP, gerçek dev sunucusu) uçtan uca doğrulandı: Bilgiler/Görseller/Sosyal/Stil
adımlarında canlı önizleme; PNG ve SVG yükleme CDN URL'ine dönüşüyor (SVG PNG/JPG'e
çevriliyor); kontrast uyarısı ve koyu zemin önizlemesi çalışıyor; taslak
localStorage'a kaydediliyor, sayfa yenilemede geri geliyor, Temizle onay sonrası
formu boşaltıyor. Export kapısı iki modda doğrulandı: `EXPORT_REQUIRES_AUTH=false`
iken kopyala "Kopyalandı" uyarısını gösteriyor ve `.htm` doğru table-based HTML
ile iniyor; `true` iken hem kopyala hem indir `/login` placeholder'ına
yönlendiriyor. Mobil düzen 375×812'de Düzenle/Önizle sekmeleri çalışıyor,
yatay taşma yok (`scrollWidth <= innerWidth` doğrulandı).
Not: Panoya kopyalanan `text/html` içeriğinin kendisi otomatik okunamadı
(tarayıcı clipboard-read izni engelliyor) — yalnızca başarı uyarısı gözlemlendi,
gerçek e-posta istemcisine yapıştırma testi elle yapılmalı.
