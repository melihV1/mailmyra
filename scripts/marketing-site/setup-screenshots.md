# Kurulum rehberi ekran görüntüleri — çekim listesi

30 görsel: 5 istemci × (5 adım + 1 sonuç). Rehber sayfaları
(`~/Desktop/mailmyra ham/setup-*.html`) bunları `<figure class="mm-sg-shot"
data-shot="…">` yer tutucularıyla bekliyor; görsel gelince `<figure>` içi
`<img>` ile değiştirilecek.

**Hedef klasör:** `assets/img/setup/` (henüz yok, oluşturulacak).
Dosya adları `data-shot` ile birebir aynı olmalı.

---

## Önce: hangi imzayla çekilecek

⚠️ **6 istemci testindeki imzaları KULLANMA.** İçlerinde gerçek veri var —
`melih@voldi.net`, `+90 533 476 95 08`, gerçek adres. Bu görseller halka
açık bir sitede yıllarca duracak; oraya gerçek kişisel iletişim bilgisi
konmaz.

**Yapılacak:** panelde tek bir **demo imzası** oluştur ve 30 görselin
hepsinde onu kullan. Önerilen içerik:

| Alan | Değer |
|---|---|
| Ad | Alex Morgan |
| Ünvan | Brand Director |
| Şirket | Northwind Studio |
| E-posta | alex@northwind.example |
| Telefon | +1 555 0142 |
| Web | northwind.example |

`.example` uzantısı RFC 2606 ile bu iş için ayrılmış — kimseye ait olamaz.
Şablon: **classic-horizontal** (en yaygın görünüm). Logo/avatar için Voldi
markası yerine nötr bir demo görsel kullan.

Tek imza, 30 görselin hepsinde aynı — okuyucu adım adım ilerlerken imzanın
değişmesi kafa karıştırır.

---

## Çekim kuralları (hepsi için geçerli)

- **2x çöz.** Retina ekranda çek, tema küçültecek. macOS'ta `Cmd+Shift+4`
  zaten 2x verir; Windows'ta ekran ölçeğini %200 yap.
- **Pencereyi kırp, masaüstünü değil.** Yalnız ilgili panel/diyalog görünsün.
  macOS: `Cmd+Shift+4` sonra `Space` → pencere. Windows: `Alt+PrtScn`.
- **Aynı genişlik.** Bir istemcinin 6 görüntüsü aynı pencere boyutunda
  çekilsin, yoksa sayfada zıplarlar.
- **Açık tema.** İstemci arayüzünü açık modda tut (imzanın kendisi ayrı
  konu). Beş rehber arasında tutarlılık için.
- **Kişisel içerik temizle.** Gelen kutusu listesi, diğer e-postalar, hesap
  adı, profil fotoğrafı görünmesin. Gerekirse yeni/temiz bir profil kullan.
- **İmleci dahil etme**, ama tıklanacak yeri vurgulamak gerekiyorsa çekimden
  sonra tek bir dikdörtgen kutu ile işaretle (aynı renk, aynı kalınlık).
- **PNG**, sıkıştırılmış. Uzun kenar 1600px'i geçmesin.

---

## 01 · Outlook Classic (Windows) — `outlook-classic-*`

En kritik rehber. RDP'de M365 hesabıyla.

| Dosya | Ne görünecek |
|---|---|
| `outlook-classic-step-01.png` | Mailmyra builder'ı, sağ kolondaki **Copy signature** düğmesi net görünür halde. Önizleme kartı da kadrajda olsun ki okuyucu neyi kopyaladığını görsün. |
| `outlook-classic-step-02.png` | Outlook'ta **File → Options → Mail** ekranı, **Signatures…** düğmesi görünür. |
| `outlook-classic-step-03.png` | Signatures diyaloğu, **New** ile ad verilmiş, düzenleme kutusuna imza yapıştırılmış hâli. |
| `outlook-classic-step-04.png` | Aynı diyalog, sağ üstteki **New messages** ve **Replies/forwards** açılırları imza seçili. |
| `outlook-classic-step-05.png` | Yeni ileti penceresi, imza gövdede duruyor. |
| `outlook-classic-result.png` | **Alınan** iletide imza — gönderilen değil. Görseller yüklenmiş, tablo tek kolona düşmemiş, kenarlık sızmamış. Bu görsel rehberin "böyle görünmeli" kanıtı. |

---

## 02 · Yeni Outlook — `outlook-new-*`

