# Plesk (Windows/IIS + iisnode) Deploy Rehberi

Amaç: uygulama sunucuda çalışsın, yüklenen görseller DOĞRUDAN
`cdn.mailmyra.com` docroot'una yazılsın — elle FTP taşıma döngüsü bitsin.

Zaman kutusu: **2 saat**. Oturmazsa bu dosyanın sonundaki Linux VM
alternatifine geç (karar: 2026-07-25).

---

## Ön koşullar (RDP'de bir kez)

1. **Node 24** kurulu mu: `node -v` → v24.x. Yolu not al (varsayılan:
   `C:\Program Files\nodejs\node.exe` — `web.config`'teki
   `nodeProcessCommandLine` ile AYNI olmalı, değilse web.config'i güncelle).
2. **npm** Node ile birlikte gelir: `npm -v` → 10+ yeterli. (Proje npm
   workspaces kullanır; pnpm/corepack GEREKMEZ.)
3. **iisnode** kurulu mu: `C:\Program Files\iisnode\` var mı? Yoksa
   iisnode x64 MSI kur (github.com/Azure/iisnode releases).
4. **IIS URL Rewrite** modülü kurulu mu? (Plesk'te genelde var; yoksa
   Microsoft URL Rewrite 2.1 MSI.) Eksikse belirti: HTTP 500.19.

## Kurulum

5. Repoyu sunucuya al (git varsa):
   ```
   git clone <repo-url> C:\apps\mailmyra
   ```
   Git yoksa: Mac'te `git archive -o mailmyra.zip HEAD` → zip'i kopyala aç.
   (`node_modules`, `.next`, `public/cdn-*` TAŞINMAZ — sunucuda üretilir.
   Mac'in node_modules'ü Windows'ta ÇALIŞMAZ: sharp native binary'si
   platforma özgü.)
6. Bağımlılık + build. **Komutlar HER ZAMAN repo KÖKÜNDE çalışır —
   `apps\web` içinde ASLA `npm install` çalıştırma** (sebep aşağıda):
   ```
   cd C:\apps\mailmyra
   npm ci
   npm run build -w apps/web
   ```
   `npm ci` (install değil): `package-lock.json`'ı birebir uygular ve
   `node_modules`'ü sıfırdan kurar — bozuk şekilli bir ağacı miras almaz.

   > **Neden bu kadar önemli:** npm workspaces `react`/`react-dom`'u KÖK
   > `node_modules`'e hoist eder. `apps\web` içinde `npm install`
   > çalıştırılırsa oraya İKİNCİ bir React kopyası iner; o zaman uygulama
   > bir React örneğini, `react-dom` başka birini görür, dispatcher null
   > kalır ve build şununla patlar:
   > `TypeError: Cannot read properties of null (reading 'useContext')` +
   > `Error occurred prerendering page "/404"`. Kopyalar AYNI sürüm olsa
   > bile olur. `apps/web` build'i artık `prebuild` adımında bunu kontrol
   > eder ve sebebi açıkça yazarak durur (2026-07-25'te bu sunucuda yaşandı).
7. **Env dosyası** `C:\apps\mailmyra\apps\web\.env.local`:
   ```
   CDN_WRITE_PATH=C:\Inetpub\vhosts\mailmyra.com\cdn.mailmyra.com
   CDN_PUBLIC_URL=https://cdn.mailmyra.com
   EXPORT_REQUIRES_AUTH=false
   ```
   `CDN_WRITE_PATH` = cdn subdomain'inin GERÇEK docroot'u — Plesk >
   Websites & Domains > cdn.mailmyra.com > Hosting Settings > Document root
   içindeki yolu birebir kullan.

## Plesk vhost

8. Uygulama için subdomain aç (öneri: **app.mailmyra.com**), Document
   root'u `C:\apps\mailmyra\apps\web` yap. SSL sertifikası (Let's Encrypt)
   ver. Dedicated application pool kullan.
9. **Yazma izni:** uygulamanın app pool kimliğine (Plesk'te genelde
   subscription'ın sistem kullanıcısı / `IIS AppPool\<pool>`) cdn
   docroot'unda **Modify** izni ver (klasör > Properties > Security).
   Ayrıca `C:\apps\mailmyra\apps\web` altında `iisnode\` log klasörünü
   yazabilmeli (aynı kimliğe Modify).

## İlk çalıştırma

10. Statik ikonları sunucuda bir kez üret:
    ```
    cd C:\apps\mailmyra\apps\web
    set CDN_WRITE_PATH=C:\Inetpub\vhosts\mailmyra.com\cdn.mailmyra.com
    npm run icons
    ```
    Beklenen: `icons: 16 yazıldı, 0 atlandı (mevcut).` (daha önce elle
    yüklediğin filled/outline varsa "atlandı" sayısı artar — normal,
    değişmezlik koruması).
11. Tarayıcıda `https://app.mailmyra.com/builder` aç:
    - Sosyal ekle + "Tek renk" → `https://cdn.mailmyra.com/icons/mono-719ad1/...`
      ikonları önizlemede GÖRÜNMELİ (endpoint dosyayı cdn docroot'una yazar,
      IIS anında servis eder).
    - Görseller adımından bir avatar yükle → dönen URL
      `https://cdn.mailmyra.com/<16hex>.jpg|png` anında açılmalı.
12. `/dev/render` prod'da bilerek 404'tür (NODE_ENV=production) — test
    .htm dosyaları yerelde üretilir (`npm run emit -w packages/renderer`),
    artık URL'ler sunucuda gerçek olduğu için
    doğrudan Gmail/Outlook'a gider.

## Panel-only ortam (SSH yok) — komut kartı

Plesk panelinden yalnızca `npm run <script>` çalıştırılabiliyorsa, shell
gerektirmeyen karşılıklar:

| Amaç | Komut (repo KÖKÜNDE) |
|---|---|
| Ortam teşhisi (önce bunu çalıştır) | `npm run doctor` |
| Yalnız build çıktısını sil (`.next`) | `npm run clean` |
| `.next` + tüm `node_modules` sil | `npm run clean:all` |
| Kurulum (lock'a birebir) | `npm ci` |
| Build | `npm run build -w apps/web` |

`npm run doctor` node sürümünü, hangi dosyaların var/yok olduğunu, React'in
nereden çözüldüğünü ve ağaçtaki TÜM react kopyalarını listeler. Bir sorunda
önce bunun çıktısını al — build'i patlatmadan durumu gösterir.

> **Not — `--ignore-scripts`:** paneller npm'i çoğu kez bu bayrakla çalıştırır
> ve o modda `pre`/`post` lifecycle script'leri SESSİZCE atlanır. Bu yüzden
> React kontrolü `prebuild` değil, doğrudan `build` script'inin içindedir —
> atlanamaz.

## Sorun giderme

- **500.19** → URL Rewrite modülü eksik (adım 4).
- **iisnode 500 / boş sayfa** → `apps\web\iisnode\*.log` dosyalarına bak
  (stdout/stderr orada). En sık: yanlış `nodeProcessCommandLine` yolu.
- **`next` bulunamadı** → kurulum kökten yapılmamış; kökten `npm ci`.
- **`Cannot read properties of null (reading 'useContext')` + `/404`
  prerender hatası** → iki React kopyası. Build'in ilk adımı bunu yakalar
  ve TÜM kopyaların yolunu yazar. Kurtarma (kökte, sırayla):
  ```
  npm run clean:all
  npm ci
  npm run build -w apps/web
  ```
  Kopya `node_modules\react-dom\node_modules\react` gibi İÇ İÇE de olabilir —
  dosya yöneticisinde üst düzeye bakmak yetmez, `npm run doctor` kullan.
- **Upload 500 + "Sunucu yapılandırması eksik"** → .env.local okunmuyor
  (dosya adı/konumu) veya CDN_WRITE_PATH yolu yanlış.
- **Upload 500 EPERM/EACCES** → adım 9'daki yazma izni.
- **Kaydedilen görsel URL'i 404** → CDN_WRITE_PATH docroot ile aynı yer
  değil (Plesk'teki gerçek Document root'u tekrar kontrol et).
- **413 (büyük dosya)** → hem route (5MB) hem web.config
  `maxAllowedContentLength` (6MB) sınırı var; ikisi bilinçli.

## Güncelleme akışı (sonraki deploylar)

```
cd C:\apps\mailmyra
git pull
npm ci
npm run build -w apps/web
```
Sonra IIS'te app pool'u Recycle et (Plesk > Hosting Settings yeterli;
iisnode `watchedFiles` server.js/web.config değişince kendisi de yeniler).

---

## 2 saatte oturmazsa: Linux VM alternatifi

iisnode + Next App Router kombinasyonu en riskli parça (streaming
tamponlama, workspace symlink'leri, native modül izinleri). Takılırsan:

- Küçük bir Ubuntu VM (aynı veri merkezinden alınabilir): Node 24 +
  `next start` + nginx reverse proxy + pm2/systemd. Bilinen, sıkıcı,
  sağlam yol; bu repo hiçbir değişiklik istemez (server.js/web.config
  sadece IIS'te anlamlı, Linux'ta yok sayılır).
- `cdn.mailmyra.com` DNS'i o VM'e alınır, dosyalar rsync ile taşınır —
  URL'ler değişmediği için sahadaki imzalar ETKİLENMEZ (CDN domain
  kararının tam amacı buydu).
- Karar Hüseyin'in; maliyet: VM kirası + bir kez ~yarım gün taşıma.
