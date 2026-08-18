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
  prod'da koşulmalı; mono-7b9fd3 seti de ilk builder kullanımında oluşur
  (test .htm'leri için elle: `POST /api/icons {"color":"#7b9fd3"}`).
- **simple-icons `^13.0.0`'a sabit:** v14.0.0 linkedin ikonunu kaldırdı
  (marka talebi). Upgrade öncesi 8 platformun varlığı doğrulanmalı; linkedin
  için kalıcı çözüm gerekirse glif path'i repoya vendor'lanır.
- [ ] **Hafta 4'e:** builder'da `filled` seçiliyken statik ikonlar
  henüz deploy edilmemişse önizlemede kırık görsel görünür — dev kurulumunda
  script koşuldu; prod deploy checklist'ine eklendi (yukarıdaki madde).

---

## Marka Kimliği — 2026-07-27

Spec: `docs/superpowers/specs/2026-07-27-brand-identity-design.md`

- Marka renkleri kilitli: `#7b9fd3` (mavi) · `#e0a66c` (turuncu). Tek kaynak
  `packages/renderer/src/brand.ts`; site UI `apps/web/app/tokens.css`.
- İkon renk modeli: `filled` sabit (platform renkleri) · `outline` çerçeveli
  ve brandColor'a bağlı · `mono` çerçevesiz ve brandColor'a bağlı.
- **Degrade kaldırıldı.** Renk asla değiştirilmez; düşük kontrastta yalnız
  bilgi notu çıkar. Bu, açık bekleyen "#719ad1 degrade kararı" maddesini
  KAPATIR — o madde artık geçersizdir.
- [ ] Üç ikon stili de 6 istemcide doğrulanacak (Outlook Classic dahil):
  kontur çerçevesinin köşe yuvarlaklığı ve şeffaf PNG'nin koyu modda hali.
- [ ] Prod CDN'de eski `icons/outline/` klasörü silinebilir çünkü bu yollarla
  MÜŞTERİ imzası hiç dışa aktarılmadı (yalnız dahili test mailleri) —
  CLAUDE.md'nin "üretilen görsel URL'leri asla kırılmaz" kuralı bu yüzden
  ihlal edilmiyor.
- [ ] Prod CDN'de eski `icons/mono-719ad1/` seti (eski varsayılan marka
  rengi) artık YETİM — `icons/outline/` ile birlikte docroot'tan silinebilir
  çünkü bu yollarla MÜŞTERİ imzası hiç dışa aktarılmadı (yalnız dahili test
  mailleri) — CLAUDE.md'nin "üretilen görsel URL'leri asla kırılmaz" kuralı
  bu yüzden ihlal edilmiyor.

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

## SSO (Google + Microsoft ile giriş) — lansman SONRASI

Karar: 2026-08-18, Hüseyin. **Yapılacak, ama lansmanı bloklamayacak.**
Pazarlama sitesinin giriş/kayıt sayfalarında düğmeler zaten tasarlanmıştı;
ürün karşılığı olmadığı için yayına girmeden **yorum içine alındı**
(`~/Desktop/mailmyra edit/{login,register}.html`, `mm-auth__providers` bloğu
ve hemen ardındaki `mm-auth__divider`). Geri açmak: yorumu kaldır, başka
değişiklik gerekmez.

Sıra önerisi: **önce Microsoft**. Konumlandırma ajans/kurumsal ve o alıcı
Entra ile girişi bekliyor; Google ikinci.

Gereken işler:

- [ ] **Şema.** `User.passwordHash` şu an NOT NULL (`schema.prisma:27`).
  Sağlayıcıyla gelen kullanıcının şifresi yok → ya nullable ya da ayrı bir
  bağlı-hesap tablosu. Prod migration Plesk panelinden.
- [ ] **Sağlayıcı kayıtları.** Google Cloud Console (OAuth onay ekranı +
  istemci) ve Entra ID uygulama kaydı (çok kiracılı). İkisinde de
  `app.mailmyra.com` yönlendirme adresi; iki gizli anahtar env'e.
  Temel kapsam (email+profile) hassas değil, uzun doğrulama yok.