Tarayıcıda `outlook.office.com` yeter.

| Dosya | Ne görünecek |
|---|---|
| `outlook-new-step-01.png` | Aynı builder görüntüsü, **Copy signature**. (01'in aynısı olabilir, ama ayrı dosya olarak kaydet.) |
| `outlook-new-step-02.png` | Sağ üstteki dişli → **Accounts → Signatures** ekranı. |
| `outlook-new-step-03.png` | **New signature**, ad verilmiş, imza yapıştırılmış editör. |
| `outlook-new-step-04.png` | Varsayılan seçiciler (yeni ileti + yanıt) ve **Save** düğmesi. |
| `outlook-new-step-05.png` | Yeni ileti, imza yerinde. |
| `outlook-new-result.png` | Alınan iletide imza. |

---

## 03 · Gmail — `gmail-*`

Masaüstü tarayıcı. Gmail imza editörü yalnız webde var.

| Dosya | Ne görünecek |
|---|---|
| `gmail-step-01.png` | Builder + **Copy signature**. |
| `gmail-step-02.png` | Dişli → **See all settings**, **General** sekmesi açık. |
| `gmail-step-03.png` | **Signature** bölümüne kaydırılmış hâl, **Create new** düğmesi. |
| `gmail-step-04.png` | İmza yapıştırılmış editör + altındaki **Signature defaults** seçicileri. |
| `gmail-step-05.png` | Sayfa dibindeki **Save Changes** düğmesi. Bu adımın tek amacı okuyucuya düğmenin en altta olduğunu göstermek — kadrajda sayfa sonu görünsün. |
| `gmail-result.png` | Alınan iletide imza, altında **"…"** kırpma işareti OLMADAN. |

---

## 04 · Apple Mail (macOS) — `apple-mail-*`

| Dosya | Ne görünecek |
|---|---|
| `apple-mail-step-01.png` | Builder + **Copy signature**. |
| `apple-mail-step-02.png` | Menü çubuğu **Mail → Settings → Signatures** sekmesi. |
| `apple-mail-step-03.png` | Soldaki hesap seçili, **+** düğmesi görünür. |
| `apple-mail-step-04.png` | İmza yapıştırılmış hâl **ve** işareti kaldırılmış **Always match my default message font** kutusu. İkisi bir arada görünmeli — rehberdeki en sık atlanan adım bu. |
| `apple-mail-step-05.png` | Hesabın **Choose Signature** açılırı, imza seçili. |
| `apple-mail-result.png` | Alınan iletide imza, Retina netliğinde. |

---

## 05 · iOS Mail — `ios-mail-*`

iPhone. Görüntüler dikey; tema kadrajı yatay bekliyor olabilir, gelince
kontrol edilecek.

⚠️ **Adım 01 metni düzeltildi** — eskiden "builder'dan gönder" diyordu,
Mailmyra posta göndermiyor. Yeni metin: bilgisayardan kopyala, yeni iletiye
yapıştır, kendine yolla.

| Dosya | Ne görünecek |
|---|---|
| `ios-mail-step-01.png` | **Bilgisayarda** çekilecek: imzanın yapıştırıldığı yeni ileti penceresi, alıcı kendi adresi. |
| `ios-mail-step-02.png` | iPhone'da Mail uygulamasında o ileti açık, imza render edilmiş. |
| `ios-mail-step-03.png` | Basılı tutma sonrası seçim tutamakları imzanın tamamını kapsıyor, **Copy** balonu görünür. |
| `ios-mail-step-04.png` | **Settings → Apps → Mail → Signature** ekranı. |
| `ios-mail-step-05.png` | İmza yapıştırılmış imza alanı, biçimlendirme korunmuş. |
| `ios-mail-result.png` | Telefondan gönderilmiş bir iletide imza — ekran genişliğini taşmıyor. |

---

## Görseller gelince

Her `<figure class="mm-sg-shot" data-shot="X.png">…</figure>` bloğu
`<img src="assets/img/setup/X.png" alt="…" width="…" height="…">` ile
değiştirilecek. `alt` metni adımın kendisini anlatsın ("Outlook signature
dialog with the pasted signature"), "screenshot" demesin.

Dosyalar `~/Desktop/mailmyra ham` altına konur; o klasör git'te değil, bu
yüzden görseller repoya girmez — yalnız bu liste ve sayfa kaynağının
snapshot'ı repoda durur (`scripts/marketing-site/setup-snapshots/`).
