# Dalga A — Düğme Temizliği + Müşteri Ticket v1 (Tasarım)

Tarih: 2026-08-24 · Girdi: `2026-08-22-button-cleanup-and-ticket-v1-notes.md`
(Hüseyin onaylı) · Durum: spec — plan bundan üretilecek.

Migration YOK: `SupportCase` şeması olduğu gibi kullanılıyor. Deploy =
kaynak + restart (`--skip-build` ritüeli), migrate/generate gerekmez.

---

## Bölüm 1 — Düğme temizliği (11 karar)

### 1.1 Bağlanacaklar

**K1 — Quick create → "Open support case" gerçekten açar.**
`NewSupportCaseButton` (`(admin)/ui/SupportActions.tsx`) `useSearchParams`
okur: `new === '1'` görünce diyaloğu açar ve `router.replace(pathname)` ile
parametreyi URL'den düşürür (yenilemede tekrar açılmasın; navbar'dan ikinci
tıklama parametreyi yeniden getirdiği için effect yeniden tetiklenir —
"aynı sayfadayken tıklandı, açılmadı" tuzağı böyle kapanır).
`useSearchParams` Suspense sınırı ister (`(app)/app/guides/page.tsx`
emsali): butonun render edildiği sayfalarda (`admin/support/cases`,
`admin/support/queue`) buton `<Suspense fallback={null}>` içine alınır.
Queue sayfası da kabiliyeti bedavaya alır — zarar yok.

**K2 — Quick create → "Open data request" aynı desen.**
`NewKvkkButton` (`KvkkActions.tsx`) + `admin/security/data-requests`
sayfasında Suspense sarmalı. Mekanizma K1 ile birebir aynı.

**K3 — Quick create → "Create invoice" yönlendirilir.**
Hedefte (`/admin/invoices?new=1`) oluşturma UI'ı yok; fatura org
sayfasından kesilir. `CREATE_ACTIONS`'taki girdi: `href: '/admin/orgs'`,
label `Create invoice` kalır, detail dürüst akışı anlatır:
`"Pick the customer first — invoices are issued from the org page."`
İkon/ton aynı kalır.

### 1.2 Kaldırılacaklar (girdiler silinir, işlev eklenmez)

| # | Dosya | Ne |
|---|---|---|
| K4 | `(admin)/ui/SupportOperationsViews.tsx` (~75) | Vaka konuşma başlığındaki "Reply" düğmesi (`btn-sm btn-primary` + `tabler-send`). Yazışma v2'de mesaj tablosuyla gelir. |
| K5 | `SupportOperationsViews.tsx` (~161) | Playbook kartındaki "Open procedure" düğmesi — saran `d-flex justify-content-end mt-4` div'iyle birlikte (`details/summary` zaten aç-kapa yapıyor). |
| K6 | `(admin)/ui/GrowthOperationsViews.tsx` (~148) | Lead kartı "Add note" ikon düğmesi. |
| K7 | `GrowthOperationsViews.tsx` (~149) | Lead kartı "Open" ikon düğmesi. K6+K7 gidince saran `d-flex gap-1` div'i de gider; footer'da tarih kalır. |
| K8 | `GrowthOperationsViews.tsx` (~162) | Leads sütun başlığı üç-nokta düğmesi (`aria-label="... column actions"`). |
| K9 | `(admin)/ui/PlatformOperationsViews.tsx` (~153) | Jobs şerit başlığı üç-nokta düğmesi (`aria-label="... actions"`). |
| K10 | `(admin)/AdminNavbarTools.tsx` | `CREATE_ACTIONS`'tan "New content draft" girdisi tamamen silinir (özellik yok). |
| K11 | `(app)/navbar/ShortcutsMenu.tsx` (~61-66) | Sahte "+" (`span.dropdown-shortcuts-add`, handler'sız, "Customization coming soon") — saran başlık `d-flex` düzeni bozulmadan silinir. |

Dokunulmayacaklar (denetimde temiz çıktı): RevenueOperationsViews'un
disabled "Open"ları (preview-only dal) · FlagCard local-only toggle'ları ·
diğer her şey.

---

## Bölüm 2 — Müşteri Ticket v1

### 2.1 Kapsam cümlesi

(app) panelinde **Support** sayfası: müşteri konu + kategori + mesajla vaka
açar → mevcut `SupportCase` defterine `channel: 'form'` düşer; kendi
org'unun vakalarını durumlarıyla listeler. Panel içi yazışma YOK — yanıt
e-postayla döner ve sayfa bunu açıkça söyler.

### 2.2 Repo katmanı — `apps/web/lib/repo/support.ts` (YENİ)

`admin.ts`'e GİRMEZ: oradaki numaralandırma testi her export'tan personel
kapısı bekler; bu modül müşteri kapılıdır (`kvkk.ts`/`support-sla.ts`
"ayrı modül" emsali).

```ts
export type OpenCaseResult =
  | { ok: true; id: string; reference: string }
  | { ok: false; reason: 'no_org' | 'invalid_input' };

export async function openSupportCase(
  userId: string,
  input: { subject: string; category: string; message: string },
): Promise<OpenCaseResult>;

export interface CustomerCaseRow {
  id: string; reference: string; subject: string;
  category: SupportCategoryValue; status: SupportStatusValue;
  createdAt: Date; updatedAt: Date;
}
export async function listOwnSupportCases(
  userId: string,
): Promise<CustomerCaseRow[] | null>; // org yoksa null
```

Kurallar:
- **Kapı = oturum + org üyeliği.** `primaryOrgId(userId)` (senders.ts) —
  null ise `no_org`. Rol ayrımı yok: viewer dahil her üye vaka açabilir
  ve org'un vakalarını görür (org içi veri, StaffAccess defteri müşteri
  okuması için geçerli değil — o personel sözleşmesi).
