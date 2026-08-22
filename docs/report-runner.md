# Rapor çalıştırıcısı — işletme notu

Tasarım: `docs/superpowers/specs/2026-08-21-report-runner-design.md`

## Ne yapar

Vadesi gelen `ReportSchedule` satırlarını koşturur: raporu üretir, digest
(+ csv formatında CSV eki) olarak alıcılara e-postalar, `ReportExecution`/
`ReportDelivery` defterlerini yazar, `nextRunAt`'ı ilerletir. Tamamı
`run-reports` adlı `JobRun` kaydına sarılıdır.

## Çalıştırma

```bash
npm run reports -w apps/web              # gerçek koşu
npm run reports -w apps/web -- --dry-run # üretir; göndermez, defter yazmaz
```

`DATABASE_URL` ve `MAIL_*` ortam değişkenleri uygulamayla aynı yerden gelir.

## Plesk Scheduled Task (kurulum Hüseyin'de)

- Zaman: her gün **10:15 Europe/Istanbul**. Sebep: `nextPlannedRun`
  koşuları 07:00 **UTC**'ye (=10:00 İstanbul) planlar; daha erken bir görev
  (örn. 07:15 İstanbul = 04:15 UTC) o günün vadesini henüz gelmemiş bulur
  ve her rapor bir gün gecikir. 10:15'te koşan görev aynı sabah teslim eder.
- Komut: uygulama kökünde `npm run reports` (Plesk Node panelinden "Komut
  dosyası çalıştır" ile `reports`). ⚠️ Bilinen tuzak: "node PATH'te yok"
  hatası çıkarsa app kökünde `.npmrc` + `scripts-prepend-node-path=true`
  (deploy ritüelindeki notla aynı).

## Zamanlama açma (bu dalga: panele taşınıyor)

Zamanlama açma bu dalgada **panele** taşınıyor: Reports → Scheduled →
"New schedule". Yazma tarafı hazır — `lib/repo/admin.ts`'teki
`createReportSchedule` bekçileriyle birlikte kilitli: `reportId` registry'de
koşturulabilir olmalı ("Bu rapor koşturulamıyor."), `csv` tablosuz raporla
açılamaz ("Bu raporun tablo çıktısı yok." — `command-center`), alıcı 1-10
tekil adet ve hepsi `@` içermeli (aynı adres iki kez girilirse sessizce
tekilleşir, hata vermez). Zamanlama satırı ile alıcılar AYNI transaction'da
yazılır; `nextRunAt` boş bırakılır — ilk koşuda vadesi gelmiş sayılır ve
kendini ilerletir. Duraklatma/sürdürme aynı ekrandan `setReportScheduleStatus`
ile — yalnız diğer durumdan geçilir.

**Ancak bu dalganın API ucu ve ekranı henüz sonraki görevlerde geliyor** —
bu yüzden şimdilik zamanlama açmanın çalışan bir yolu yok; panel işi aynı
sürümde tamamlanınca bu bölüm gerçeği yansıtır. Eski yol
(`scripts/seed-report-schedule.ts` + `npm run seed-reports`) **EMEKLİ** ve
dosya silindi — panel işi bitene kadar elle script/SQL'e geri dönülmez.

Koşturulabilir raporlar: `command-center` (yalnız digest — tablosu yok) ·
`revenue-collections` · `product-activation` · `customer-health` ·
`security-evidence` · `support-operations`. Format: `digest` | `csv`
(`pdf` v1'de yok — dürüst 'failed' yazar).

## Gözlem

- **Jobs** ekranı: `run-reports` koşuları (JobRun)
- **Reports → Scheduled**: son koşu/teslim durumu; başarısız koşu
  "attention" rozeti verir
- **Platform → Mail**: `kind: 'report'` teslim defteri satırları
