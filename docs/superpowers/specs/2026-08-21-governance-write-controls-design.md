# Onay + KVKK Yazma Kontrolleri — Tasarım

Tarih: 2026-08-21 · Onay: Hüseyin (sohbet) · Durum: onaylı

## Amaç ve kilitli kararlar

Devir sözleşmesi §7 gereği bugüne dek kapalı tutulan karar/oluşturma
kontrolleri, dört şart (yetki + kalıcılık + denetim + hata yolu) BİRLİKTE
gelecek şekilde açılır. Hüseyin kararları (2026-08-21):

- **Kapsam: Onay + KVKK.** SupportCase yazmaları sonraki adım.
- **Kayıt açma panelden** — SQL/phpMyAdmin bağımlılığı biter.
- **Self-approval serbest** (tek kişilik ekip gerçeği). Dört göz ileride
  `requiredApprovals` ile gelir; şema hazır, kod bugün de saygı duyar
  (onay sayısı `requiredApprovals`'a ulaşmadan `approved` olmaz).
- **UI benden:** kabuk/menüye dokunulmaz; mevcut sayfalara satır aksiyonu +
  diyalog (`InvoiceRowActions` emsali, Vuexy markup kopyalama kuralı).

## Yazma sözleşmesi (markInvoicePaid emsalinin aynısı)

Her fonksiyon: `requireStaff` → `requireReason` → tek `$transaction`
içinde (iş + `audit(tx, staff, {...before/after, reason, ctx})` + yaşam
döngüsü olay defteri satırı). Denetim yazılamazsa rollback. P2002 dostu
mesaja çevrilir. Numaralandırma testi yeni export'ları otomatik kapsar.

**Bilinçli sapma — müşteri aktivitesi YAZILMAZ:** entitlement/fatura
yazmalarının aksine onay/KVKK kayıtları iç yönetişimdir; müşterinin kendi
panelinde gördüğü aktivite akışına yazmak yönetişim operasyonunu müşteriye
SIZDIRIR. Denetim izi yalnız `AdminAction` + olay defterlerindedir.

**Kişisel veri kuralları:** `subjectEmail` `AdminAction` before/after
payload'ına ASLA girmez (denetim kaydı `reference` + durum taşır).
Org'suz kayıtta audit org'u nöbetçidir: `{ id: 'platform', name:
'Mailmyra platform' }`. `orgId` verilmişse org gerçekten var olmalı
(ad kopyalanır); yoksa hata.

## Repo fonksiyonları (`lib/repo/admin.ts`, 9 yeni export)

### Onay (3)

```ts
createApprovalRequest(staffUserId, input: {
  title: string; domain: 'entitlement'|'billing'|'security'|'platform';
  riskLevel: 'medium'|'high'|'critical'; orgId?: string;
  targetType?: string; targetId?: string; requiredApprovals?: number; // 1..3, default 1
}, reason: string, ctx?): Promise<{ id: string }>
```
`status='pending'`, `requestedByEmail=staff.email`, `policyVersion` sabiti
(`APPROVAL_POLICY_VERSION = '2026-08-21'`). Event `created` (payload:
title/domain/riskLevel). Audit action `approval.created`.

```ts
decideApproval(staffUserId, requestId, decision: 'approve'|'reject',
  reason, ctx?): Promise<{ status: 'pending'|'approved'|'rejected' }>
```
Guard: istek `pending` olmalı ("Bu talep artık kararda değil." hatası).
`ApprovalDecision` yazılır — `@@unique([requestId, decidedByEmail])`
P2002 → "Bu talebe zaten karar yazdın." Event `decision_recorded`
(payload: decision, approvals şu ana kadar / gereken). Sonuç:
**tek `reject` talebi kapatır** → `rejected` + `decidedAt` +
`decidedByEmail` + event `rejected`; approve sayısı (bu karar dahil)
`>= requiredApprovals` → `approved` + aynı kapanış alanları + event
`approved`; aksi hâlde `pending` kalır. Audit `approval.decided`
(before/after status + decision).

```ts
cancelApprovalRequest(staffUserId, requestId, reason, ctx?): Promise<void>
```
Guard `pending`. `status='cancelled'` + `decidedAt/decidedByEmail` +
event `cancelled`. Audit `approval.cancelled`. (Kuyruk `cancelled`
listelemez — mevcut davranış.)

**Onaylanan talep HİÇBİR ŞEYİ otomatik uygulamaz** — karar defteridir;
riskli değişikliğin kendisi yine mevcut yazma fonksiyonlarıyla yapılır.

### KVKK (6)

```ts
createKvkkRequest(staffUserId, input: {
  reference: string;              // 'KVKK-2026-0001' — elle, benzersiz
  subjectEmail: string; type: 'access'|'erasure'|'correction'|'portability';
  orgId?: string; receivedAt: Date; receivedVia?: string;
}, reason, ctx?): Promise<{ id: string }>
```
**`statutoryDueAt` KOD hesaplar: `receivedAt` + 30 gün** (kanuni süre —
elle girilmez, `lib/kvkk.ts` saf `statutoryDueDate(receivedAt)`).
`status='intake'`. Event `received`. Referans P2002 → "Bu referans zaten
kullanılmış." Audit `kvkk.created` (payload'da subjectEmail YOK).

```ts
verifyKvkkIdentity(staffUserId, requestId, method: string, reason, ctx?)
```
Guard: status `intake|identity_check` VE henüz doğrulanmamış.
`identityVerifiedAt=now`, `identityMethod`, status → `in_progress`.
Event `identity_verified`. Audit `kvkk.identity_verified`.

```ts
assignKvkkOwner(staffUserId, requestId, ownerEmail: string, reason, ctx?)
```
**Sahip yalnız staff olabilir:** `ownerEmail` `isStaff=true` bir
kullanıcıyla eşleşmeli ("Sahip personel olmalı." hatası); `ownerId` da
bağlanır. `completed`'a atanamaz. Event `owner_assigned`.

```ts
addKvkkEvidence(staffUserId, requestId, input: { label; location }, reason, ctx?)
```
`completed`'a kanıt eklenemez. `KvkkEvidence` + event `evidence_added`
(payload: label — location DEĞİL; konum yolu ekran defterine sızmasın).

```ts
setKvkkStatus(staffUserId, requestId,
  status: 'identity_check'|'in_progress'|'legal_review', reason, ctx?)
```
İzinli geçiş haritası (dışı hata): `intake→identity_check` ·
`identity_check→in_progress` (yalnız kimlik doğrulanmışsa; normal yol
`verifyKvkkIdentity`) · `in_progress→legal_review` ·
`legal_review→in_progress`. `completed` bu yoldan VERİLEMEZ. Event
`status_changed` (payload: from/to).

```ts
completeKvkkRequest(staffUserId, requestId, responseSummary: string, reason, ctx?)
```
Guard: **`identityVerifiedAt` dolu olmalı** ("Kimlik doğrulanmadan talep
kapatılamaz.") ve status `in_progress|legal_review`. `respondedAt=now`,
`responseSummary` (≤1000), status `completed`. Event'ler: `responded` +
`completed`. Audit `kvkk.completed`.

## API uçları (ince; `_shared.ts` sözleşmesi: NotStaff→404, hata→400+mesaj)

```
POST /api/admin/approvals                     { title, domain, riskLevel, orgId?, targetType?, targetId?, requiredApprovals?, reason }
POST /api/admin/approvals/[id]/decision       { decision: 'approve'|'reject', reason }
POST /api/admin/approvals/[id]/cancel         { reason }
POST /api/admin/kvkk                          { reference, subjectEmail, type, orgId?, receivedAt, receivedVia?, reason }
POST /api/admin/kvkk/[id]/identity            { method, reason }
POST /api/admin/kvkk/[id]/owner               { ownerEmail, reason }
POST /api/admin/kvkk/[id]/evidence            { label, location, reason }
POST /api/admin/kvkk/[id]/status              { status, reason }
POST /api/admin/kvkk/[id]/complete            { responseSummary, reason }
```
Gövde `readJsonBody`/`field` (auth/_shared) ile; enum alanları uçta da
doğrulanır (invoices/paid emsali). Yanıt `{ ok: true }` (+create'lerde id).

## UI (mevcut sayfalara; kabuk/menü DEĞİŞMEZ)

- **Security → Approvals:** bekleyen satırlara Onayla/Reddet/İptal —
  sebep zorunlu diyalog; sayfa başlığında "New approval request" diyaloğu.
- **Security → Data requests:** satır aksiyonları (kimlik doğrula · sahip
  ata · kanıt ekle · duruma taşı · yanıtla & kapat) + "New KVKK request"
  diyaloğu. Kanuni sayaç ekranda zaten var.
- Desen: `InvoiceRowActions.tsx` birebir emsal (client component, fetch →
  API, hata metni satır içinde, başarıda `router.refresh()`); markup
  Vuexy'den kopyalanır, icat yok. Yeni dosyalar `(admin)/ui/
  ApprovalActions.tsx` ve `(admin)/ui/KvkkActions.tsx` (+ per-page create
  diyalogları) — sayfalar server component kalır.

## Test planı

- Gate: CALLS'a 9 satır (numaralandırma otomatik).
- Sözleşme (mevcut yazma testlerinin deseniyle): audit yazılamazsa
  rollback · sebepsiz çağrı reddi · tüm geçiş bekçileri (pending-olmayana
  karar/iptal yok, kimliksiz kapatma yok, izinsiz status geçişi yok,
  completed'a kanıt/sahip yok, staff-olmayan sahip yok) · P2002 dostu
  mesajlar (karar tekrarı, KVKK referansı) · onay eşiği matematiği
  (1/1 onay → approved; requiredApprovals=2'de ilk onay pending bırakır;
  tek reject kapatır) · `statutoryDueDate` = +30 gün (saf, ayrı test) ·
  audit payload'ında subjectEmail OLMADIĞI iddiası · org'suz kayıtta
  platform nöbetçisi.
- Rotalar: enum/eksik alan 400 yolları için ince testler (mevcut rota
  test emsali varsa onunla, yoksa yalnız typecheck).

## Kapsam dışı (bilinçli)

SupportCase yazmaları · dört göz zorunluluğu (şema hazır) · onayın
otomatik icrası · bildirim/e-posta · KVKK kanıt dosyası yükleme (yalnız
işaretçi) · UI'da yeni menü/rozet.
