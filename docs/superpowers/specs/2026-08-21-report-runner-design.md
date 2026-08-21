# Rapor Çalıştırıcısı — Tasarım

Tarih: 2026-08-21 · Onay: Hüseyin (sohbet) · Durum: onaylı tasarım

## Amaç

`ReportSchedule` satırlarını gerçekten koşturan, raporu üretip e-postayla
teslim eden ve `ReportExecution`/`ReportDelivery` defterlerini dolduran
çalıştırıcı. Bugüne kadar defterler bilinçli boştu (devir sözleşmesi:
sahte geçmiş üretilmez); bu iş o boşluğu gerçek koşularla kapatır.

Kapsam kararları (Hüseyin, 2026-08-21):

- **Format v1: `digest` + `csv`.** `pdf` üretilmez; `pdf` satırı gelirse
  koşu defterine dürüstçe `failed — format not implemented` yazılır.
- **Tetikleme: Plesk Scheduled Task + script.** `scripts/run-reports.ts`
  her sabah koşturulur; elle de koşturulabilir.
- **Rapor kapsamı: 5 'ready' raporun tamamı** (command-center,
  revenue-collections, product-activation, customer-health,
  security-evidence). `support-operations` 'partial' — kaynağı yok,
  registry'ye alınmaz; zamanlanırsa dürüst `failed`.

## Mimari karar: bağımsız veri katmanı

Rapor builder'ları `admin.ts`'i KULLANMAZ; doğrudan Prisma'ya sorar.

- `admin.ts`'in numaralandırma testi her export'tan personel kapısı
  bekler; çalıştırıcının personel oturumu yok. Kapıyı bypass eden
  sentetik personel kimliği güvenlik sözleşmesini deler — red.
- Rapor sorguları ekran sorgularının kopyası değil: ekranlar "şu an"ı
  gösterir, raporlar **pencere** ister (haftalık rapor = son 7 gün).
- Formül hizası `reporting-model.ts`'teki `KPI_DEFINITIONS` ile yorum
  düzeyinde sabitlenir (aşağıda rapor içerikleri).

## Modüller

```
apps/web/lib/job-run.ts            # withJobRun(name, fn) — cleanup-orphans'tan çıkarılır
apps/web/lib/reports/types.ts      # ReportResult ve yardımcı tipler
apps/web/lib/reports/builders/     # 5 builder (aşağıda içerikleri)
apps/web/lib/reports/registry.ts   # reportId → builder haritası
apps/web/lib/reports/render.ts     # SAF: digest HTML/text + CSV üretimi
apps/web/lib/reports/run.ts        # orkestrasyon — prisma/mailer/now enjekte
apps/web/scripts/run-reports.ts    # CLI girişi (+ --dry-run)
```

`lib/job-run.ts`: `cleanup-orphans.ts` içindeki `withJobRun` aynı
en-iyi-çaba semantiğiyle (defter yazılamıyorsa iş YİNE koşar) buraya
taşınır; `cleanup-orphans.ts` ve `run-reports.ts` ikisi de bunu kullanır.
JobRun kaydı: `name: 'run-reports'`, `queue: 'scheduled'`. `--dry-run`
da JobRun'a yazılır (cleanup emsali: o da gerçek bir koşudur).

### ReportResult (types.ts)

```ts
interface ReportResult {
  reportId: string;
  title: string;                       // REPORT_LIBRARY adıyla aynı
  window: { start: Date; end: Date };
  sections: Array<{
    heading: string;
    items: Array<{ label: string; value: string }>;
  }>;
  /** CSV eki için; yoksa csv formatlı zamanlama 'failed' olur. */
  table?: { columns: string[]; rows: Array<Array<string | number>> };
}
```

`ReportExecution.rowCount` = `table` varsa `table.rows.length`, yoksa
bölümlerdeki toplam item sayısı.

## Çalıştırıcı akışı (run.ts)

Giriş: `runDueReports({ prisma, mailer, now, dryRun })` →
`{ processed, succeeded, failed }` özeti (CLI loglar).

1. **Vadesi gelenler:** `status = 'active'` VE (`nextRunAt <= now` VEYA
   `nextRunAt IS NULL`). Null = SQL ile yeni açılmış satır; ilk tikte
   koşar (nextRunAt hesaplamadan satır açılabilsin diye).
2. **İzolasyon:** zamanlamalar sırayla ve birbirinden yalıtılmış koşar;
   birinin hatası diğerlerini durdurmaz.