- [ ] **OIDC akışı.** Projede bugün hiçbir auth bağımlılığı YOK. Yetkilendirme
  yönlendirmesi, `state`/PKCE, geri dönüş ucu, token değişimi, `id_token`
  doğrulaması. CLAUDE.md Clerk/Auth0'ı yasaklıyor — düz bir OIDC kütüphanesi
  eklenecekse ayrıca onay al.
- [ ] **⚠️ Hesap birleştirme politikası.** Şifreyle kayıtlı `x@y.com` sonra
  aynı adresle Google'dan gelirse ne olacak? Sağlayıcının `email_verified`
  bayrağı doğrulanmadan birleştirme yapılırsa **hesap ele geçirme açığı**
  doğar. Politika baştan yazılıp teste bağlanacak.
- [ ] **⚠️ Sözleşme onayı.** Her kayıt `LegalAcceptance` satırı yazıyor
  (`flows.ts:96`), sürümüyle birlikte. Sağlayıcı ekranında şartları kabul
  ettiren kutu yok → SSO akışına araya giren bir "şartları kabul et" adımı
  gerekiyor. Hukuki kayıt tutulduğu için atlanamaz.
- [ ] **Yan akışlar.** Şifresiz kullanıcı için şifre sıfırlama, e-posta
  değişimi, SSO ile açılmış hesaba şifreyle giriş — her biri karar ister.

**Ayrıca yorum içine alındı:** login sayfasındaki "Keep me signed in on this
device" kutusu (2026-08-18). Oturum çerezi her hâlükârda 30 gün
(`SESSION_TTL_SECONDS`); kutu hiçbir şey yapmıyordu. Anlamlı olması için uçta
kısa/uzun oturum ayrımı gerekir.

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

---

## Zip Export — Ertelenen Küçük İşler (final review triyajı, 2026-08-12)

Spec: `docs/superpowers/specs/2026-08-12-bulk-zip-export-design.md`.
Hiçbiri merge engeli değil; dosyaya bir daha dokunan alsın:

- [ ] `export.ts`: seçili id listesi sorgudan ÖNCE tavanla sınırlanmıyor
  (binlerce id DB sorgusuna girer; tavan exportable üstünde). Ucuz ön-guard.
- [ ] Route: tümü-sayı `senderIds` dizisi `[]`'a süzülüp "herkes" kapsamına
  genişliyor — dolu-ama-geçersiz diziyi reddetmek daha dürüst.
- [ ] SenderTable: `cancelled` çalışma alanına `no_exportable` kopyası
  yanıltıcı ("plan bitti" demiyor) · 401'de login'e yönlendirme yok ·
  diyalogda odak yönetimi/Escape yok (publish onayı da window.confirm —
  marka ayarları turunda ortak diyalog bileşeniyle birlikte ele al).
- [ ] `page.tsx` (senders): `primaryOrgId` render başına 3+ kez çözülüyor;
  sayfaya bir daha dokunulduğunda Promise.all'a katla.
- [ ] Spec §5 sıra cümlesi kodla çelişiyor (kod: canExport → tavan; doğrusu
  kodunki) — spec cümlesi güncellenecek.
- [ ] `Signature.templateId` kolonu `saveSignature`'da hiç yazılmıyor
  (gerçek kaynak `data.layout.templateId`; export doğru kaynağı kullanıyor).
  İkinci şablon gelince liste ekranı bayat gösterir — marka ayarları
  turunda ele al. (Bu daldan önce de vardı.)

---

## Marka Ayarları — Ertelenen Küçük İşler (final review triyajı, 2026-08-12)

Spec: `docs/superpowers/specs/2026-08-12-brand-settings-design.md`.
Hiçbiri merge engeli değil; dosyaya bir daha dokunan alsın:

