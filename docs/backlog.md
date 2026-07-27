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

## Hafta 2 Polish Notları — 2026-07-25

- **classic-horizontal'a ÖZGÜ yerleşim kararları** (gelecek şablonlar kendi
  yerleşimini seçer, bunlar sözleşme değildir): logo sol sütunda avatarın
  altında (8px boşluk, genişlik=kolon genişliği, height attribute YOK);
  el imzası en alt satırda disclaimer'ın sağında (150px görünüm / 300px 2x).
- [ ] **Logo width-only ölçekleme riski:** logo `<img>` height taşımıyor
  (SignatureData görsel oranı saklamıyor). Outlook genelde doğru ölçekler;
  6-istemci testinde ÖZELLİKLE kontrol edilecek. Sorun çıkarsa Hafta 4'te
  `visuals`'a boyut alanı (tip değişikliği + draft migrasyonu).
- [ ] **Deploy adımı — ikonlar gerçek CDN'e:** 6-istemci testinden ÖNCE
  `CDN_WRITE_PATH=<prod-cdn-yolu> npm run icons -w apps/web`
  prod'da koşulmalı; mono-719ad1 seti de ilk builder kullanımında oluşur
  (test .htm'leri için elle: `POST /api/icons/mono {"color":"#719ad1"}`).
- **simple-icons `^13.0.0`'a sabit:** v14.0.0 linkedin ikonunu kaldırdı
  (marka talebi). Upgrade öncesi 8 platformun varlığı doğrulanmalı; linkedin
  için kalıcı çözüm gerekirse glif path'i repoya vendor'lanır.
- [ ] **Hafta 4'e:** builder'da `filled`/`outline` seçiliyken statik ikonlar
  henüz deploy edilmemişse önizlemede kırık görsel görünür — dev kurulumunda
  script koşuldu; prod deploy checklist'ine eklendi (yukarıdaki madde).

---

## npm Göçü Notları — 2026-07-25

- [ ] **`npm audit`: 3 high severity açık.** Göçle GELMEDİ (mevcut
  bağımlılıklardan; pnpm'de de vardı, sadece raporlanmıyordu). **Karar
  (Hüseyin): şimdi kurcalanmayacak — önce deploy.** Sonra ayrı bir
  güvenlik taraması işi olarak ele alınacak: `npm audit` çıktısı okunur,
  `--force` KULLANILMADAN (breaking change riski) tek tek değerlendirilir.
- **Paket yöneticisi npm'e sabit** (CLAUDE.md Stack bölümünde kilitli):
  pnpm/corepack kullanılmayacak, `pnpm-lock.yaml`/`pnpm-workspace.yaml`
  geri eklenmeyecek.
- Göç sırasında yakalanan gerçek hata: `cleanup-cli.test.ts` workspace-yerel
  `node_modules/.bin/tsx` yolunu varsayıyordu (npm bin'leri köke hoist eder)
  — test artık `require.resolve('tsx/cli')` kullanıyor, paket
  yöneticisinden bağımsız.

---

## Telefon Testi Bulguları — 2026-07-24 (Hüseyin, yüzeysel tur)

Üçü de kod hatası DEĞİL — Hafta 1 şablon kapsamı ile Hafta 2 builder'ının
açtığı alanlar arasındaki dikiş. Kanıt: şablon kaynağı tarandı.

1. **El imzası hiç render edilmiyor.** `handSignatureUrl` şablonların
   hiçbirinde geçmiyor — Hafta 1 spec'inin yerleşim listesinde el imzası
   satırı yoktu. Builder alanı açınca boşluk görünür oldu.
   _Tasarım kararı gerekiyor: imza görseli nereye? (öneri: ad bloğunun
   üstüne, ~40px yükseklik)_
2. **Logo, avatar varken görünmüyor.** `classic-horizontal.ts:258` —
   `avatarUrl ?? logoUrl`: tek görsel yuvası, avatar öncelikli (Hafta 1
   spec kararı). İkisi birden yüklenince logo hiç çıkmıyor.
   _Tasarım kararı: logo ikinci bir yere mi (şirket adı yanı / alt satır),
   yoksa tek-yuva davranışı builder'da açıkça mı belirtilsin?_
3. **Sosyal ikonlar yerine metin-link.** Kayıtlı Hafta 2 kararı ("bu hafta
   metin-link devam") — ikon PNG seti CDN'e yüklenince `iconStyle` ile
   birlikte gelecek. Beklenti yönetimi: builder'ın Sosyal adımına küçük bir
   not eklenebilir.

**Kısıt:** 1 ve 2'nin çözümü classic-horizontal'ı DEĞİŞTİRMEK demek — bu,
5-istemci doğrulamasını kısmen eskitir. Outlook Classic RDP testi zaten
Hafta 3 öncesi yapılacak; şablon değişikliklerini o testten ÖNCE toplayıp
tek turda doğrulamak en ucuzu.

---

## Deploy Kayıtları

### Prod yayına alındı — 2026-07-27

`https://mailmyra.com/builder` canlı. Plesk Windows + IIS + iisnode,
Node 24.14.1, npm workspaces. Belge kökü `/httpdocs/apps/web`, uygulama kökü
`/httpdocs` (workspace hoisting için ŞART), başlatma dosyası
`apps/web/server.js`.

**Kesin kural — `web.config` MİNİMAL kalacak.** Plesk paylaşımlı hostingde
`<security><requestFiltering>` ve `<httpErrors>` KİLİTLİ; bunlara dokunan bir
web.config IIS'in yapılandırmayı hiç yüklememesine ve sitenin tamamının 0
baytlık 500 dönmesine yol açar (olmayan yollar dahil). iisnode log klasörü de
oluşmaz, bu yüzden "node başlamıyor" gibi görünür — saatlerce yanlış yerde
arattı. `nodeProcessCommandLine` de yazılmaz; Node yolunu/sürümünü Plesk verir.

Build sunucuda ALINMIYOR: Windows'ta `/404` prerender'ı `useContext` null ile
patlıyor (React tek kopyayken bile, Next-siz SSR testi geçerken). Akış:
Mac'te `npm run package` → `deploy-next.zip` → `apps/web` içine açılır →
sunucuda yalnızca `npm ci`. Ayrıntı: `docs/deploy-plesk-iisnode.md`.

- [ ] Sunucuda artık temizliği: `apps/web/deploy-next.zip` ve
  `apps/web/web.config.bak` silinebilir.
- [ ] `devErrorsEnabled` artık web.config'de yok; ileride teşhis için
  eklenirse iş bitince KALDIRILMALI.

---

## Test Kayıtları

### Tur 2 — 2026-07-25 (Hafta 2 polish: logo + el imzası + mono ikonlar, gerçek CDN)

Görseller `cdn.mailmyra.com`'dan (ikonlar `icons/mono-719ad1/` + builder
yüklemeleri kökten). Test yolu: builder'dan üretilen imza + fixture .htm'ler,
taze gönderilmiş maillerle.

| İstemci | Sonuç | Not |
|---|---|---|
| Gmail web | ✅ temiz | |
| Gmail mobil | ✅ temiz | |
| Apple Mail (Mac) | ✅ temiz* | *Hüseyin'in kendi Mac'inde kırık dönemden kalan görsel önbelleği kırık gösterdi (ürün dışı, yerel arıza); başka alıcının makinesinde ve iOS'ta temiz |
| iOS Mail | ✅ temiz | |
| Yeni Outlook (Mac) | ✅ temiz | |
| Eski Outlook (Mac) | ✅ temiz | Matris maddesi DEĞİL — Mac Outlook WebKit render eder; kayıt bilgi amaçlı |
| **Outlook** | ✅ temiz | 2026-07-27, Hüseyin: prod sunucudan üretilen imza mail ile gönderildi, Outlook'ta ve diğer istemcilerde sorunsuz geldi. (Kayda geçerken not: hangi Outlook sürümü olduğu ayrıca teyit edilmedi — Word motorlu **Outlook Classic (Windows)** ayrıca doğrulanacaksa backlog'da açık kalır) |

Teşhis notu: Apple Mail (Mac) arızası sırasında sunucu curl/Safari/iOS'tan
doğrulandı (TLS zinciri tam, TLS 1.2+1.3, tüm URL'ler 200); "Mail
etkinliğini koru" kapalıydı → yerel önbellek. Ders: her istemciye TAZE
gönderilmiş mail ile bak, açık kalmış eski kopyaya güvenme.

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
