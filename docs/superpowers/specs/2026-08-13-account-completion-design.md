# Account Tamamlama + Hukuki Sayfalar — Tasarım

Tarih: 2026-08-13 · Onay: Hüseyin (bölüm bölüm; dosya incelemesi atlandı,
bölüm onayları esas). Panelin son eksikleri: brief §2.11'in Faz 2 kesiti.

## 1. Bugün verilen kararlar (Hüseyin)

| Karar | Seçim |
|---|---|
| Hesap silinince CDN görselleri (brief §7 açık kararı) | **Görseller de silinir.** Sahadaki imzalar kırılır — uyarı metni bunu acımasız dürüstlükle söyler. KVKK'ya uyumlu tam temizlik |
| Hukuki sayfa dilleri | **KVKK aydınlatma TR** · Terms/Privacy **EN** (ürün diliyle tutarlı) |

## 2. Plan kutusu (Account)

Salt bilgi, sunucu render: mevcut `seatSummary` + `entitlementState` +
`trialEndsAt` + core `PRICING` ($1/aktif gönderici/yıl — elle yazılmaz).
"To add seats, contact us." Checkout YOK (kilitli karar, arayüz dürüst).

## 3. E-posta değiştirme (brief: "yeni adrese doğrulama, eskisi bilgilendirilir")

- Form: yeni adres + **mevcut şifre** (yeniden kimlik doğrulama).
- `POST /api/account/change-email` → şifre → benzersizlik (`email_taken`
  açık söylenir, kayıt formu gerekçesi) → YENİ adrese 24s'lik doğrulama.
- Şema: `EmailTokenType`'a `email_change` + `EmailToken.newEmail` kolonu
  (bekleyen adres token'da durur, kullanıcıda değil) — **migration'lı deploy**.
- Onay linki (`/confirm-email-change?token=`): `user.email` ← newEmail,
  `emailVerifiedAt` tazelenir (yeni adres kanıtlı); tüketimde YARIŞ kontrolü
  (adres bu arada alındıysa `email_taken`). ESKİ adrese bilgilendirme maili
  ("adresin değiştirildi; sen değilsen bize ulaş") — arızası işlemi geri
  almaz, log'lanır. Oturumlar düşürülmez.
- İki yeni şablon: `emailChangeVerifyEmail` (yeni adrese, süreli link) ·
  `emailChangedNoticeEmail` (eskiye; eylem linki uygulama kökü).

## 4. Hesap silme (iki aşama + çift kanıt)

**Kural — core `canRemoveMember` ile, kullanıcının TÜM üyelikleri üzerinden
kodlanır** (davetle katıldığı ikinci bir org'u da olabilir; yalnız
"birincil" org'a bakmak o org'u sessizce yetim bırakırdı):
- Bir org'da TEK üye kullanıcıysa → o org + kullanıcı birlikte silinir (tam
  temizlik) — kullanıcı birden fazla org'da tek üyeyse hepsi gider.
- Birden çok üyeli bir org'da kullanıcı ayrılabilirse (son owner değil) →
  yalnız o org'daki üyelik gider, org yaşar (davetli üye serbest).
- Herhangi BİR org'da son owner + başka üyeler varsa → bütün işlem
  `409 workspace_has_members` ile reddedilir, hiçbir şey silinmez (kısmi
  silme yok — "önce üyeleri çıkar ya da sahipliği devret").

**Akış:** Danger zone → `ConfirmDialog` uyarısı:
> This permanently deletes your workspace: senders, signatures and **all
> uploaded images**. Signatures already pasted into e-mail clients **will
> show broken images**. This cannot be undone.

Silah: e-postayı aynen yaz + şifre. `POST /api/account/delete
{ password, emailConfirm }` → `invalid_credentials` · `email_mismatch` ·
`workspace_has_members`.

**Sunucu sırası (görseller-de-silinir kararı):** kullanıcının tek üye
olduğu her org toplanır → `Asset` satırlarından dosya adları önceden
toplanır → gerekiyorsa (asset varsa) `CDN_WRITE_PATH` çözülmezse hiçbir şey
silinmeden ÖNCE sert hata (kod tabanının genel kuralı — bkz. storage.ts,
upload route — sessizce yutulmaz) → **transaction ÖNCE**: asset satırları
(SetNull yetimlerini önlemek için açıkça) + org'lar (cascade) + kullanıcı
(cascade) → transaction commit olduktan **SONRA** dosyalar `CDN_WRITE_PATH`
altında best-effort `unlink` (tek arıza durdurmaz, log'lanır). Sıra bilinçli:
DB önce giderse en kötü ihtimalle diskte sahipsiz ama zararsız bir dosya
kalır (`cleanup-orphans` temizler); tersi olsaydı yarıda kesilen bir
transaction, artık var olmayan dosyalara işaret eden satırlar bırakabilirdi.
`LegalAcceptance` null'lanıp KALIR (hukuki kayıt). Başarıda çerez temizlenir,
pazarlama köküne yönlendirilir.

## 5. Hukuki sayfalar

`/terms` (EN) · `/privacy` (EN) · `/kvkk` (TR) — pazarlama rota grubunda
düz tipografik sunucu sayfaları. **`lib/legal-links.ts` tek kaynak:** yol +
yürürlük sürümü; signup `termsVersion`'ı oradan gönderir ('unversioned'
biter), Account kabul listesi ve footer oradan linkler.

Taslak çapaları (ürün gerçekleriyle birebir): $1/aktif gönderici/yıl ·
yalnız yıllık · 7 gün deneme · elle faturalama · koltuk=yayındaki gönderici
· işlenen veriler (hesap e-postası; gönderici ad/ünvan/e-postaları —
müşterinin çalışan verisi, KVKK'da işleyen rolündeyiz; CDN'de görseller) ·
silme politikası: görseller dahil tam silinir, sahadaki imzalar kırılır ·
çerez: yalnız zorunlu oturum çerezi (banner yok, açıklanır).

⚠️ Taslaklar hukukçu incelemesi notuyla gelir — yayın öncesi şart.

## 6. Test planı

- DB: e-posta değiştirme (mutlu yol · adres dolu · yanlış şifre · süresi
  geçmiş/yabancı token · tüketim yarışı `email_taken` · eski adrese
  bilgilendirme) · silme (tek üyeli: org+user+asset satırları gider, geçici
  dizindeki CDN dosyaları gerçekten siliniyor · son owner + üyeler engel ·
  davetli üye silinince org yaşıyor · dosya arızası durdurmaz ·
  LegalAcceptance kalıyor).
- Birim: 2 yeni mail şablonu (mevcut yapısal describe.each'e girer) ·
  `legal-links` tek-kaynak şekli.
- Tarayıcı: Plan kutusu · değiştirme formu · Danger zone çift kanıt ·
  hukuk sayfaları linkleri.

## 7. Kapsam dışı (bilinçli)

E-posta değişiminde oturum düşürme · çeviri çiftleri · çerez banner'ı ·
otomatik veri dışa aktarma (KVKK talebi elle) · sahiplik devri arayüzü
(rol değiştirme Members'ta zaten var).
