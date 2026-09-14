# 🔴 Bulgu: gerçek istemci IP'si hiç kaydedilmiyor

**Tarih:** 2026-09-14 · **Nasıl bulundu:** Plan 1 deploy sonrası dış duman testleri
**Durum:** canlıda, açık · **Kaynak:** bugünün işi DEĞİL — uygulama yayına girdiğinden beri böyle

---

## Kanıt

**① Panelde görünen:** `/app/account/security` → "Aktif oturumlar" tablosunda **IP sütunundaki
her satır `local`** — iPhone, Mac, 21.08.2026'dan 14.09.2026'ya kadar hepsi. Tek bir gerçek
adres yok.

**② Uçta ölçülen:** `POST /api/leads`'e sahte `X-Forwarded-For: 203.0.113.77` gönderildiğinde
**yeni bir rate-limit kovası açıldı** (kendi kovam doluyken istek geçti). Farklı bir sahte
değer yine geçti; başlıksız istek hâlâ reddedildi.

Bu ikisi birlikte şunu kanıtlar: **IIS zincire kendi gördüğü gerçek IP'yi EKLEMİYOR.**
İstemcinin yolladığı `X-Forwarded-For` olduğu gibi Node'a ulaşıyor; hiç yollamazsa başlık
hiç gelmiyor ve `clientIp()` `'local'` yedeğine düşüyor.

## Sebep

`apps/web/lib/client-ip.ts` tek kaynak olarak `X-Forwarded-For`a bakıyor:

```ts
const xff = req.headers.get('x-forwarded-for');
if (!xff) return 'local';
const last = xff.split(',').pop()?.trim();
```

Yorumundaki varsayım: *"arkadaki proxy zincire EKLEME yapar, bu yüzden güvenilecek tek girdi
SAĞ uçtaki"*. Kurulumumuzda **böyle bir proxy yok** — `apps/web/web.config` yalnız iisnode
handler + rewrite içeriyor, hiçbir yerde XFF yazılmıyor. Varsayım canlıda tutmuyor.

## Etkilenen yerler (7 çağrı)

| Yer | Bugünkü sonuç |
|---|---|
| `api/auth/login` → `login:${ip}\|${email}` | Anahtar `login:local\|<eposta>` — hesap başına kısıt **duruyor**, ama saldırgan XFF döndürerek **sınırsız deneme** yapabilir |
| `api/auth/forgot-password` → `reset:${ip}` | **Tek ortak kova**: dünyadaki bütün şifre sıfırlama istekleri aynı sayacı yiyor; ayrıca XFF ile atlatılabilir |
| `api/leads` | Bütün ziyaretçiler tek 5/saat kovasında. **6. talep siteye gelen herkesi keser** ("Too many messages from this connection") ve o lead kaybolur |
| `api/upload`, `api/icons` | Aynı ortak kova mantığı |
| `api/auth/register` → `LegalAcceptance.ip` | **KVKK/Şartlar onay delili `'local'` olarak yazılıyor** — hukuki kayıt boş |
| `createSession(..., { ip })` | Oturum kaydı ve müşteriye gösterilen "Aktif oturumlar" ekranı işe yaramaz |
| `api/admin/_shared` → `StaffContext.ip` | **Personel denetim defterinde her işlemin IP'si `'local'`** — governance kaydı eksik |

**Özet:** limiter bugün hem botu durdurmuyor (başlık döndürmek yetiyor) hem meşru ziyaretçiyi
kesiyor. Yanında iki kayıt bütünlüğü sorunu var (KVKK delili + denetim defteri).

## Önerilen düzeltme

**① `web.config` — iisnode'a gerçek adresi başlık olarak yazdır**

```xml
<iisnode promoteServerVars="REMOTE_ADDR" />
```

iisnode bunu `x-iisnode-remote_addr` başlığı olarak iletir.
⚠️ Dosyanın kendi kuralı: *"buraya YALNIZCA handler + rewrite girer. Yeni bir ayar eklemen
gerekirse ÖNCE TEK BAŞINA dene ve siteyi kontrol et."* — 2026-07-27'de kilitli bir bölüm
siteyi 0 baytlık 500'e düşürmüştü. Bu yüzden bu satır **tek başına** deploy edilir, kök
doğrulanır, sonra kod gider. (Uyarıdaki tehlikeli örnek `nodeProcessCommandLine`'dı;
`promoteServerVars` Plesk'in Node seçimine dokunmuyor — yine de sıra bozulmaz.)

**② `client-ip.ts` — öncelik sırası değişir**

```
1. x-iisnode-remote_addr   (IIS'in gördüğü TCP karşı tarafı; iisnode üzerine yazar)
2. x-forwarded-for         YALNIZ önünde güvenilen bir proxy varsa (env bayrağı, VARSAYILAN KAPALI)
3. 'local'                 (yerel geliştirme)
```

Bugün XFF koşulsuz güveniliyor ve bu, kısıtları atlatmanın tek adımlık yolu. Önümüzde
XFF yazan bir proxy olmadığı için **varsayılan olarak güvenilmemeli**.

**③ Deploy sonrası doğrulama:** `promoteServerVars` gerçekten üzerine yazıyor mu —
sahte `X-IISNode-Remote_Addr` başlığıyla istek atıp kovanın ayrışMAdığını gör. Ayrılıyorsa
başlık istemciden geçiyor demektir ve öncelik sırası yeniden düşünülür.

## Kapsam kararı

Bu **Plan 1'in kapsamında değildi** ve bugünün deploy'u bunu bozmadı — lead formunun rate
limiti sadece görünür kıldı. Ama Site Task 4 formları gerçek trafiğe bağlamadan önce
kapatılmalı: aksi halde site açıldığı gün 6. ziyaretçiden sonra form herkese kapanır.

Süreç: kendi spec'i + planı, sonnet review, fable final — güvenlik kısıtlarına ve hukuki
kayda dokunuyor, ad-hoc yama yapılmaz.