- [ ] `brand-doc.ts`: `cta` value bekçisinde `Array.isArray` yok (JSON'dan
  erişilemez, label tip kontrolü yakalar) · hex büyük-harf ve cta-fazla-anahtar
  vakaları yalnız dolaylı kapsanıyor.
- [ ] `brand-apply.ts`: bindirme dokunmasa da `extras` undefined→{} kimlik
  kayması (davranış-nötr) · "her kilitli alan" testi 8 alanın 4'ünü sınıyor.
- [ ] `repo/brand.ts`: upsert son-yazan-kazanır (mevcut emsal; tek admin
  gerçekliğinde kabul).
- [ ] `export.ts`: `templateIdOf` fallback dalı testsiz (ikinci şablon gelince
  create-yolu kolonu da sınansın).
- [ ] `ConfirmDialog`: `.panel:focus-visible outline:none` — panel etkileşimsiz,
  düğme halkaları duruyor; tasarım tokenıyla yeniden ele al · odak tuzağı
  `:not([disabled])` süzmüyor ve kapanışta odak tetikleyiciye dönmüyor ·
  bileşen testi yok (DOM harness'i yok — ayrı iş).
- [ ] Brand ekranı: 401 (oturum düşmesi) jenerik mesaja düşüyor (tüm panel
  ekranlarında aynı) · "Not managed" satırlarında `htmlFor` render edilmeyen
  kontrole işaret ediyor · CTA inputlarının erişilebilir adı yalnız placeholder.
- [ ] Builder: kilit-UI kablolaması ve tohum akışı otomasyonsuz (tarayıcıyla
  doğrulandı; harness işi).
- [ ] ⚠️ FAZ 4 NOTU: `builder/page.tsx` markayı `primaryOrgId`'den çekiyor —
  çok-org'lu kullanıcıda İMZANIN org'undan (`got.signature.orgId`) çekilmeli.
  Ajans/müşteri org'ları gerçek olduğunda tek satırlık düzeltme.

---

## Account Tamamlama — Ertelenen Küçük İşler (final review triyajı, 2026-08-13)

Spec: `docs/superpowers/specs/2026-08-13-account-completion-design.md`.
Hiçbiri merge engeli değil; dosyaya bir daha dokunan alsın:

- [ ] Şablonlar: `emailChangedNoticeEmail`'de `newEmail` için düşman-girdi
  testi yok (EMAIL_SHAPE `<b>x@y.z`yi geçirir — kaçırma yük taşıyor, kod
  doğru; 3 satırlık test).
- [ ] Akışlar: parola-önce kontrol sırası yalnız kod okumasıyla kanıtlı ·
  `changePassword` yolundaki token temizliği testsiz (reset yolu testli,
  4 satır simetrik) · temizlik parola yazımıyla transaction'da değil
  (oturum iptaliyle aynı mevcut desen).
- [ ] Silme: org-başına üyelik sorgusu N+1 (üyelik sayısıyla sınırlı) ·
  "tek üyelik = owner" varsayımı denetimsiz · `Organization.parent`
  Restrict FK'sı ajans ağacı gelince silmede 500 üretir (atomik olduğundan
  güvenli; Faz 4'te ele al).
- [ ] Account UI: sayfa yüklemede mükerrer org-çözümleme sorguları ·
  diyalogda gizli-düğme yaklaşımının ekran okuyucu keşfedilebilirliği
  (ConfirmDialog geneli karar) · başarılı silmede yönlendirme uçarken
  düğmeler kısaca yeniden aktifleşiyor (kozmetik) · parola/e-posta formları
  tek busy/msg state paylaşıyor (kozmetik).
- [ ] Hukuk (avukat turuna birlikte): `LegalDocType` enum'unda `kvkk` yok —
  kabul yalnız `terms` için kaydediliyor; onay cümlesi üç belgeyi sayıyor
  (aydınlatma "kabul" değil "bilgilendirme" — ifade avukata sorulacak) ·
  metinlerdeki `[teyit edilecek]` yer tutucuları (ünvan, MERSİS/vergi no,
  adres, mahkeme, iletişim) Hüseyin+avukat dolduracak.
