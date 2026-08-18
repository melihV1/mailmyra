# 6 İstemci Render Testi — protokol

CLAUDE.md'de **pazarlıksız** diye işaretli tur. Bu belge onu tekrarlanabilir
hale getirir: her turda aynı adımlar, aynı bakılacaklar, aynı sonuç tablosu.

**Ne zaman koşulur:** renderer'a, şablonlara, ikon üretimine ya da marka
bindirmesine dokunulduğunda. Panel/builder arayüz değişiklikleri bu turu
gerektirmez — imza HTML'i değişmiyorsa çıktı da değişmez.

**Kapsam:** 3 şablon (`classic-horizontal`, `stacked-minimal`,
`card-bordered`) × 6 istemci. Her hücre "geçti / kusurlu / kırık".

---

## 0. Otomatik ön kontrol (manuel tura girmeden)

Makinenin yakalayabileceğini makine yakalasın; manuel tur yalnız gözün
göreceği şeyler için harcanmalı.

```bash
npm test -w packages/renderer
```

`guardrails.test.ts` her şablon × fixture × ikon-modu için şunları zaten
doğruluyor: `<div>`/flex/grid/float/position YOK · `<style>`/`class` YOK ·
her `<table>` üzerinde `border="0"` + `border:none` (Outlook 2512 bug'ı) ·
SVG/WebP/data-uri/script YOK · her `<img>` `width` taşıyor · ikon
görselleri `width`+`height` taşıyor · yalnız web-safe font.

2026-08-17 ölçümü: en büyük çıktı **6KB** (Gmail kırpma sınırı ~102KB, bol
pay var), en geniş tablo **600px** (kural ~600px). `calc()`, CSS değişkeni,
`background-image` ve harici `<link>` hiçbir şablonda yok.

---

## 1. Malzemeyi üret

**İki mod var.** Postayı script'in yollaması SMTP ayarı ister; bu ayarlar
CANLI SUNUCUDA yaşıyor, geliştirme makinesinde yok. O yüzden pratikte
kullanılan mod dosya üretmek:

```bash
# Dosya modu (kimlik bilgisi gerektirmez — normal yol)
npx tsx scripts/send-test-signatures.mts --to <adres> --out ~/Desktop/mailmyra-6client-test \
  --icons https://cdn.mailmyra.com --assets https://cdn.mailmyra.com/brand-fixture

# Posta modu (yalnız MAIL_* ortamda tanımlıysa; değilse HATA verir, sessizce geçmez)
npx tsx scripts/send-test-signatures.mts --to <adres> \
  --icons https://cdn.mailmyra.com --assets https://cdn.mailmyra.com/brand-fixture
```

Dosya modu şablon başına bir `.htm` üretir. Bunlar hem Outlook'un
Signatures klasörüne doğrudan konulabilir hem de içerikleri bir postaya
yapıştırılıp kendine yollanabilir.

> ⚠️ **Görsel tuzağı.** Fixture'ların avatar/logo/el-imzası yolları
> GÖRECELİ (`/brand-fixture/...`). Panelin önizlemesinde çalışır çünkü aynı
> origin'dedir; **e-postada taban URL yoktur, kırık çıkar.** `--assets`
> vermezsen script uyarır. Görseller CDN'e yüklenmediyse ya `--fixture
> noLogo` ile görselsiz test et ya da kırık görselleri şablonun suçu sanma.

**Daha gerçekçi alternatif:** panelden **kendi kayıtlı imzanı** export et
(`Copy signature` / `Download .htm` / Senders → `Export zip`). Gerçek
müşteri verisinde görsel URL'leri her zaman CDN mutlak adresidir, yani
yukarıdaki tuzak hiç doğmaz. Şablon karşılaştırması için script, "müşteri
gerçekte ne alıyor" sorusu için kendi imzan.

---

## 2. İstemciler ve bakılacaklar

| # | İstemci | Nasıl açılır | Bu istemciye özel bakılacak |
|---|---|---|---|
| 1 | **Outlook Classic (Windows)** | Plesk sunucusuna RDP + M365 hesabı | **En kritik.** Word motoru: tablo kenarlığı sızıyor mu (2512 bug'ı), sütunlar kayıyor mu, `max-width` yok sayıldığı için kart taşıyor mu |
| 2 | **Yeni Outlook / Outlook.com** | Tarayıcı | Klasik'ten farklı motor; boşluklar ve buton dolgusu |
| 3 | **Gmail web** | Tarayıcı | Kırpma ("View entire message" çıkıyor mu), uzaktan görsel engeli |
| 4 | **Gmail mobil** | Telefon uygulaması | Yatay kaydırma, okunabilirlik, dokunma hedefleri |
| 5 | **Apple Mail (macOS)** | Mac | Font ikamesi, retina görsel netliği |
| 6 | **iOS Mail** | iPhone | Otomatik ölçekleme, mavi otomatik-link, koyu mod |

### Her istemcide ortak bakılacaklar

- **Yerleşim:** sütunlar kaymış mı, satırlar yapışmış mı, taşma var mı.
- **Görseller:** yükleniyor mu, boyutu doğru mu (2x yüklenip `width` ile
  küçültülüyor), engellenince yerleşim çökmüyor mu.
- **Bağlantılar:** e-posta `mailto:`, telefon `tel:`, site `https://` —
  tıklanıyor mu; istemci fazladan otomatik-link üretmiş mi.
- **Renk/kontrast:** marka rengi doğru, metin okunur.
- **Koyu mod:** istemci renkleri kendi çeviriyorsa imza kayboluyor mu;
  şeffaf PNG logo koyu zeminde eriyor mu (CLAUDE.md'nin bilinen riski).
- **CTA düğmesi:** dolgu ve renk duruyor mu, düz metne düşmüş mü.

---

## 3. Sonuç tablosu

### Tur 3 — DEVAM EDİYOR

Tur tarihi: 2026-08-18 ·  Test eden: Hüseyin ·  Commit: `2668d5b` (canlı derleme)
Malzeme: canlı panelde kayıtlı üç imza (bkz. §1 "daha gerçekçi alternatif"),
**kopyala** yoluyla alındı.

| Şablon | Outlook Classic | Yeni Outlook | Gmail web | Gmail mobil | Apple Mail | iOS Mail |
|---|---|---|---|---|---|---|
| classic-horizontal | — | geçti | geçti | geçti | geçti | geçti |
| stacked-minimal | — | geçti | geçti | geçti | geçti | geçti |
| card-bordered | — | geçti | geçti | geçti | geçti | geçti |

`—` = henüz denenmedi.

**5/6 geçti — kalan tek istemci turun bütün riskini taşıyor.** Geçen beşinin
render motoru Blink/WebKit (Gmail web/mobil, Apple Mail, iOS Mail) ya da
modern web görünümü (Yeni Outlook); table-based imzayı zaten sorunsuz
çizerler. CLAUDE.md'nin bu turu pazarlıksız yapmasının sebebi **Outlook
Classic**'in Word render motorudur ve o daha hiç açılmadı — `max-width`
tanımaz, tablo kenarlığı sızdırır (2512 bug'ı), sütun kaydırır.
**Kapı henüz geçilmedi; "6 istemci testi geçti" denemez.**

Ayrıca **`.htm` indirme yolu hiç denenmedi.** HTML gövdesi kopyalananla
aynı (`wrapExportDoc` yalnız `<!doctype>` + `<meta charset="utf-8">` sarar),
bu yüzden şablon render'ını yeniden sınamaz; sınadığı şey Outlook Classic'in
`%APPDATA%\Microsoft\Signatures` kurulum yoludur — kurulum rehberlerinde
anlatacağımız adım ve toplu zip çıktısının da kullandığı sarmalayıcı.
⚠️ Builder indirme adını sabit veriyor (`mailmyra-signature`); Outlook imza
adını dosya adından okuduğu için test sırasında dosyaları elle adlandır.

### Boş şablon (sonraki turlar için kopyala)

Tur tarihi: ……  ·  Test eden: ……  ·  Commit: ……

| Şablon | Outlook Classic | Yeni Outlook | Gmail web | Gmail mobil | Apple Mail | iOS Mail |
|---|---|---|---|---|---|---|
| classic-horizontal | | | | | | |
| stacked-minimal | | | | | | |
| card-bordered | | | | | | |

Kusur bulunursa: istemci + şablon + ekran görüntüsü + hangi alanın bozulduğu.

## 4. Bilinen riskler (2026-08-17 itibarıyla, henüz doğrulanmadı)

- **`card-bordered` kart kenarlığı ve sol marka şeridi** — Outlook Classic'te
  `<td>` kenarlığı ve dolgusuyla kuruluyor; Word motorunda şeridin tam
  yükseklik boyanmaması en olası kusur.
- **Sabit piksel genişlikler** — Outlook `max-width` tanımadığı için
  `card-bordered` (460/520/580) ve `stacked-minimal` (300/340/380) sabit
  genişlik taşıyor; `classic-horizontal` ise yalnız `max-width:600px`
  kullanıyor. Üçünü **yan yana** görmekte fayda var: dar istemci
  bölmesinde davranışları farklı olacak.
- **Şablon 2 ve 3 hiç test edilmedi** — bu tur onların ilk turu.

## 5. Geçmiş turlar

- **Tur 1 — 2026-07-24:** `classic-horizontal`, Hafta 1 çıktıları (bkz.
  `docs/backlog.md` §Test Kayıtları).
- **Tur 2 — 2026-07-25:** logo + el imzası + mono ikonlar, gerçek CDN.
- **Tur 3 — 2026-08-18, 5/6:** 3 şablon. Gmail web + Gmail mobil + Apple
  Mail + Yeni Outlook + iOS Mail kopyala yoluyla GEÇTİ. **Yalnız Outlook
  Classic bekliyor** (+ `.htm` indirme yolu). Bkz. §3.
