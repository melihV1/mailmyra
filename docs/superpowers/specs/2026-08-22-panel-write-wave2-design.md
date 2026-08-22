# Panel Yazma Dalgası 2 — Tasarım

Tarih: 2026-08-22 · Onay: Hüseyin (sohbet) · Durum: onaylı

## Amaç ve kapsam (Hüseyin: "hepsini yapalım")

Paneldeki son SQL-bağımlı/salt-okunur yüzeyler yazılabilir olur:
① destek vakaları ② hata grubu durumları ③ lead'ler ④ rapor zamanlamaları
⑤ staff yetkisi (**onay akışından geçer** — Hüseyin kararı). Artı ön koşul:
⓪ yerel dev sunucusu düzeltilir (instrumentation/mariadb 500'ü) — bu dalga
5 ekrana UI ekliyor, kör deploy edilmez. Makul denemede çözülmezse dalga
bloklanmaz (canlı doğrulamaya düşülür), iş ayrı görev olarak kalır.

## Ortak sözleşme (governance dalgasının aynısı)

`requireStaff` → `requireReason` → tek `$transaction` (iş + `audit()`);
denetim yazılamazsa rollback; P2002 dostu Türkçe mesaj (duck-typing);
müşteri aktivitesi YAZILMAZ; org'suz kayıtlar `PLATFORM_ORG` nöbetçisiyle
denetlenir; numaralandırma testine CALLS + boş-sebep listesi girişleri.
`audit()` action birliğine eklenir: `support.case_created` ·
`support.case_status_set` · `support.case_owner_set` ·
`support.case_priority_set` · `error.state_set` · `lead.created` ·
`lead.updated` · `report.schedule_created` · `report.schedule_status_set`
· `staff.flag_set`.

**Kişisel veri:** `requesterEmail` (destek) hiçbir denetim payload'ına ve
rapor çıktısına girmez (KVKK kuralının aynısı; denetim `reference` taşır).
Lead `contact` Voldi'nin kendi ticari kaydı (listLeads emsali) ama denetim
payload'ları yine yalnız `company` + değişen alanları taşır. Staff/alıcı
e-postaları iç personel — payload'da serbest.

## ① Destek vakaları (4 fonksiyon + `lib/support-sla.ts`)

```ts
// lib/support-sla.ts — SAF (admin.ts dışında, report-schedule emsali)
export const SUPPORT_SLA_HOURS = { urgent: 4, high: 24, normal: 48, low: 120 } as const;
export type SupportPriority = keyof typeof SUPPORT_SLA_HOURS;
export function slaDueDate(from: Date, priority: SupportPriority): Date; // from + saat
```

- `createSupportCase(staffUserId, input { reference; subject; requesterEmail;
  channel:'email'|'form'|'staff'; category:'billing'|'builder'|'export'|
  'access'|'account'; priority: SupportPriority; orgId?; summary? }, reason,
  ctx) → { id }` — `slaDueAt` KOD hesaplar (`slaDueDate(now, priority)`);
  org verilmişse var olmalı (adı kopyalanır), yoksa `orgName ''` + platform
  nöbetçisi denetim; referans P2002 → "Bu referans zaten kullanılmış.";
  requesterEmail `@` içermeli, küçük harfe çekilir.
- `setSupportCaseStatus` — geçiş haritası: `open → waiting_customer|
  escalated|resolved` · `waiting_customer → open|escalated|resolved` ·
  `escalated → open|resolved` · `resolved → open` (yeniden açma). Dışı:
  "'X' durumundan 'Y' durumuna geçilemez."
- `assignSupportCaseOwner` — sahip yalnız staff ("Sahip personel olmalı.");
  `resolved` vakaya atanamaz ("Kapatılmış vakaya sahip atanamaz.").
- `setSupportCasePriority` — `resolved`a uygulanmaz; **`slaDueAt`
  `createdAt`ten yeniden hesaplanır** (dürüst taban: vaka ne zaman
  açıldıysa saat oradan işler).

## ② Hata grupları (1)

- `setErrorGroupState(staffUserId, groupId, state, reason, ctx)` — harita:
  `open → investigating|resolved` · `investigating → open|resolved` ·
  `resolved → open` (hata geri geldi). Platform nöbetçisi denetim.

## ③ Lead'ler (2)

- Aşama birliği **`lost` ile genişler**: `new|qualified|scheduled|won|lost`
  (kolon varchar — migration yok; görünümlerdeki rozet/tip birliği de
  güncellenir, `lost` = danger tonu).
- `createLead(staffUserId, input { company; contact; source; seats?≥1;
  stage?; nextStep? }, reason, ctx) → { id }`.
- `updateLead(staffUserId, leadId, patch { stage?; nextStep?; seats?≥1 },
  reason, ctx)` — en az bir alan; before/after denetimde.

## ④ Rapor zamanlamaları (2)

- `createReportSchedule(staffUserId, input { reportId; cadence:'daily'|
  'weekly'|'monthly'; format:'digest'|'csv'; recipients: string[] }, reason,
  ctx) → { id }` — bekçiler: `reportId` registry'de KOŞTURULABİLİR olmalı
  ("Bu rapor koşturulamıyor."); `csv` + tablosuz rapor reddedilir
  (registry'den `TABLELESS_REPORTS = ['command-center']` export'u — "Bu
  raporun tablo çıktısı yok."); alıcı 1–10 adet, hepsi `@` içerir,
  küçük harf. Satırlar: ReportSchedule (`timezone 'Europe/Istanbul'`,
  `status 'active'`, `ownerEmail/createdByEmail = staff.email`,
  **`nextRunAt null`** → ertesi 10:15 koşusunda vadeli sayılır) +
  ReportRecipient'lar aynı tx'te. Denetim payload'ı alıcı SAYISI taşır.
- `setReportScheduleStatus(staffUserId, scheduleId, 'active'|'paused',
  reason, ctx)` — yalnız diğer durumdan.
- `scripts/seed-report-schedule.ts` EMEKLİ: dosya ve npm script'i silinir
  (kayıt açmanın tek yolu artık panel; docs/report-runner.md güncellenir).

## ⑤ Staff yetkisi — onayın İLK gerçek icrası (1 yazma + 1 okuma)

İlke korunur: **onay hiçbir şeyi otomatik uygulamaz** — icra ayrı, bilinçli
adım. Akış: talep → karar → icra.

1. Security → Staff'tan "Request staff change" diyaloğu mevcut
   `createApprovalRequest`/rotasını kullanır: `domain 'security'`,
   `targetType 'staff_grant' | 'staff_revoke'`, `targetId = hedef e-posta
   (küçük harf)`, başlık otomatik ("Grant staff — x@y").
2. Karar mevcut akışta (bugün self-approval).
3. `setStaffFlag(staffUserId, targetEmail, grant: boolean,
   approvalRequestId, reason, ctx)` — tx içinde bekçiler:
   - Talep VAR + `status 'approved'` + `domain 'security'` + `targetType`
     eyleme uyar + `targetId` hedef e-postaya eşit ("Bu işlem için
     onaylanmış talep yok.").
   - Talep daha önce İCRA EDİLMEMİŞ: `ApprovalEvent type 'executed'`
     kaydı yoksa ("Bu onay zaten kullanılmış."). İcra sonunda `executed`
     olayı yazılır (olay tip birliğine `executed` eklenir — kolon varchar,
     migration yok). Aynı onay iki kez harcanamaz.
   - Hedef kullanıcı VAR; grant'te zaten staff değil ("Zaten personel."),
     revoke'ta staff ("Zaten personel değil.").
   - **Kilitlenme bekçisi:** revoke sonrası staff sayısı ≥ 1 kalmalı
     ("Son personelin yetkisi düşürülemez.").
   - `user.isStaff` güncellenir; denetim `staff.flag_set` (platform
     nöbetçisi, before/after isStaff, targetId = user id).
4. Okuma: `listStaffChangeRequests(staffUserId)` — domain security +
   targetType staff_* talepleri `{ id, targetType, targetId, status,
   executed }` döndürür (executed = 'executed' olayı var mı). Kişisel veri
   yok (personel e-postaları) → günlüksüz; CALLS'a girer. Staff sayfası
   bununla satır başına "Execute" düğmesini gösterir (approved + !executed
   + e-posta eşleşen talep).

## Destek rapor builder'ı (`support-operations` 'ready' olur)

`buildSupportOperations(db, window)` — bölümler: açık vaka sayıları
(status/priority kırılımı) · **SLA aşımı** (slaDueAt < end && status ≠
resolved) · pencerede açılan vaka · escalated sayısı. Tablo: açık vakalar
[reference, org('—'), category, priority, status, vade durumu] —
**requesterEmail ASLA girmez**. Registry + REPORT_LIBRARY girişi 'ready'a
çevrilir. `support-sla` KPI'ı **source-gap KALIR**: şemada `resolvedAt`
yok, uyum yüzdesi dürüstçe hesaplanamaz (migration bu dalgada bilinçli
yok; guardrail notu güncellenir).

## API uçları (10, `_shared` sözleşmesi)

```
POST /api/admin/support                    { reference, subject, requesterEmail, channel, category, priority, orgId?, summary?, reason }
POST /api/admin/support/[id]/status        { status, reason }
POST /api/admin/support/[id]/owner         { ownerEmail, reason }
POST /api/admin/support/[id]/priority      { priority, reason }
POST /api/admin/errors/[id]/state          { state, reason }
POST /api/admin/leads                      { company, contact, source, seats?, stage?, nextStep?, reason }
POST /api/admin/leads/[id]                 { stage?, nextStep?, seats?, reason }
POST /api/admin/report-schedules           { reportId, cadence, format, recipients[], reason }
POST /api/admin/report-schedules/[id]/status { status, reason }
POST /api/admin/staff/flag                 { targetEmail, grant, approvalRequestId, reason }
```

**Governance dalgasının Critical dersi bağlayıcıdır:** `field()` yalnız
string döndürür — `seats` (number), `grant` (boolean), `recipients`
(array) ham gövdeden tip kontrolüyle okunur ve **create rotalarının HER
BİRİ için gövde→repo-argümanı smoke testi yazılır** (api-approvals-route
emsali). Enum'lar uçta da doğrulanır.

## UI (5 ekran; kabuk/menü değişmez, yerleşik dersler bağlayıcı)

Tek-modal kuralı (butonlar seçimi bildirir, diyalog detayın YERİNE açılır)
· preview'da aksiyon render edilmez · sebep her diyalogda zorunlu ·
başlık düğmeleri `btn-primary btn-sm` · kart/blok `w-100` dersi ·
İngilizce UI metni. Ekranlar: Support queue+cases (oluştur + durum/sahip/
öncelik) · Platform → Errors (durum) · Growth → Leads (oluştur + güncelle)
· Reports → Scheduled (oluştur + duraklat/sürdür) · Security → Staff
(talep aç + icra düğmesi). Görsel doğrulama: Görev 0 başarılıysa yerel
önizleme rotalarında; değilse canlıda Hüseyin.

## Test planı

Gate (CALLS + boş-sebep, otomatik) · her yazma için geçiş/bekçi testleri
(governance test dosyaları desen) · SLA matematiği saf test · staff icra
bekçileri (onaysız/yanlış hedef/çift icra/son-staff) · builder içerik +
requesterEmail yokluğu iddiası · create rotaları smoke testleri ·
registry/TABLELESS tutarlılığı.

## Kapsam dışı (bilinçli)

`resolvedAt` migration'ı ve SLA uyum yüzdesi · vaka olay defteri (şemada
yok) · bildirimler · onay icrasının staff dışına genişletilmesi · content/
media/playbooks/flags yüzeyleri (kod-katalog/salt-okunur kalır).