3. **Koşu:** `ReportExecution` `running` + `startedAt` açılır → builder
   pencereyle koşar → render → her alıcıya (`ReportRecipient`) gönderim,
   alıcı başına `ReportDelivery` (`sent` | `failed` + detay ≤500).
4. **Sonuç:** builder başarılı VE **tüm** teslimler `sent` → `success`;
   aksi hâlde `failed` (kısmi teslim hatası da `failed` — paneldeki
   "attention" rozeti güvenli tarafta kalır). `error` alanına ilk
   hatanın özeti (≤500) yazılır.
5. **İlerletme:** `nextRunAt = nextPlannedRun(cadence, now)` — başarı da
   başarısızlık da ilerletir. Başarısız koşu ertesi tike fırtına gibi
   yığılmaz; hata rozetle görünür, kaçan pencere telafi edilmez (v1).
6. **Desteklenmeyen durum** (format `pdf`, kayıtlı olmayan `reportId`):
   execution açılır ve dürüst `failed` + açık hata metniyle kapanır;
   satır sessizce atlanmaz, nextRunAt yine ilerler.
7. **--dry-run:** builder + render koşar, özet stdout'a basılır;
   gönderim YOK, execution/delivery yazımı YOK, nextRunAt ilerlemez.
   (JobRun kaydı yine düşer.)

### Pencere matematiği

`end = now`; `start`:

- `daily` → end − 24 saat
- `weekly` → end − 7 gün
- `monthly` → end'in UTC ayı − 1 (JS `setUTCMonth`; 31 Oca → taşma
  bilinen JS davranışı, personel özeti için kabul — yorumda not düşülür)

v1 per-schedule `timezone` HESABA KATILMAZ: `nextPlannedRun` 07:00 UTC
sabitiyle çalışır (İstanbul sabahı). Kolon durur, ileride kullanılır.

## E-posta ve CSV

- **MailKind genişler:** `'report'` eklenir (`lib/mail/types.ts`).
  Şema değişmez — `MailDelivery.kind` zaten VarChar.
- **Attachment desteği:** `OutgoingMail`'e opsiyonel
  `attachments?: Array<{ filename: string; content: string; contentType: string }>`.
  `smtp.ts` nodemailer'a geçirir; `MemoryMailer` saklar (test görsün);
  log mailer adet/adı loglar. Sağlayıcı bağımsızlığı bozulmaz.
- **Digest:** mevcut şablon evi stilinde (`lib/mail/templates/`):
  table-based, inline stil, web-safe font; text fallback üretilir.
  Konu: `[Mailmyra] <rapor adı> — <pencere etiketi>`. Pencere etiketi
  UTC gün hassasiyetinde ISO aralıktır: `2026-08-14 → 2026-08-21`.
- **CSV:** `format = 'csv'` → digest gövdesi + `<reportId>-YYYY-MM-DD.csv`
  eki (`text/csv`). RFC-4180 kaçışı: virgül/tırnak/satır sonu içeren
  hücre çift tırnaklanır, içerideki `"` ikilenir. Builder `table`
  vermiyorsa csv zamanlaması `failed — report has no tabular output`.

## İçerik sınırı (sert kural)

