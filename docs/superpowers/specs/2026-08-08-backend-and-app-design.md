# Backend + uygulama — mimari ve fazlama

Tarih: 2026-08-08 · Karar sahibi: Hüseyin · Yazan: Claude
Kardeş belge: [`docs/panel-brief.md`](../../panel-brief.md) — ekran ekran arayüz

## Amaç

İnsanlar giriş yapsın · imza kursun ve kaydetsin · gate'li export alsın ·
org/koltuk/rol çalışsın · merkezi şablon uygulansın · CSV toplu iş görsün.
Fazlası bu turda yok.

## Kapsam dışı (bağlayıcı)

Otomatik abonelik · kart saklama · prorasyon · fatura motoru · kampanya /
redemption motoru · quote endpoint · dizin sync (Google/Entra) · Outlook
eklentisi · transport rule · imza analitiği / tıklama takibi · onay akışı ·
public API · AI üretim · SSO/SCIM.

İlk 10 müşteri **elle** faturalanır.

## Kilitlenen kararlar

| Karar | Tarih |
|---|---|
| Veritabanı **MariaDB 11.8.3** (Postgres değil — Plesk Windows desteklemiyor; MySQL 8 de yok, Plesk'te tek seçenek MariaDB) | 2026-08-08 |
| Migration **Plesk panelinden** `prisma migrate deploy`; DB dışarı açılmaz | 2026-08-08 |
| E-posta: **Resend** | 2026-08-08 |
| Koltuk **ayrı "yayına al" adımında** tükenir; taslak bedava | 2026-08-08 |
| Auth kendi oturum sistemimiz (email+şifre). Clerk/Auth0 yok | CLAUDE.md |
| Renderer saf TS kalır; sunucuda toplu export **aynı** renderer'ı kullanır | CLAUDE.md |
| Görseller yalnız `cdn.mailmyra.com`, `StorageAdapter` deseniyle | CLAUDE.md |
| Şablon sayısı **1** (`classic-horizontal`); 2–3 backend'den sonra | 2026-08-08 |

---

## 1. Dağıtım topolojisi

| Hedef | İçerik | Neden ayrı |
|---|---|---|
| `mailmyra.com` | statik pazarlama HTML'i (`~/Desktop/mailmyra ham`) | agresif cache; uygulama restart'ından etkilenmez |
| `app.mailmyra.com` | Next.js uygulaması, ayrı Plesk Node app | kendi `web.config`'i, kendi deploy'u, temiz çerez sınırı |
| `cdn.mailmyra.com` | görsel varlıklar | kilitli mimari kural |

**Neden path değil alt alan:** mevcut `web.config` *her* isteği Next'e
yönlendiriyor. Aynı site altında statik HTML'le bir arada yaşatmak path bazlı
rewrite demek; `docs/deploy-plesk-iisnode.md` bu dosyaya fazladan ayar
eklemenin **tüm siteyi 0 baytlık 500'e düşürdüğünü** kaydetmiş (2026-07-27).

### Deploy akışı

```
Mac'te build → app'i Plesk'ten DURDUR → zip/FTPS yükle
→ panelden `prisma migrate deploy` → app'i BAŞLAT
```

Uygulama durmadan yükleme yapılamaz (Windows dosya kilidi). Migration
uygulama **dururken** koşar; şema değişikliği canlı trafikle yarışmaz.

**Tuzak:** panelde "node PATH'te yok" hatası → app kökünde `.npmrc` +
`scripts-prepend-node-path=true`.

### iisnode gerçeği

`web.config` minimal kalmalı (yukarıdaki 500 olayı). Süreç sayısı orada
sabitlenmemiş; bu yüzden **hiçbir şey tek süreç varsaymaz**:

- Oturumlar veritabanında (bellekte değil)
- Auth uçlarının rate limit sayacı veritabanında
- Mevcut bellek içi limiter yalnız yükleme gibi uçlarda kalır

---

## 2. Servis sınırları

```
packages/
  renderer/       saf TS — DEĞİŞMİYOR
  core/           ← YENİ. DB yok, Next yok, React yok.
    seats.ts        aktif koltuk sayımı (org ağacı)
    entitlement.ts  canPublish · canExport · seat guard
    roles.ts        yetki matrisi
    pricing.ts      fiyat sabitleri (tek kaynak)
apps/web/
  lib/db.ts       Prisma client (tekil)
  lib/auth/       session · password · token
  lib/repo/       ince veri erişimi
  app/(app)/      panel
  app/api/        route handler'lar
  ops/            iç operasyon CLI
```

`packages/core` ayrı çünkü **koltuk ve yetki kuralları DB'siz test
edilebilmeli** ve aynı kurallar toplu export yolunda da çalışmalı. Renderer
kararının kardeşi: kural motoru çatıdan bağımsız.

---

## 3. Faz 1 veri modeli

MariaDB 11.8.3 · Prisma provider `mysql` · `utf8mb4` · InnoDB · tüm para
alanları **cent (int)**.

**MariaDB'nin MySQL 8'den farkları, şemayı etkileyenler:**

| Konu | MariaDB 11.8'de durum | Sonuç |
|---|---|---|
| `JSON` tipi | **LONGTEXT + `json_valid()` CHECK** — native tip değil | İmza verisini bütün olarak okuyup yazdığımız için sorun yok. **JSON içine indeks atılamaz** — imza içeriğinde arama yapmayı planlamıyoruz, planlarsak ayrı kolon gerekir |
| Kısmi indeks | yok (MySQL'de de yoktu) | Pasifleştirilen gönderici **silinmez, yeniden aktifleştirilir**; `UNIQUE(orgId, email)` yeter |
| Collation | Sunucu varsayılanına **güvenilmez** — 11.8.8'de ölçtük, `utf8mb4_general_ci` çıktı (`uca1400` derlenmiş ama varsayılan değil) | Veritabanı düzeyinde `utf8mb4_unicode_ci` **açıkça pinlendi**. Sebep: hem MariaDB'de hem MySQL'de var, Prisma'nın bildiği yol; `uca1400_*` MariaDB'ye özel ve Prisma'nın drift üretme riski var. Ölçüldü: `Ali@X.NET` ile `ali@x.net` mükerrer sayılıyor (istediğimiz), noktasız `alı@` ayrı kalıyor (yine istediğimiz) |
| İndeks uzunluğu | InnoDB dynamic satır formatında 3072 bayt | `VARCHAR(255)` utf8mb4 = 1020 bayt, unique indeks sorunsuz |
| Native `UUID` tipi | var (10.7+) ama Prisma `mysql` provider'ı kullanmaz | Kimlikler Prisma `cuid()` ile `varchar` |

### User
`id` · `email` (unique, lowercase normalize) · `passwordHash` ·
`emailVerifiedAt?` · `createdAt` · `lastLoginAt?`

### Session
`id` · `userId` · `tokenHash` (unique) · `expiresAt` · `createdAt` ·
`lastSeenAt` · `userAgent?` · `ip?`
Çerezde **opak token**, veritabanında yalnız hash'i. Kayıt silinince oturum
anında ölür (iptal edilebilirlik).

### EmailToken
`id` · `userId` · `type` (`verify` | `reset` | `invite`) · `tokenHash` ·
`expiresAt` · `usedAt?` · `createdAt`
Tek kullanımlık. Süresi: verify 24s, reset 1s, invite 7g.

### Organization
`id` · `name` · `parentOrgId?` (ajans için, Faz 4) · `entitledSeats` (int) ·
`priceVersion` (string) · `entitlementState` (`trial` | `active` | `past_due`
| `cancelled`) · `trialEndsAt?` · `createdAt`

`PriceBook`/`PriceVersion` tablosu **yok** — kademe olmadığı için
versiyonlanacak tablo da yok; string alan grandfather'a yeter.

### Membership
`userId` · `orgId` · `role` (`owner` | `admin` | `editor` | `viewer`) ·
`createdAt` — bileşik birincil anahtar.

### SenderIdentity  ← koltuk tüketen varlık
`id` · `orgId` · `displayName` · `email` · `jobTitle?` · `department?` ·
`publishedAt?` · `deactivatedAt?` · `createdAt`
`UNIQUE(orgId, email)`

- `publishedAt == null` → **taslak**, koltuk yemez
- `publishedAt != null && deactivatedAt == null` → **aktif**, koltuk tüketir

**MariaDB notu:** kısmi indeks yok. Bu yüzden pasifleştirilen kimlik
**silinmez, yeniden aktifleştirilir** — `UNIQUE(orgId, email)` böylece hem
mükerrer koltuğu hem mükerrer kaydı engeller.

### Signature
`id` · `orgId` · `senderIdentityId?` · `templateId` · `data` (JSON) ·
`name` · `updatedAt` · `createdAt`
`data` = `SignatureData` (renderer'ın tipi). MariaDB'de LONGTEXT +
`json_valid()` CHECK olarak iner; bütün belge olarak okunup yazılır.

### Asset
`id` · `orgId?` · `filename` (unique) · `sha256` · `kind`
(`avatar`|`logo`|`handSignature`) · `bytes` · `createdAt`
CDN yaşam döngüsü ve KVKK silme talebi için. Mevcut orphan temizleyici bunu
kullanacak.

### LegalAcceptance
`id` · `userId?` · `orgId?` · `docType` (`terms`|`privacy`|`dpa`) ·
`version` · `acceptedAt` · `ip`

### AuthAttempt  (rate limit, DB'de)
`key` (ip veya email) · `windowStart` · `count`
Bellek içi limiter çok süreçte bölüneceği için auth uçları buradan sayılır.

### Faz 2+ eklenecekler
`Invitation` · `BrandProfile` · `SeatEvent` · `BillingRecord`

---

## 4. Koltuk ve entitlement

Tek zorlama noktası, tamamen sunucuda:

```
POST /api/senders/:id/publish
  ── transaction ──────────────────────────────────
  SELECT ... FOR UPDATE on billing org row
  aktif = count(SenderIdentity: publishedAt≠null, deactivatedAt=null)
          org ağacı boyunca
  if (zaten aktif değilse) aktif += 1
  if (aktif > entitledSeats) → 402, publish YOK
  publishedAt = now()
  ──────────────────────────────────────────────────
```

`FOR UPDATE` şart: iki eşzamanlı publish aksi hâlde tavanı aşar.

**Export ayrı bir kapı değil.** Export yalnız aktif kimlik için çalışır;
böylece "frontend'de gizlemek" hiçbir anlam ifade etmez.

**Pasifleştirme** koltuğu dönem içinde serbest bırakır (v3 §8: satın alınan
kapasite dönem sonuna kadar korunur, iade yok). Yani sayım *satın alınmış
kapasiteye* karşı yapılır; birini pasifleştirip yerine başkasını aktif etmek
serbesttir.

**Ajans (Faz 4):** `entitledSeats` fatura sahibi üst org'da durur, sayım org
ağacını gezer. "Ajans tek koltukla sınırsız müşteri yönetememeli" şartı
bundan doğal olarak çıkar — her müşterinin göndericisi aynı havuza yazılır.

---

## 5. Oturum güvenliği

| Konu | Karar | Gerekçe |
|---|---|---|
| Şifre hash | Node yerleşik **`crypto.scrypt`** | argon2/bcrypt native modül. Mac'te build alıp Windows'a zip atıyoruz; native binary uyuşmazlığı bu deploy hikâyesinin en olası kırılma noktası. scrypt sıfır bağımlılık |
| Oturum | DB'de, opak token, `httpOnly` + `Secure` + `SameSite=Lax` | çok süreç ihtimali; ayrıca iptal edilebilir |
| Süre | 30 gün kayan; her istekte `lastSeenAt` | |
| CSRF | SameSite=Lax + durum değiştiren POST'ta çift-gönderim token | |
| Rate limit | auth uçlarında DB sayacı: 5 deneme / 15dk / (ip+email) | |
| Bot | CAPTCHA **yok** | dönüşümü düşürür ve çözmüyoruz; rate limit + e-posta doğrulama MVP'de yeterli |
| Şifre kuralı | min 10 karakter, yaygın-şifre listesi kontrolü | karmaşıklık kuralı yok — uzunluk daha etkili |

---

## 6. E-posta akışları (Resend)

| Akış | Tetik | İçerik |
|---|---|---|
| Doğrulama | kayıt | tek kullanımlık link, 24s |
| Şifre sıfırlama | talep | tek kullanımlık link, 1s. **Hesap var/yok sızdırılmaz** — her iki durumda aynı yanıt |
| Davet | admin davet eder | 7g, kabul edince Membership |
| Koltuk uyarısı (Faz 2) | tavana yaklaşınca | bilgilendirme |

`SPF` + `DKIM` domain doğrulaması kurulumun parçası. Gönderen:
`no-reply@mailmyra.com`.

---

## 7. KVKK

Rol ayrımı kritik:

- Müşterinin çalışan verisi için **biz veri işleyeniz**, müşteri veri
  sorumlusu → her çalışandan rıza almıyoruz, müşteriyle **DPA** yapıyoruz
- Hesap sahipleri için **biz veri sorumlusuyuz** → aydınlatma metni + kabul

`LegalAcceptance` bir *rıza* değil **kabul** kaydıdır: kim, hangi belge,
hangi sürüm, ne zaman, hangi IP.

**Açık politika (karar bekliyor):** hesap silinince CDN görselleri.
Silmek sahadaki imzaları kırar — bu projenin 2 numaralı mimari kuralına
aykırı. Bkz. §10.

---

## 8. İç operasyon

Kullanıcı paneliyle **aynı yerde değil**. Faz 1'de **CLI**:

```
npm run ops -- org:create   --name "X" --owner ali@x.com
npm run ops -- org:grant    --org <id> --seats 25 --price-version v1 --until 2027-08-08
npm run ops -- org:show     --org <id>
npm run ops -- billing:record --org <id> --seats 25 --due 2500 --renewal 2500
npm run ops -- user:verify  --email ali@x.com
npm run ops -- assets:orphans
```

Neden CLI: UI yok, auth yüzeyi yok, en hızlısı. Her komut `OpsLog`'a yazar
(kim, ne zaman, hangi komut, hangi argüman). İç ops **paneli** Faz 3'te
değerlendirilir — detayı kardeş belgede.

---

## 9. Fazlama

**Faz 0 — Temizlik.** ✅ `main` `bc095e4`'e alındı (FAQ+pricing merge edildi).

**Faz 1 — Solo çekirdek. Tek başına satılabilir.**
MariaDB + Prisma + ilk migration · email/şifre auth + doğrulama + sıfırlama ·
panel: İmzalarım + Hesap · builder sunucuya kaydediyor (localStorage'dan
göç) · gerçek oturumla gate'li export · ops CLI · Resend.
→ Bir Pro müşteriye bugün satılır.

**Faz 2 — Ekip.** Davet · roller · çoklu SenderIdentity · publish'te koltuk
zorlaması · Organizasyon ekranı · `SeatEvent` · `BillingRecord`.

**Faz 3 — Marka + toplu.** `BrandProfile` / merkezi şablon + kilit · toplu
export (zip) · CSV içe/dışa.

**Faz 4 — Ajans.** `parentOrgId` · havuz koltuk · müşteri izolasyonu ·
white-label bayrağı.

Faz 1 ayrı durabilir: org/rol/koltuk mantığı kullanıcıya görünmez ama şema
onu kaldırır (herkesin görünmez bir kişisel org'u olur).

---

## 10. Doğrulama

- `packages/core` birim testleri: koltuk sayımı, yetki matrisi, entitlement
  sınırları — **DB'siz**
- Eşzamanlılık testi: iki paralel publish tavanı aşamıyor
- Auth: rate limit, token tek kullanımlık, oturum iptali, şifre sıfırlamada
  hesap varlığı sızmıyor
- Export gate: oturumsuz istek 401, taslak gönderici için 403
- Renderer çıktısı değişmedi (mevcut 60 test yeşil kalmalı)
- Migration Plesk panelinde koşuyor; app durdurulmuşken

## 11. Açık kalanlar

| # | Konu | Etkilediği faz |
|---|---|---|
| 1 | Roller: `owner/admin/editor/viewer` yeterli mi? Ajansta müşteri admini Faz 4'te mi? | 2 |
| 2 | Marka kilidi: hangi alanlar kilitlenebilir, admin override'a izin verebilir mi? | 3 |
| 3 | Toplu export'ta beklenen en büyük org (200 üstü senkron istek iisnode'da riskli) | 3 |
| 4 | CSV sütun sözleşmesini biz mi tanımlıyoruz? | 3 |
| 5 | `app.mailmyra.com` Plesk app + SSL açıldı mı? | 1 |
| 6 | Uygulamanın CDN dizinine yazma izni nasıl verilecek? | 1 |
| 7 | DPA + aydınlatma metinlerini kim yazacak? | 1 |
| 8 | **Hesap silinince CDN görselleri** — sahadaki imzaları kırmadan nasıl? | 1 |
