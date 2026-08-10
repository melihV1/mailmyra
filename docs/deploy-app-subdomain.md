# app.mailmyra.com — ilk deploy provası

Faz 1 / adım 8. Ana sitenin kanıtlanmış hattı aynen kullanılıyor
(`apps/web/web.config` + `server.js` + FTPS); farklar: veritabanı, e-posta
env'leri ve panelden koşulan migration.

Zemin (hazır ✅): subdomain açık · Node.js 24.14.1 tanımlı · SSL · FTPS ·
MariaDB 11.8.3'te `mailmyra_app` + kullanıcı (yalnız yerel bağlantı).

## A. Bir kez — ilk kurulum

1. **Repo ağacını yükle** (FTPS, uygulama kökü `/app.mailmyra.com`):
   kök `package.json` + `package-lock.json` · `apps/web` (`.next` HARİÇ —
   o adım C'de gider) · `packages/renderer` + `packages/core`.
   `node_modules` ASLA taşınmaz (sharp'ın Windows ikilisi sunucuda kurulur).
2. **Başlangıç dosyası**: Plesk > Node.js > `app.js` → **`server.js`** yap
   (Application root: `apps/web` olacak şekilde; `web.config` ve `server.js`
   zaten orada).
3. **Env**: `.env.production.example`'ı sunucuda `apps/web/.env.local`
   olarak doldur. Yeni zorunlular: `DATABASE_URL` (host **localhost**),
   `APP_URL=https://app.mailmyra.com`, `MAIL_HOST/PORT/FROM`.
   ⚠️ MAIL boş kalırsa kayıt/sıfırlama uçları **bilerek** 500 döner.
4. **Komut dosyası çalıştır** → `npm ci`
   ("node PATH'te yok" hatası çıkarsa: `apps/web/.npmrc` repoda var,
   `scripts-prepend-node-path=true` — yüklendiğinden emin ol.)
   `npm ci` sonunda `postinstall` Prisma istemcisini kendisi üretir.

## B. Bir kez — veritabanı doğrulaması (prova checklist'i)

Panel > Veritabanları > phpMyAdmin, `mailmyra_app` üzerinde:

| Kontrol | Komut | Beklenen |
|---|---|---|
| Strict mod | `SELECT @@sql_mode` | `STRICT_TRANS_TABLES` içermeli. **İçermiyorsa geçersiz ENUM sessizce `''` olur, rol kontrolü çöker** — bana haber ver, şemaya CHECK ekleriz |
| Collation | migration'dan sonra `SHOW CREATE TABLE User` | `COLLATE utf8mb4_unicode_ci` (migration kendisi yazıyor; sunucu varsayılanı ne olursa olsun) |
| JSON | `SHOW CREATE TABLE Signature` | `data` kolonunda `CHECK (json_valid(...))` |

## C. Her deploy — döngü

```
Mac'te:  npm run deploy        (build + .next ve prisma/ FTPS ile gider)
Panelde: uygulamayı DURDUR yüklemeden ÖNCE (Windows dosya kilidi!)
         (şema değiştiyse) Komut dosyası çalıştır → npx prisma migrate deploy
         uygulamayı BAŞLAT
```

`.env.deploy` içinde `DEPLOY_FTP_REMOTE=/app.mailmyra.com/apps/web`
(ana siteninkinden FARKLI — karıştırma; istersen iki ayrı `.env.deploy.*`
dosyası tut, script `cp` ile seçilir).

## D. İlk deploy'dan sonra — kabul testi

1. `https://app.mailmyra.com/signup` → gerçek adresinle kaydol
2. Doğrulama e-postası **gerçekten geldi mi?** (İlk canlı SMTP sınavı —
   spam klasörüne de bak. Gelmediyse `docs/email-setup.md` aday ayarları)
3. Linke tıkla → panelde şerit kayboldu mu
4. Builder'da imza kur → "Saved · SS:DD" göstergesi
5. `EXPORT_REQUIRES_AUTH=true` iken çıkışsız pencereden export dene →
   `/login`'e düşmeli
6. Panel > Node.js log'larında hata var mı

## Bilinen tuzaklar (hepsi yaşandı)

- `web.config`'e `security`/`httpErrors`/`nodeProcessCommandLine` EKLEME —
  tüm site 0 baytlık 500 olur (2026-07-27)
- Uygulama durmadan yükleme → kilitli dosyalar, yarım `.next`, "module not
  found" fırtınası
- `next build`'i sunucuda KOŞMA — build Mac'te alınır, çıktı taşınır
- `SHADOW_DATABASE_URL` prod'a YAZILMAZ (`migrate deploy` istemez)
