# Panel brief — kullanıcı paneli + iç ops

Tarih: 2026-08-08 · Yazan: Claude
Kardeş belge: [`docs/superpowers/specs/2026-08-08-backend-and-app-design.md`](superpowers/specs/2026-08-08-backend-and-app-design.md)

Bu belge **arayüzü** anlatır: hangi ekran ne işe yarar, üstünde ne vardır,
hangi durumları gösterir, neyi bilerek göstermez. Sistem/şema kardeş belgede.

---

## 0. İlkeler

1. **Arayüzde gizlemek koruma değildir.** Yapamayacağın şeyi göstermeyiz ama
   asıl kontrol her zaman sunucudadır. Bir düğmenin görünmemesi, o isteğin
   reddedileceğini garanti etmez — reddi backend yapar.
2. **Koltuk maliyeti eylem anında söylenir.** Kullanıcı bir göndericiyi
   yayına alırken kaç koltuğunun gideceğini *önceden* görür. Fatura sürprizi
   bu üründe kabul edilemez; sayfanın tamamı bunun üstüne kurulu.
3. **Boş ekran bir yönergedir.** "Henüz kayıt yok" yazmak yerine ne
   yapılacağını söyler ve o eylemi sunar.
4. **Taslak bedavadır, yayın para eder.** Bu ayrım arayüzün her yerinde
   aynı iki kelimeyle görünür: **Taslak** / **Yayında**.
5. **Solo kullanıcı organizasyon görmez.** Şemada org var ama Faz 1'de
   kullanıcıya hiç bahsedilmez.

---

## 1. Bilgi mimarisi

```
app.mailmyra.com
  /login                       giriş
  /signup                      kayıt
  /verify/:token               e-posta doğrulama
  /reset            /reset/:token   şifre sıfırlama

  /app                         → /app/signatures'a yönlenir
  /app/signatures              İmzalarım                       Faz 1
  /app/signatures/:id          Builder (düzenleme)             Faz 1
  /app/account                 Hesap                           Faz 1

  /app/senders                 Göndericiler (koltuklar)        Faz 2
  /app/senders/:id             Gönderici detayı                Faz 2
  /app/team                    Üyeler ve davetler              Faz 2
  /app/brand                   Marka ayarları                  Faz 3
  /app/bulk                    Toplu içe/dışa aktarma          Faz 3
  /app/clients                 Müşteriler (ajans)              Faz 4
```

Sol kenar menüsü fazla büyüdükçe açılır. **Faz 1'de yalnız iki madde
görünür:** İmzalarım · Hesap.

---

## 2. Kullanıcı paneli — ekran ekran

### 2.1 Kayıt (`/signup`) — Faz 1

**İşi:** hesabı açmak ve builder'da yapılmış işi kaybetmemek.

Üstünde: e-posta · şifre (min 10 karakter, güç göstergesi değil sadece
uzunluk kontrolü) · Şartlar ve Gizlilik kabul onayı (tek kutu, iki link) ·
"Hesap oluştur".

**Kritik davranış — taslak taşıma.** Tarayıcıda `mailmyra:draft:v1` varsa,
kayıt formunun üstünde bir şerit çıkar:

> Builder'da başladığın imza duruyor. Hesabına taşıyalım mı? **[Taşı]**

Sessizce taşınmaz — kullanıcının başka bir hesabı olabilir. Kayıt bitince
taşınan taslak "İmzalarım"da ilk kayıt olarak durur.

**Durumlar:** e-posta zaten kayıtlı → forma hata (bu ekranda sızdırma sorunu
yok, kullanıcı zaten kendi adresini biliyor) · rate limit → "Çok fazla
deneme, 15 dakika sonra tekrar dene".

**Ne YOK:** sosyal giriş · davet kodu alanı · şirket adı sorusu. Kayıt üç
alandan uzun olmayacak.

### 2.2 Giriş (`/login`) — Faz 1

E-posta · şifre · "Şifremi unuttum" · "Hesabın yok mu?".
Taslak taşıma şeridi burada da çıkar.

