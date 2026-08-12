# Toplu Zip Export — Tasarım

Tarih: 2026-08-12 · Onay: Hüseyin (aynı gün, soru-cevap turuyla)
Kapsam: Faz 3'ün ilk alt projesi. İkincisi (marka ayarları `/app/brand`)
AYRI spec'tir; bu belge ona hiçbir şey vaat etmez.

## 1. Amaç ve bugünkü zemin

Panel brief §2.10: kapsam seçimi → "N imza üretilecek" → indir; üretim
sunucuda **saf renderer** ile. Renderer'ın React'siz tutulmasının (kalıcı
mimari kural 1) var oluş sebebi bu an: 50 kişilik firmanın imzaları tek
seferde sunucuda üretilir.

Zemin: CSV içe aktarma Faz 2'de `/app/senders` üstüne indi (brief'in ayrı
`/app/bulk` ekranı fikri fiilen terk edildi — karar 2026-08-12, Hüseyin:
zip de Senders ekranında yaşar, ayrı ekran açılmaz). İmza↔gönderici atama
ve rozetler canlıda; `Signature` org'a bağlı, `senderIdentityId` opsiyonel,
bir göndericiye birden çok imza atanabilir.

## 2. Bugün verilen kararlar (Hüseyin)

| Karar | Seçim |
|---|---|
| Faz 3 sıralaması | Önce zip export, marka ayarları ayrı tur |
| Yerleşim | Senders ekranı; ayrı `/app/bulk` YOK |
| Kapsam seçenekleri | **Yayındakiler + Seçili** — brief'teki "Tümü" kaldırıldı (export kapısıyla çelişen ölü seçenek) |
| Ölçek varsayımı | ≤200 gönderici; senkron üretim; kuyruk/işçi YAZILMAZ (YAGNI) |

## 3. UI akışı (Senders ekranı)

- Her satıra onay kutusu, başlıkta "tümünü seç". Listenin üstünde
  **"Zip dışa aktar"** düğmesi.
- Kapsam = seçimin kendisi: hiçbir kutu işaretli değilse **yayındaki
  herkes**, işaretli varsa **yalnız seçilenler**. Ayrı kapsam menüsü yok.
- Düğme rakamlı onay diyaloğu açar (publish diyaloğu ilkesi):
  "**9 imza** üretilecek (7 gönderici). Atlanacak: 2 gönderici imza
  atanmamış · 1 seçili gönderici yayında değil. [Vazgeç] [İndir]"
  Atlanacak satırı yalnız gerektiğinde ve sebepli görünür (ölü uç yok).
- Üretilecek imza 0 ise diyalog hata değil açıklama gösterir: "Yayında
  imzası olan gönderici yok — önce imza ata ve yayına al."
- Diyalogdaki sayılar **istemcide, ekrandaki listeden** türetilir
  (`exportPlan(rows, selectedIds)` saf fonksiyonu — rozet + imza adları
  listede zaten var; ikinci bir "say" ucu açılmaz). Sunucu POST'ta kendi
  süzgecini yeniden uygular; fark oluşmuşsa sunucununki geçer.
