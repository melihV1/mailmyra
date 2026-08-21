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

## Zamanlama açma (SQL — UI'da oluşturma bilinçli yok)

```sql
INSERT INTO ReportSchedule
  (id, reportId, cadence, timezone, format, status, ownerEmail, createdByEmail, createdAt)
VALUES
  ('sched-cmdcenter-weekly-1', 'command-center', 'weekly', 'Europe/Istanbul',
   'digest', 'active', 'mail@voldi.net', 'mail@voldi.net', NOW());

INSERT INTO ReportRecipient (id, scheduleId, email)
VALUES ('rcpt-cmdcenter-weekly-1', 'sched-cmdcenter-weekly-1', 'mail@voldi.net');
```

`nextRunAt` boş bırakılır — ilk koşuda çalışır ve kendini ilerletir.
Koşturulabilir raporlar: `command-center` (yalnız digest — tablosu yok) ·
`revenue-collections` · `product-activation` · `customer-health` ·
`security-evidence`. Format: `digest` | `csv` (`pdf` v1'de yok — dürüst
'failed' yazar).

## Gözlem

- **Jobs** ekranı: `run-reports` koşuları (JobRun)
- **Reports → Scheduled**: son koşu/teslim durumu; başarısız koşu
  "attention" rozeti verir
- **Platform → Mail**: `kind: 'report'` teslim defteri satırları