**Doğrulanmamış hesap:** giriş olur ama panelde üstte kalıcı bir şerit:
"E-postanı doğrula — [Tekrar gönder]". Export **doğrulanana kadar kapalı**.
Sebep: doğrulanmamış adresle koltuk açılmasını istemiyoruz.

### 2.3 Şifre sıfırlama (`/reset`) — Faz 1

Talep ekranı tek alan. **Hesap var/yok asla sızdırılmaz:** her iki durumda
da aynı mesaj — "Bu adres kayıtlıysa sıfırlama bağlantısı gönderildi."

`/reset/:token`: yeni şifre + tekrar. Token tek kullanımlık, 1 saat.
Süresi dolmuşsa yeni talep bağlantısı sunulur.

### 2.4 İmzalarım (`/app/signatures`) — Faz 1

**İşi:** panelin ana ekranı. Kullanıcının imzalarını listeler.

Her satırda: imza adı · şablon · son güncelleme · küçük önizleme ·
`Düzenle` · `Kopyala` (çoğalt) · `Sil`. Sağ üstte **Yeni imza**.

Faz 2'den itibaren her satır bir **göndericiye bağlıysa** onun rozetini de
taşır (Taslak / Yayında).

**Boş durum:** "Henüz imza yok. Builder'da birkaç dakikada ilk imzanı
kur." + **Yeni imza** düğmesi. Yönerge, boş kutu değil.