- Viewer düğmeyi görmez (matris: `signature:export` owner/admin/editor'da);
  asıl kapı sunucuda.
- İndirilen dosya: `mailmyra-imzalar-YYYY-AA-GG.zip`.

Not: panel dili İngilizce (karar 2026-08-10) — §3'teki diyalog metinleri
anlatım içindir, üründeki kopya İngilizcedir ("Export zip", "N signature
files will be generated…", "Skipped: …").

## 4. API sözleşmesi

`POST /api/senders/export-zip` — gövde `{ senderIds?: string[] }`
(boş/yok = yayındaki herkes; dolu = seçilenler).

| Durum | Yanıt |
|---|---|
| Başarı | `200` `application/zip`, `Content-Disposition: attachment` |
| Oturumsuz | `401 unauthenticated` |
| İzinsiz rol (viewer) | `403 forbidden` |
| Yabancı/bilinmeyen id | `404 not_found` — istek BÜTÜN olarak düşer, kısmi zip yok; varlık itiraf edilmez (publish sargısı felsefesi) |
| Üretilecek imza yok | `409 no_exportable` (cancelled çalışma alanı da buraya düşer — core'daki kilitli yetenek tablosu) |
| Kapsam > 200 gönderici | `413 too_many`, hiçbir şey render edilmeden; mesaj dürüst: "200'e kadar; daha büyüğü için bize ulaş" |
| Bir imza render edilemedi | `500` — kısmi-sessiz başarı YOK; hangi imza olduğu log'a yazılır. Gerekçe: dağıtılan zipte bir kişinin sessizce eksik olması dağıtım anında keşfedilen en pahalı hata; yüksek sesle çökmek ucuz. (Veri kayıtta doğrulanıyor; yol nadir.) |

Uç salt-okunur: kilit/transaction yok. Rate limit yok (oturumlu + tavanlı).

## 5. Sunucu katmanı

İş mantığı `lib/repo/export.ts` içinde tek fonksiyonda; route incedir:

```ts
collectExportBundle(userId, senderIds?, cap = 200) →
  | { ok: true, files: Array<{ filename: string; html: string }>,
      skipped: { unassigned: number; unpublished: number } }
  | { ok: false, reason: 'forbidden' | 'not_found' | 'no_exportable' | 'too_many' }
```

Süzgeç sırası: üyelik + `can(role, 'signature:export')` → kapsamdaki
göndericiler (yabancı id → `not_found`) → tavan kontrolü → gönderici başına
`canExport` (core; taslak/pasif/entitlement burada elenir) → atanmış her
imza için `renderSignature(data, templateId)`.

- Zip'leme route'ta ayrı ince adım: **jszip** (saf JS — Mac→Windows taşıma
  hattında native modül riski sıfır, scrypt dersi). Testler zip açmadan
  `files` listesini doğrular; zip yardımcısının kendi küçük birim testi var.
- Zip'teki her `.htm`, builder'daki tekli ".htm indir" ile **aynı
  sarmalayıcı yardımcıdan** çıkar — iki üretim yolu sapamaz. Bugün o
  sarmalama `ExportButtons.tsx:52`'de satır içi; saf string fonksiyonu
  olarak `lib/export-htm.ts`'e çekilir, hem ExportButtons hem zip ucu onu
  kullanır.

## 6. Dosya adlandırma

Zip düz (klasörsüz). Ad tabanı göndericinin görünen adı, **ASCII'ye
indirgenir**: ş→s ı→i ğ→g ü→u ö→o ç→c, küçük harf, boşluk→tire, kalan
atılır. Sebep: zip girdi adlarında UTF-8 bayrağını yok sayan açıcılar
(özellikle eski Windows) "Ali Yılmaz"ı bozuyor; dağıtılacak dosyada risk
alınmaz.

- Tek imzalı gönderici → `ali-yilmaz.htm`
- Çok imzalı → `ali-yilmaz--satis-imzasi.htm` (çift tire ayırıcı)
- Ad çakışması → liste sırasıyla `-2`, `-3`; üretim deterministik
- Ad tamamen elenirse → e-postanın @ öncesi; o da boşsa `imza`

`exportFilename` saf fonksiyondur, Türkçe vakalarıyla birim testli.

## 7. Test planı

- **Birim:** `exportFilename` (çeviri, çakışma, çift tire, emoji yedeği) ·
  `exportPlan` (sayı/atlanacak türetimi) · ortak `.htm` sarmalayıcı (tekli
  indirme ile zip aynı baytlar) · zip yardımcısı (jszip ile geri okuma).
- **DB (`test-db/export-zip.test.ts`, `collectExportBundle`):** yayında+
  imzalı dosya üretir · taslak/pasif atlanır ve sayılır · imzasız yayında
  atlanır · çok imzalı çok dosya · seçili kapsam yalnız seçileni verir ·
  yabancı id `not_found` · viewer `forbidden`, editor geçer · org
  izolasyonu · cancelled org `no_exportable` · tavan `too_many` (cap
  parametreli, testte küçük değer).
- **Canlı kabul:** deploy sonrası melih alanında küçük gerçek zip; dosyalar
  açılır, Outlook'a yapıştırma göz kontrolü.

## 8. Kapsam dışı (bilinçli)

Asenkron üretim/kuyruk (>200 gelince yeniden bakılır) · ayrı `/app/bulk`
ekranı · zip içine README/manifest · rate limit · marka ayarları (sıradaki
spec) · imza seçim ekranı (gönderici seçilir, imzaları otomatik gelir).
