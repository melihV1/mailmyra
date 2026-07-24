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