**Silme:** onay ister. Silinen imzanın yüklenmiş görselleri CDN'de kalır
(§7'deki kalıcı URL kuralı) — onay metninde bu açıkça söylenir.

### 2.5 Builder (`/app/signatures/:id`) — Faz 1

Mevcut builder. Değişenler:

- **Sunucuya kaydeder.** localStorage yalnız oturumsuz ziyaretçi için kalır.
- **Otomatik kayıt**, üstte "Kaydedildi · 14:32" göstergesi. Kayıt hatasında
  şerit: "Kaydedilemedi — bağlantını kontrol et. [Tekrar dene]" ve düzenleme
  kilitlenmez, veri kaybolmaz.
- **Export düğmeleri**: oturum + doğrulanmış e-posta + (Faz 2'den itibaren)
  bağlı göndericinin yayında olması ister. Koşul sağlanmıyorsa düğme
  görünür ama pasif, altında sebep yazar — gizlemek yerine **açıklamak**.
- Faz 3'ten itibaren marka kilidi olan alanlar kilit ikonuyla ve
  "Marka ayarlarından yönetiliyor" ipucuyla gelir.

### 2.6 Göndericiler (`/app/senders`) — Faz 2

**İşi:** koltuk muhasebesinin görüldüğü yer. Panelin en önemli ekranı.

**Üstte koltuk göstergesi** — her zaman görünür:

```
13 / 25 aktif gönderici        [████████░░░░]     Koltuk ekle
```

%80'i geçince ton uyarıya döner; %100'de "Koltuk ekle" birincil eyleme
yükselir ve yayına alma düğmeleri pasifleşir.

Liste: ad · e-posta · ünvan · **durum rozeti** · atanmış imza · eylemler.

**Durum rozetleri, tek dil:**
| Rozet | Anlamı | Koltuk |
|---|---|---|
| **Taslak** (nötr gri) | oluşturuldu, hiç yayınlanmadı | tüketmez |
| **Yayında** (şeftali) | aktif | tüketir |
| **Pasif** (soluk) | yayınlanmıştı, durduruldu | tüketmez |

**Yayına alma — onay zorunlu.** Diyalog kaç koltuk gideceğini *rakamla*
söyler:

> **Ahmet Yılmaz'ı yayına al**
> Bu gönderici aktif olacak ve **25 koltuğunun 14'ünü** kullanmış olacaksın.
> Yayına alındıktan sonra imzası export edilebilir.
> [Vazgeç] [Yayına al]

Tavan doluysa diyalog yerine açıklama: "25 koltuğun 25'i dolu. Yayına almak
için koltuk ekle veya bir göndericiyi pasifleştir." + iki bağlantı.

**Pasifleştirme** de onay ister ve dönem mantığını söyler: "Koltuğu bu dönem
içinde başka bir gönderici için kullanabilirsin. Dönem sonunda yeni sayı
geçerli olur." (v3 §8)

**Boş durum:** "Henüz gönderici yok. Tek tek ekle ya da CSV yükle." —
CSV bağlantısı Faz 3'te aktifleşir.

### 2.7 Gönderici detayı (`/app/senders/:id`) — Faz 2

Kimlik alanları (ad, e-posta, ünvan, departman) · atanmış imza · durum ve
yayın eylemi · koltuk geçmişi (`SeatEvent`: ne zaman yayınlandı, ne zaman
pasifleştirildi) · "Bu göndericinin imzasını indir".

**Koltuk geçmişi görünür olmalı** — fatura tartışmasında tek dayanağımız bu.

### 2.8 Üyeler ve davetler (`/app/team`) — Faz 2

**Gönderici ≠ üye.** Bu ayrım ekranın en tepesinde bir cümleyle anlatılır:

> Üyeler panele giren kişilerdir. Gönderici, imzası yönetilen kimliktir.
> **Kendine imza atanmayan üye koltuk tüketmez.**

Liste: ad · e-posta · rol · durum (aktif / davet bekliyor) · eylemler.
Davet: e-posta + rol seçimi → gönder. Bekleyen davet iptal edilebilir,
yeniden gönderilebilir.

**Rol matrisi ekranda gösterilir** (küçük tablo), çünkü rol seçimi burada
yapılıyor:

| | owner | admin | editor | viewer |
|---|---|---|---|---|
| Fatura, plan, org silme | ✓ | | | |
| Üye davet/rol değiştirme | ✓ | ✓ | | |
| Gönderici ekleme, yayına alma | ✓ | ✓ | | |
| Marka ayarları | ✓ | ✓ | | |
| İmza düzenleme (kendi + atanan) | ✓ | ✓ | ✓ | |
| Export | ✓ | ✓ | ✓ | |
| Görüntüleme | ✓ | ✓ | ✓ | ✓ |

Son `owner` rolü düşürülemez veya silinemez — arayüz engeller, backend de.

### 2.9 Marka ayarları (`/app/brand`) — Faz 3

**İşi:** org genelinde tek imza sistemi kurmak.

İki sütun: solda **ayarlar**, sağda **canlı önizleme** (gerçek renderer
çıktısı, iframe içinde — tema CSS'i imzayı ele geçirmesin diye; galeri
sayfasında öğrenildi).

Ayarlar: şablon seçimi · marka rengi · metin/soluk renk · yazı tipi
(web-safe listesi) · logo · varsayılan CTA · yasal metin.

**Kilit mekaniği.** Her alanın yanında bir kilit anahtarı:
- **Kilitli** → tüm göndericilerde bu değer zorunlu, builder'da düzenlenemez
- **Varsayılan** → yeni imzalara uygulanır, gönderici değiştirebilir

Kaydetme diyaloğu etkiyi söyler: "Bu değişiklik **13 yayındaki imzayı**
etkileyecek. Değişiklik yeni export'larda geçerli olur — daha önce
gönderilmiş e-postalar değişmez."

Son cümle önemli ve dürüst: gönderilmiş imza geriye dönük değişmez.

### 2.10 Toplu işlemler (`/app/bulk`) — Faz 3

İki iş, tek ekran, iki sekme.

**İçe aktar (CSV):** dosya seç → **sütun eşleme ekranı** (CSV başlıkları ↔
alanlarımız) → önizleme tablosu (ilk 10 satır, hatalı satırlar kırmızı) →
"N gönderici eklenecek, hepsi **taslak** olarak" → onay.
Taslak olarak eklenmesi kritik: CSV yüklemek koltuk harcamamalı.

**Dışa aktar (zip):** kapsam seçimi (tümü / yayındakiler / seçili) →
"N imza üretilecek" → indir. Sunucuda **saf renderer** ile üretilir.

Hata durumları: bozuk CSV → satır numarasıyla ne yanlış · mükerrer e-posta
→ "zaten var, atlanacak" · tavan aşımı → içe aktarma yine de olur (taslak
koltuk yemez), uyarı yayına alma anında çıkar.

### 2.11 Hesap (`/app/account`) — Faz 1

E-posta değiştirme (yeni adrese doğrulama gider, eskisi bilgilendirilir) ·
şifre değiştirme · aktif oturumlar listesi ve "diğer oturumları kapat" ·
hukuki belgeler ve kabul tarihleri.

**Plan bölümü (Faz 2):** mevcut koltuk sayısı · dönem bitişi · fiyat ·
"Koltuk eklemek için bize ulaş". **Checkout yok** — ilk 10 müşteri elle
faturalanıyor, arayüz de bunu dürüstçe söylüyor.

**Hesap silme:** iki aşamalı onay, e-posta yazdırma. Uyarı metni CDN
politikasını açıkça söyler (§7 — karar bekliyor).

### 2.12 Müşteriler (`/app/clients`) — Faz 4

Ajans üst hesabına özel. Müşteri org listesi · her birinde aktif gönderici
sayısı · **havuz koltuk göstergesi üstte tek satır**: "Tüm müşterilerde
87 / 100 aktif gönderici". Müşteri org'una geçiş (context switch), üstte
hangi müşteride olduğunu gösteren kalıcı bir şerit.

---

## 3. Çapraz kesen desenler

**Koltuk göstergesi** yalnız `/app/senders` ve `/app/clients`'ta. Her
ekranda göstermek gürültü olur.

**Yetkisiz eylem:** düğme gizlenmez, **pasifleşir ve sebebini söyler**.
"Bu işlem için admin olman gerekiyor." Gizlemek kullanıcıyı ürünün
sınırları konusunda kör bırakıyor.

**Yükleniyor:** iskelet (skeleton) değil, mevcut içeriği soluklaştırma —
liste ekranları küçük, iskelet abartı olur.

**Hata:** ne olduğunu ve ne yapılacağını söyler. "Bir şeyler ters gitti"
yasak. Sunucu hatasında istek kimliği gösterilir (destek için).

**Onay diyalogları** yalnız geri alınamaz veya para eden işlerde: yayına
alma · pasifleştirme · silme · marka kaydı. Gerisi doğrudan.

---

## 4. Kritik akışlar

### 4.1 Anonim ziyaretçi → müşteri (dönüşüm anı)

```
pazarlama sitesi → builder (oturumsuz, serbest)
   imzayı kurar, canlı önizler
→ Export'a basar
   → "Export için hesap gerekiyor" (düğme pasif, sebep yazılı)
→ /signup, taslak taşıma şeridi görünür
→ kayıt + e-posta doğrulama
→ taslak hesaba taşınır, İmzalarım'da durur
→ export açılır
```

Bu akışta **iş kaybolmaz.** Ürünün tek dönüşüm noktası burası; taslağın
kaybolması en pahalı hata olur.

### 4.2 Ekip kurulumu (Faz 2)

```
admin → Göndericiler → tek tek veya CSV ile ekle (hepsi TASLAK)
→ her birine imza ata (marka ayarları varsayılanları uygular)
→ hazır olanları Yayına al (her biri onay + koltuk sayısı gösterir)
→ Toplu dışa aktar → zip → kişilere dağıt
```

### 4.3 Koltuk tavanına çarpma

Yayına alma düğmesi pasifleşir; tıklanınca açıklama ve iki çıkış yolu:
koltuk ekle (iletişim) veya bir göndericiyi pasifleştir. Ölü uç yok.

---

## 5. İç ops — kullanıcı panelinden AYRI

**Neden ayrı:** iç ops müşteri verisine ve entitlement'a dokunur. Aynı
uygulamada, aynı oturum sisteminde yaşarsa bir yetki hatası müşteri
panelinden iç ops'a sızabilir. Ayrı tutmak bu sınıf hatayı imkânsız kılar.

### Faz 1 — CLI (arayüz yok)

```
npm run ops -- org:create     --name "X" --owner ali@x.com
npm run ops -- org:grant      --org <id> --seats 25 --price-version v1 --until 2027-08-08
npm run ops -- org:show       --org <id>
npm run ops -- billing:record --org <id> --seats 25 --due 2500 --renewal 2500
npm run ops -- user:verify    --email ali@x.com
npm run ops -- assets:orphans
```

Her komut `OpsLog`'a yazar: kim, ne zaman, hangi komut, hangi argümanlar.
Elle faturalama da olsa **veri düzenli üretilir** (v3 §9: fiyat yalnız
e-postada durmaz).

### Faz 3 — iç ops paneli (değerlendirilecek)

Eğer CLI yetmezse: **ayrı Plesk app** (`ops.mailmyra.com`), ayrı oturum,
IP allowlist + ikinci faktör. Ekranlar: org arama · org detayı (koltuk,
üyeler, göndericiler, fatura kayıtları) · koltuk verme · fatura kaydı ·
ops log. **Müşteri verisi düzenlenmez, yalnız görülür ve entitlement
ayarlanır.**

---

## 6. Görsel dil

Panel pazarlama sitesinin dilini **ödünç alır ama kopyalamaz**: pazarlama
ikna eder, panel iş yaptırır.

- Tokenlar `apps/web/app/tokens.css`'ten. CSS Modules. Tailwind yok.
- Lacivert `#00102b` · kâğıt `#f4efe8` · şeftali açık zeminde `#c96a2e`,
  koyuda `#f2a573` · mavi `#5a8ce2`/`#89b4ef`
- Panel **ağırlıklı açık zemin** — uzun süre bakılan çalışma yüzeyi.
  Pazarlama sitesinin koyu slab'ları ve dönen conic kenarları panelde
  **kullanılmaz**; orada dikkat çekmek işti, burada dikkat dağıtmak olur.
- Başlıklar ClashDisplay, gövde General Sans, **sayılar tabular** (koltuk
  sayacı, fatura tutarı zıplamasın)
- Animasyon en aza iner: durum geçişi ve odak halkası. `prefers-reduced-
  motion`'a saygı.

---

## 7. Erişilebilirlik (pazarlıksız)

- Her form alanının `<label>`'ı var; hata `aria-describedby` ile bağlı
- Koltuk sayacı `aria-live="polite"` — değişince okunur
- Diyaloglar odak tuzağı + `Esc` ile kapanır, açan öğeye odak döner
- Durum **yalnız renkle** anlatılmaz: rozetlerin metni var (Taslak/Yayında/
  Pasif)
- Kontrast AA; soluk gri gövde metni ölçülür (pricing'de `rgba(0,16,43,.5)`
  → 3.54 çıkmıştı, AA'nın altında; panelde bu hata tekrarlanmayacak)
- Tam klavye kullanımı; görünür odak halkası

---

## 8. Panelde YAPILMAYACAKLAR

Checkout / kart formu · kullanım grafikleri ve analitik · imza açılma-tıklama
istatistiği · onay/approval akışı · yorum ve bildirim merkezi · tema
seçici · çoklu dil (İngilizce tek dil) · sürükle-bırak şablon tasarımcısı ·
"AI ile imza yaz".

---

## 9. Açık kalanlar (arayüzü etkileyenler)

| # | Soru | Ekran |
|---|---|---|
| 1 | Rol seti `owner/admin/editor/viewer` yeterli mi? | 2.8 |
| 2 | Marka kilidinde hangi alanlar kilitlenebilir olmalı? | 2.9 |
| 3 | Toplu export'ta beklenen en büyük org? (200 üstü senkron riskli) | 2.10 |
| 4 | CSV sütun sözleşmesini biz mi tanımlıyoruz? | 2.10 |
| 5 | Hesap silinince CDN görselleri — silme uyarısı ne diyecek? | 2.11 |
| 6 | Ajansta müşteri admini Faz 4'te mi çıkacak? | 2.12 |