- **Doğrulama:** subject trim + ≤200, boşsa `invalid_input`; message trim
  + ≤500 (`SupportCase.summary` VarChar(500) — v1'de mesaj oraya yazılır),
  boşsa `invalid_input`; category 5 değerden biri değilse `invalid_input`.
- **Oturumdan gelenler:** `requesterEmail` = kullanıcının e-postası
  (User tablosundan), `orgId` + `orgName` anlık kopya (admin
  `createSupportCase` emsali). Kullanıcı bunları YAZAMAZ.
- **Sabitler:** `channel: 'form'` · `priority: 'normal'` (müşteriye
  sorulmaz; staff panelden yükseltir) · `status` default `'open'` ·
  `slaDueAt = slaDueDate(now, 'normal')` (`lib/support-sla.ts`).
- **Referans OTOMATİK — `SUP-<yıl>-<sıra>`:** yılın mevcut
  `SUP-<yıl>-%` sayısı + 1, `padStart(4, '0')` (9999 sonrası doğal uzar).
  P2002'de sırayı +1 artırarak yeniden dene, en çok 5 deneme; hâlâ
  çakışıyorsa hata fırlat (madde 2.6'daki test bunu kilitler).
- **ActivityEvent — KARAR: yazılır.** `recordActivity` ile
  `type: 'support.case_opened'`, `targetType: 'support'`,
  `targetId: <case id>`, `payload: { reference, subject, category }`.
  `recordActivity` zaten hata yutar ve transaction dışıdır — vaka açma
  günlük yüzünden devrilmez. Gerekli genişletmeler:
  - `activity.ts`: `ActivityType`'a `'support.case_opened'`,
    `targetType` birliğine `'support'`.
  - `(app)/activity-looks.ts`: yeni tip için LOOK girdisi (ikon
    `tabler-headset`, başlık `Support case opened`, detay
    `"SUP-2026-0007 — <subject>"`). Mevcut `support.` filtre grubu yeni
    tipi kendiliğinden kapsar.
- `listOwnSupportCases`: yalnız `where: { orgId }`, `orderBy createdAt
  desc`, limit 50. Başka org'un vakası sorguya giremez.

### 2.3 API — `POST /api/support` (YENİ)

`api/senders/route.ts` emsali ince uç: `currentSession()` yoksa 401 ·
gövde `readJsonBody` + `field()` (tip-farkında okuma, wave-2 sözleşmesi) ·
`openSupportCase(session.user.id, {...})` · `no_org` → 403,
`invalid_input` → 400, başarı → `{ ok: true, reference }`. Listeleme için
GET ucu YOK — sayfa repo'dan sunucu tarafında okur (senders emsali).

### 2.4 Sayfa — `apps/web/app/(app)/app/support/page.tsx` (YENİ)

- Sunucu bileşeni; oturum kapısı sayfada (`redirect('/login?next=/app/support')`
  — layout'a güvenme, paralel render tuzağı diğer sayfalardaki notta).
- `listOwnSupportCases` null → org'suz kullanıcı kartı (senders'taki
  yetkisiz/boş durum diline uygun).
- İçerik: başlık + **NewTicketForm** (istemci bileşeni) + vaka listesi.
  Vuexy markup'ı mevcut panel sayfalarından kopyalanır (kart + form +
  liste; `AddSenderForm`/senders sayfası emsal) — kendi markup'ını yazma
  kuralı geçerli.
- Form: Subject (input, required, maxLength 200) · Category (select:
  Billing/Builder/Export/Access/Account) · Message (textarea rows 4,
  required, maxLength 500, altında karakter ipucu). Gönderim `fetch` +
  toast + `router.refresh()`; başarıda form sıfırlanır. Buton: `Open case`.
- Liste satırı: reference (kod görünümü) · subject · kategori rozeti ·
  durum rozeti · açılış tarihi. Durumun müşteri dili:

  | DB | Müşteri etiketi | Ton |
  |---|---|---|
  | open | Open | info |
  | waiting_customer | Awaiting your reply | warning |
  | escalated | In progress | primary |
  | resolved | Resolved | success |

  (`escalated` iç jargon — müşteriye "işleniyor" gerçeği söylenir;
  yalan yok, ayrıntı yok.)
- Dürüstlük bandı: form/list yanında kalıcı metin —
  `"Replies arrive by email — this page tracks case status."`
- UI dili İngilizce (ürün dili; TR/EN Dalga B'nin işi).
- Menü: `PanelShell.tsx` MENU, Tools bölümü, `Setup guides`'tan sonra:
  `{ type: 'item', href: '/app/support', label: 'Support',
  icon: 'tabler-headset' }`.

### 2.5 v1'de bilerek YOK (bağlayıcı)

Panel içi yazışma/thread (şemada mesaj tablosu yok — v2 migration) ·
dosya eki · müşteriye öncelik seçimi · vaka açılınca personele/müşteriye
e-posta bildirimi (kuyruk + günlük rapor zaten görünür kılıyor) · rate
limit (risk notu: kötüye kullanım görülürse org başına açık vaka tavanı
v1.1'de eklenir) · vaka detay sayfası (liste satırı yeter, tıklanmaz).

### 2.6 Testler

- `test/support-repo.test.ts` (YENİ): org'suz → `no_org` · boş/aşırı
  uzun alanlar → `invalid_input` · geçersiz kategori → `invalid_input` ·
  referans deseni `SUP-<yıl>-0001` ve sayıma göre sıra · P2002'de +1 ile
  yeniden deneme, 5'te pes · slaDueAt = now+48h · channel/priority
  sabitleri · orgName anlık kopyası · `recordActivity` çağrısı
  (`support.case_opened`) · `listOwnSupportCases` yalnız kendi org'u,
  desc sıra. (Prisma taklidi: `admin-support-writes.test.ts` emsali.)
- `test/api-customer-support-route.test.ts` (YENİ):
  `api-support-route.test.ts` emsali — oturumsuz 401 · gövde→repo
  argüman çevirisi · `no_org` 403 / `invalid_input` 400.
- Bölüm 1 için yeni test yok; mevcut takım (1176) yeşil kalmalı —
  kaldırılan düğmelere referans veren test var mı diye grep edilir.

### 2.7 Doğrulama

`npm run typecheck` · `npm test` (workspaces) · placeholder DATABASE_URL
ile prod build. Görsel: worktree'de dev sunucu ayağa kalkarsa
`/app/support` + admin temizlik ekranları gözle; kalkmazsa (env/DB yok)
test+build kanıtı yeter, canlı duman Hüseyin ritüeliyle.

---

## Açık karar bayrakları (Hüseyin'e not, blokaj değil)

1. `escalated → "In progress"` müşteri etiketi benim seçimim — girdi
   notu yalnız `waiting_customer` örneğini veriyordu.
2. ActivityEvent'e `support.case_opened` yazma kararı "düşülebilir"
   ifadesinden EVET'e bağlandı (org'un kendi günlüğü, gürültü değil).
3. Quick create'te "Create invoice" detail metni değişti (K3) — eski
   metin sahte bir doğrudan-akış vaat ediyordu.
