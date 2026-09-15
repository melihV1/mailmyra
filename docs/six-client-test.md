# 6 İstemci Render Testi — protokol

CLAUDE.md'de **pazarlıksız** diye işaretli tur. Bu belge onu tekrarlanabilir
hale getirir: her turda aynı adımlar, aynı bakılacaklar, aynı sonuç tablosu.

**Ne zaman koşulur:** renderer'a, şablonlara, ikon üretimine ya da marka
bindirmesine dokunulduğunda. Panel/builder arayüz değişiklikleri bu turu
gerektirmez — imza HTML'i değişmiyorsa çıktı da değişmez.

**Kapsam:** 6 şablon × 6 istemci. Her hücre "geçti / kusurlu / kırık".
(2026-08-26'da 3 yeni şablon onaylandı: `divider-columns`, `photo-first`,
`cta-banner`. Tur 3'e kadar kapsam 3 şablondu — o yüzden eski tablolar üç satır.)

**Şablondan bağımsız EKSENLER de sınanır** (2026-09-15'te eklendi): monogram,
isim harf aralığı (`nameSpacing`), aksan bandı/paneli (`accentBand`). Bunlar
şablon satırlarına sığmaz, kendi tablolarında raporlanır.

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

### Tur 3 — ✅ GEÇTİ (6/6)

Tur tarihi: 2026-08-18 ·  Test eden: Hüseyin ·  Commit: `2668d5b` (canlı derleme)
Malzeme: canlı panelde kayıtlı üç imza (bkz. §1 "daha gerçekçi alternatif"),
**kopyala** yoluyla alındı.

| Şablon | Outlook Classic | Yeni Outlook | Gmail web | Gmail mobil | Apple Mail | iOS Mail |
|---|---|---|---|---|---|---|
| classic-horizontal | geçti | geçti | geçti | geçti | geçti | geçti |
| stacked-minimal | geçti | geçti | geçti | geçti | geçti | geçti |
| card-bordered | geçti | geçti | geçti | geçti | geçti | geçti |

**CLAUDE.md'nin Hafta 1 kapısı bu turla KAPANDI.** Üç şablonun üçü de altı
istemcide kusursuz çizildi — Outlook Classic dahil. Word motorunun
tanımadığı `max-width`, sızan tablo kenarlığı (2512 bug'ı) ve kaydırdığı
sütunlar için alınan önlemler sahada doğrulandı.

⚠️ **`.htm` indirme yolu bu turda ayrıca doğrulanmadıysa hâlâ açık.** HTML
gövdesi kopyalananla aynı (`wrapExportDoc` yalnız `<!doctype>` +
`<meta charset="utf-8">` sarar), yani şablon render'ı zaten kanıtlandı;
sınanmamış olan Outlook Classic'in `%APPDATA%\Microsoft\Signatures`
kurulum yolu — kurulum rehberlerinde anlatacağımız adım ve toplu zip
çıktısının kullandığı sarmalayıcı.
⚠️ Builder indirme adını sabit veriyor (`mailmyra-signature`); Outlook imza
adını dosya adından okuduğu için üç imza da aynı adla görünür. Tek satırlık
düzeltme (`BuilderClient.tsx`, `savedName` zaten orada), sıradaki derlemeye
bindirilecek.

### Tur 4 — ⏳ SÜRÜYOR (1/6 istemci tamam)

Tur tarihi: 2026-09-15 · Commit: `eda2c97` (main = origin/main)
Malzeme: `scripts/send-test-signatures.mts` ile üretilen 6 taban + 12 varyant.
Varyantlar `accentBand`/`nameSpacing`/monogram eksenlerini ayrı ayrı izole eder.

⚠️ **Malzemede bir tuzak çıktı, kayda geçsin:** `brand-fixture/avatar.png`
MARKA MAVİSİNİN KENDİSİ (mavi kare, beyaz "EM"). Aksan paneli de marka
renginde olduğu için, varsayılan ayarla panel avatarın üstünde GÖRÜNMEZ ve
ölçülemez. Ölçüm varyantlarında marka rengi koyu kırmızıya (`#8B1A1A`)
alındı — marka rengi zaten kullanıcı ayarı, meşru bir konfigürasyon.
Sonraki turlarda aynı tuzağa düşülmesin.

| Şablon | Outlook Classic | Yeni Outlook | Gmail web | Gmail mobil | Apple Mail | iOS Mail |
|---|---|---|---|---|---|---|
| classic-horizontal | | | | | geçti | |
| stacked-minimal | | | | | | |
| card-bordered | | | | | geçti | |
| divider-columns | | | | | geçti | |
| photo-first | | | | | geçti | |
| cta-banner | | | | | | |

Eksenler:

| Eksen | Apple Mail | Outlook Classic | Kalan 4 |
|---|---|---|---|
| Aksan çerçevesi yatayda simetrik mi | **geçti** — sol/sağ boşluk eşit | | |
| Aksan bandı kartın üst kenarlığını değiştiriyor mu | **geçti** — bantlı kartta üst kenarlık yok, bantsız kontrolde var | | |
| `em` harf aralığı uygulanıyor mu | **geçti** — aynı isim ≈371px'e karşı ≈327px | | |
| Geniş aralıklı uzun isim 600px'te sarıyor mu | **geçti** — sarmıyor | | |
| Monogram varken panel çizilmiyor mu | **geçti** — disk var, arkasında panel yok | | |
| Panelin dikey taşması | ölçüldü: panel satır boyunca uzayıp tam boy marka sütunu oluyor — **KARAR BEKLİYOR** (kusur değil, tasarım tercihi) | | |

**Apple Mail (2026-09-15, macOS Mail):** altı şablonun dördü ve beş eksen
temiz. Yerleşim bozulmadı, sütun kayması yok, renkler ve bağlantılar yerinde,
tablo kenarlığı sızmadı. `stacked-minimal` ve `cta-banner` bu oturumda gözle
teyit edilmedi (kaydırma sırasında atlandı) — kapatılmadan önce bakılmalı.

🔴 **AÇIK — turu bitiren istemci Outlook Classic.** Üç varsayım YALNIZ orada
sınanabilir ve hiçbiri dize testiyle kapatılamaz:
1. Word motoru `<td width>`'i content-box mı sayıyor (çerçevenin simetrisi buna bağlı).
2. `letter-spacing` `em` biriminde uygulanıyor mu (monogramın `0.02em`'i de aynı varsayımda).
3. Monogram, uzaktan görseller engelliyken görünüyor mu (varlık sebebi).

Gmail web/mobil ve iOS Mail de açık.

### Boş şablon (sonraki turlar için kopyala)

Tur tarihi: ……  ·  Test eden: ……  ·  Commit: ……

| Şablon | Outlook Classic | Yeni Outlook | Gmail web | Gmail mobil | Apple Mail | iOS Mail |
|---|---|---|---|---|---|---|
| classic-horizontal | | | | | | |
| stacked-minimal | | | | | | |
| card-bordered | | | | | | |

Kusur bulunursa: istemci + şablon + ekran görüntüsü + hangi alanın bozulduğu.

## 4. Riskler — Tur 3'te DOĞRULANDI (2026-08-18)

Tur 3 öncesinde şu üçü açık risk olarak yazılmıştı; **üçü de Outlook
Classic'te temiz çıktı.** Kayda geçiyorlar ki şablonlara dokunulduğunda
neye bakılacağı bilinsin:

- **`card-bordered` kart kenarlığı ve sol marka şeridi** — `<td>` kenarlığı
  ve dolgusuyla kuruluyor. Beklenen kusur şeridin Word motorunda tam
  yükseklik boyanmamasıydı; boyandı.
- **Sabit piksel genişlikler** — Outlook `max-width` tanımadığı için
  `card-bordered` (460/520/580) ve `stacked-minimal` (300/340/380) sabit
  genişlik taşıyor, `classic-horizontal` ise `max-width:600px`. Üçü de dar
  okuma bölmesinde taşmadı.
- **Şablon 2 ve 3'ün ilk turu** — geçti.

## 5. Geçmiş turlar

- **Tur 1 — 2026-07-24:** `classic-horizontal`, Hafta 1 çıktıları (bkz.
  `docs/backlog.md` §Test Kayıtları).
- **Tur 2 — 2026-07-25:** logo + el imzası + mono ikonlar, gerçek CDN.
- **Tur 3 — 2026-08-18: ✅ 6/6 GEÇTİ.** 3 şablon × 6 istemci, kopyala
  yoluyla, canlı panelden gerçek veriyle. CLAUDE.md'nin Hafta 1 kapısı
  kapandı. Bkz. §3.