Raporlara **müşteri kişisel verisi girmez**: üye/gönderici e-postası,
kişi adı, imza içeriği ASLA. İzinli içerik: agregalar + org düzeyi
ticari veri (org adı, koltuk sayısı, fatura tutarı — `listLeads`
emsali: Voldi'nin kendi ticari kaydı). `security-evidence` yalnız
Voldi personel e-postası + sayım taşır. Her builder dosyasının baş
yorumu bu sınırı tekrarlar; testler çıktıda müşteri e-postası
olmadığını doğrular.

## Rapor içerikleri (builder sözleşmeleri)

Formüller `KPI_DEFINITIONS` ile hizalı; para birimleri asla tek toplamda
karıştırılmaz (guardrail: `billed-revenue`).

1. **command-center** — platform özeti: toplam/aktif/deneme org sayısı ·
   aktif koltuk vs hak edilen koltuk · bekleyen/geciken fatura toplamları
   (para birimi başına) · pencerede yeni org · pencerede publish edilen
   imza · açık riskler (geciken fatura sayısı, pencerede failed JobRun,
   pencerede yeni ErrorGroup). `table`: yok (digest ağırlıklı) → csv
   zamanlanmaz.
2. **revenue-collections** — org başına: kesilen/tahsil edilen/bekleyen/
   geciken tutar (pencere: `issuedAt`) + para birimi başına toplamlar.
   `collection-rate` = paid/billed×100, void hariç. `table`: org satırları.
3. **product-activation** — pencere kohortu: açılan org · kayıtlı imzası
   olan · publish eden · export kanıtlı; `activation-rate` ve
   `export-evidence` oranları (kohort paydası sabit). `table`: kohort
   satırları (org adı + adım bayrakları).
4. **customer-health** — org başına: koltuk kullanımı (aktif/hak edilen,
   payda >0 guardrail'i) · son aktiviteden bu yana gün · geciken fatura
   bayrağı. `table`: org satırları.
5. **security-evidence** — pencerede: personel başına hassas okuma sayısı
   (StaffAccess) · ayrıcalıklı yazma sayısı (AdminAction) · burst sinyali
   sayısı (aynı personel + aynı org, 15 dakikada ≥5 okuma —
   `sensitive-read-burst` tanımı). `table`: personel satırları.

## Test planı (mevcut CALLS tarzı, vitest)

- `render.test.ts` — SAF: digest çıktısı table-based + inline stil
  (div-layout yok), text fallback dolu, CSV kaçışı (virgül/tırnak/yeni
  satır), pencere etiketi.
- `report-run.test.ts` — sahte prisma + MemoryMailer: due seçimi (null
  nextRunAt dahil, paused hariç) · execution/delivery yazımları ·
  success/failed semantiği (kısmi teslim hatası = failed) · nextRunAt
  her denemede ilerler · izolasyon (ilk zamanlama patlar, ikincisi
  koşar) · pdf ve bilinmeyen reportId dürüst failed · dry-run hiçbir
  defter yazmaz, göndermez.
- Builder testleri (5 dosya) — sahte prisma fixture'larıyla formül
  doğrulaması: oranlar, para birimi ayrımı, kohort paydası, burst
  eşiği; çıktıda müşteri e-postası geçmediği iddiası.
- `mail` testleri — attachment'ın smtp seçeneklerine geçtiği,
  MemoryMailer'da göründüğü, `kind: 'report'` teslim defterine düştüğü.

## Dağıtım ve işletme

- **Migration YOK** — şema değişmiyor; normal deploy yeter
  (`node scripts/deploy.js --skip-build` ritüeli aynen).
- `apps/web/package.json`'a script: `"reports": "tsx scripts/run-reports.ts"`.
- **Plesk Scheduled Task (kurulum Hüseyin'de):** her gün **10:15
  Europe/Istanbul** (`nextPlannedRun` 07:00 UTC = 10:00 İstanbul'a planlar;
  daha erken görev vadesi gelmemiş bulur, rapor bir gün gecikir),
  uygulama kökünde `npm run reports -w apps/web`
  (yol tuzağı: Plesk kutusu komut başına `npm` ekler; Node PATH hatası
  çıkarsa app kökünde `.npmrc` + `scripts-prepend-node-path=true` —
  deploy dokümanındaki bilinen tuzak). Script `DATABASE_URL` ve
  `MAIL_*` env'lerini uygulamayla aynı ortamdan okur.
- Gözlem: koşular panelde üç yerden görünür — Jobs (`run-reports`
  JobRun) · Reports → Scheduled (execution/delivery) · Platform → Mail
  (`kind: 'report'` teslimleri).

## İlk zamanlama (SQL ile — devir §7 gereği UI'da oluşturma yok)

Örnek: haftalık command-center digest'i Hüseyin'e:

```sql
INSERT INTO ReportSchedule
  (id, reportId, cadence, timezone, format, status, ownerEmail, createdByEmail, createdAt)
VALUES
  ('sched-cmdcenter-weekly-1', 'command-center', 'weekly', 'Europe/Istanbul',
   'digest', 'active', 'mail@voldi.net', 'mail@voldi.net', NOW());

INSERT INTO ReportRecipient (id, scheduleId, email)
VALUES ('rcpt-cmdcenter-weekly-1', 'sched-cmdcenter-weekly-1', 'mail@voldi.net');
```

(`nextRunAt` boş bırakılır — ilk tikte koşar ve kendini ilerletir.)

## v1'de bilinçli YOK

- PDF üretimi (kütüphane bağımlılığı — ihtiyaç doğunca)
- Per-schedule timezone hesabı (07:00 UTC sabiti; kolon durur)
- Yeniden deneme / backoff / kaçan pencere telafisi
- UI'dan zamanlama oluşturma/duraklatma (karar altyapısıyla birlikte)
- `support-operations` raporu (kaynak entegrasyonu yok)
