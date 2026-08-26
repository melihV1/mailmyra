# Ticket v2 — Panel İçi Yazışma Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `SupportMessage` tablosu + iki taraflı yazışma: müşteri `/app/support/[id]` detayında okur/yazar, personel admin vaka bölmesinde gerçek Reply ile cevaplar; durum iki yönde otomatik akar; müşteriye link'li e-posta + panel bildirimi düşer.

**Architecture:** Migration (ilk balon = mevcut `summary`, geriye dönük doldurma yok) → müşteri repo genişlemesi (`lib/repo/support.ts`) → bildirim altyapısı (mail şablonu + 4. bildirim tipi) → personel repo (`lib/repo/admin.ts`, sözleşmeli) → ince API'ler → iki UI. Mesaj + durum geçişi tek transaction; posta/bildirim commit sonrası best-effort.

**Tech Stack:** Prisma/MariaDB (migration!) · Next.js App Router · vitest · Dalga B i18n düzeni (müşteri yüzeyi en+tr).

**Spec:** `docs/superpowers/specs/2026-08-26-ticket-v2-messaging-design.md`

## Global Constraints

- npm (pnpm YASAK). Komutlar: `npm test -w apps/web` (tek dosya `-- test/<f>.test.ts`) · `npm run typecheck` · build `DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder" npm run build -w apps/web`. Migration YEREL DB'ye `npx prisma migrate dev` ile uygulanır (apps/web'den; DATABASE_URL'i `.env.local`ten elle geçir — Prisma `.env.local` OKUMAZ: `DATABASE_URL="$(grep '^DATABASE_URL=' .env.local | head -1 | cut -d= -f2- | sed 's/^"//; s/"$//')" npx prisma migrate dev --name support_messages`).
- **Personel sözleşmesi** (admin.ts başlığı, numaralandırma testi): her export personel kapılı · kişisel veri okuması StaffAccess'e kapalıya-düşer · yazma tek transaction + AdminAction · **mesaj METNİ ve requesterEmail hiçbir deftere girmez** (payload: `{ messageId, bodyLength }`).
- **Müşteri kapısı:** oturum + kendi org'u; başka org'un vakası her katmanda `null`/404. Staff e-postası müşteriye SIZMAZ (balon etiketi "Mailmyra destek" / EN "Mailmyra support").
- Durum otomasyonu SABİT (spec §3 tablosu); `SUPPORT_TRANSITIONS` elle-geçiş haritası değişmez.
- **İşlemsel e-posta İNGİLİZCE** (kilitli karar; müşteri TR olsa da). Cevap içeriği e-postaya girmez.
- Müşteri UI metinleri Dalga B düzeninde (dict modülü, `tr` DOĞRUDAN `Mirror` literal'i, "sen" üslubu, sözlükçe: support case→destek talebi). Bu dalganın YENİ EN metinleri doğal yazılır (bayt-koruma eski metinler içindi); MEVCUT metinler bayt-korunur.
- Mesaj gövdesi: trim, boş reddedilir, 2000'e kırpılır (VarChar(2000)); iki tarafta da aynı.
- Admin `(admin)` `lib/i18n` import ETMEZ. Renderer/pazarlama dokunulmaz.
- Commit'ler İngilizce conventional + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Şema — `SupportMessage` migration

**Files:**
- Modify: `apps/web/prisma/schema.prisma` (spec §2'deki model AYNEN + `SupportCase`e `messages SupportMessage[]`)
- Create (üretilir): `apps/web/prisma/migrations/<ts>_support_messages/migration.sql`

**Interfaces:** Prisma client `supportMessage` delegate'i (sonraki görevler kullanır).

- [ ] **Step 1:** Modeli spec §2'den aynen ekle (yorumlar dahil; `onDelete: Restrict`, `@@index([caseId, createdAt])`).
- [ ] **Step 2:** Yerel DB'ye uygula: yukarıdaki `migrate dev --name support_messages` komutu → migration dosyası üretilir ve yerel DB'de koşar; `prisma generate` kendiliğinden.
- [ ] **Step 3:** `npm run typecheck` → PASS · `npm test -w apps/web` → tümü PASS (mevcut takım şemadan etkilenmez).
- [ ] **Step 4:** Commit: `feat(schema): SupportMessage table — ticket v2 thread ledger`

---

### Task 2: Müşteri repo — detay + mesaj yazma (TDD)

**Files:**
- Modify: `apps/web/lib/repo/support.ts`
- Test: `apps/web/test/support-repo.test.ts` (genişler)

**Interfaces (spec §4 imzaları AYNEN — Task 5/6 bunlara yaslanır):** `CustomerMessage`, `CustomerCaseDetail`, `getOwnSupportCase(userId, caseId)`, `AddMessageResult`, `addCustomerMessage(userId, caseId, body)`.

Kurallar: `getOwnSupportCase` where `{ id: caseId, orgId }` (kendi org'u sorguda — sonradan filtre değil); mesajlar `orderBy createdAt asc`; `authorEmail` müşteri tipine TAŞINMAZ. `addCustomerMessage` transaction: create + otomasyon (`waiting_customer→open`, `resolved→open`, diğerleri değişmez — `updatedAt` Prisma zaten günceller).

- [ ] **Step 1 (RED):** Mevcut mock düzenine (`caseFindMany`/`caseCreate`…) `supportMessage.{create,findMany}`, `supportCase.{findFirst,update}`, `$transaction` ekle; testler: başka org → null/not_found · boş gövde → invalid_input · 2001 karakter → 2000'e kırpılır · otomasyon matrisi 4 satır (waiting→open, resolved→open, open kalır, escalated kalır) · mesaj+durum tek transaction'da · detayda mesajlar asc + authorEmail alanı YOK.
- [ ] **Step 2:** RED gör → **Step 3:** uygula → **Step 4:** GREEN (dosya + tam takım) + typecheck.
- [ ] **Step 5:** Commit: `feat(support): customer thread read and reply with status automation`

---

### Task 3: Bildirim altyapısı — mail şablonu + 4. bildirim tipi (TDD)

**Files:**
- Modify: `apps/web/lib/mail/` (mevcut şablon dosya düzenini OKU ve aynen izle) — `supportReplyEmail(to, { reference, caseUrl })`: EN, kısa, içeriksiz; mevcut şablonların marka/düzen dilinde.
- Modify: `apps/web/lib/repo/notification-prefs.ts` (`NOTIFICATION_TYPES`'a `support_reply`)
- Modify: `apps/web/lib/repo/notifications.ts` (tekil kullanıcıya bildirim yazan mevcut yardımcıyı OKU; yoksa `notifyUser` ekle — org yöneticisi dağıtımı DEĞİL, tek alıcı)
- Modify: `apps/web/app/(app)/notification-looks.ts` (en+tr LOOK — Mirror zorlar: EN "Support replied" body "Case <ref> has a new reply."; TR "Talebine cevap geldi" gövde uyumlu; link detaya `targetUrl`/mevcut desen neyse o)
- Test: mevcut bildirim/prefs testlerini OKU — tip sayısına bağlı olanlar genişletilir; `supportReplyEmail` çıktı smoke'u (mevcut mail şablonu test emsali varsa onunla).

**Interfaces:** `supportReplyEmail`, `NOTIFICATION_TYPES` (4), bildirim yazımı için Task 4'ün çağıracağı fonksiyon adı (raporda NET yaz).

- [ ] TDD: tip eklemeden önce looks/prefs testlerinin kırmızısını gör (Mirror + Record zaten derlemede kırar — typecheck RED sayılır) → uygula → GREEN + tam takım.
- [ ] Commit: `feat(notifications): support_reply type and reply email template`

---

### Task 4: Personel repo — iplik okuma + Reply (TDD)

**Files:**
- Modify: `apps/web/lib/repo/admin.ts`
- Test: `apps/web/test/admin-support-writes.test.ts` (genişler; sızıntı taraması mesaj metnini de tarar)

**Interfaces:**
```ts
export async function listSupportMessages(staffUserId, caseId, ctx?):
  Promise<Array<{ id, authorType, authorEmail, body, createdAt }>>; // staff tarafı authorEmail GÖRÜR
export async function addStaffReply(staffUserId, caseId, body, ctx?):
  Promise<{ id: string }>;
```

Kurallar: `listSupportMessages` mevcut destek okuma deseniyle StaffAccess'e kapalıya-düşer (SUPPORT_REGISTER emsalini OKU ve aynen uygula). `addStaffReply`: `requireStaff` · gövde trim/boş-ret/2000 · transaction: mesaj (`authorType:'staff'`, authorEmail=staff.email) + durum `waiting_customer` + `AdminAction { action:'support.replied', before:{status}, after:{ messageId, bodyLength, status:'waiting_customer' }, reason:'reply' }` (sebep sabit — spec §8-1) · **commit SONRASI best-effort:** `supportReplyEmail` (alıcı requesterEmail; `getMailer`) + `support_reply` panel bildirimi (org'da requesterEmail'li kullanıcı varsa; yoksa atla). Posta/bildirim hatası cevabı DEVİRMEZ (try/catch + console.error, activity yazıcısı emsali).

- [ ] TDD: RED → uygula → GREEN. Zorunlu testler: AdminAction payload'ında mesaj METNİ ve requesterEmail YOK (JSON.stringify taraması) · durum otomasyonu · staff-olmayan ret · mail+bildirim çağrıları commit sonrası ve hataları yutuluyor · numaralandırma testi yeni export'ları kendiliğinden kapsıyor (kapı unutulursa kırılır).
- [ ] Commit: `feat(admin): support thread read and staff reply — audited, notifying`

---

### Task 5: API uçları (TDD)

**Files:**
- Create: `apps/web/app/api/support/[id]/messages/route.ts` (müşteri POST)
- Create: `apps/web/app/api/admin/support/[id]/messages/route.ts` (staff GET)
- Create: `apps/web/app/api/admin/support/[id]/reply/route.ts` (staff POST)
- Test: `apps/web/test/api-customer-support-route.test.ts` (genişler) + `apps/web/test/api-support-route.test.ts` (genişler)

Desenler: müşteri ucu `api/support/route.ts` emsali (401/404/400/200; `field()` gövde). Staff uçları mevcut `api/admin/support/[id]/status` emsali (params await'i, NotStaffError eşlemesi dahil — dosyayı OKU).

- [ ] TDD: RED → uygula → GREEN (route smoke'ları: statü eşlemeleri + repo argüman çevirisi) + tam takım + typecheck.
- [ ] Commit: `feat(api): ticket v2 endpoints — customer message, staff thread and reply`

---

### Task 6: Müşteri UI — liste linki + detay sayfası (en+tr)

**Files:**
- Modify: `apps/web/app/(app)/app/support/page.tsx` (satırlar `/app/support/[id]`e link; Vuexy tablo satır-link deseni için SenderTable/emsal OKU)
- Create: `apps/web/app/(app)/app/support/[id]/page.tsx` (sunucu: oturum kapısı + `getOwnSupportCase`; yoksa `notFound()`)
- Create: `apps/web/app/(app)/app/support/[id]/ReplyForm.tsx` (istemci: textarea maxLength 2000, boş gönderilmez, toast + refresh; resolved'da form üstünde not)
- Modify: `apps/web/lib/i18n/dict/support.ts` (yeni anahtarlar en+tr: balon etiketleri "You"/"Sen", "Mailmyra support"/"Mailmyra destek", resolved notu "Replying reopens this case."/"Cevap yazarsan talep yeniden açılır.", form/başlık metinleri)

Kurallar: balonlar müşteri sağ / personel sol; açılış balonu `summary`den; tarih `formatDate(lang, d)` + saat (`toLocaleTimeString` locale'i lang'a göre — Dalga B senders emsali); durum rozeti `statusLook` aynen; generateMetadata.

- [ ] Uygula → typecheck + prod build (rota listesinde `/app/support/[id]`) + tam takım → Commit: `feat(app): support case detail — thread view and reply (TR/EN)`

---

### Task 7: Admin UI — iplik + Reply composer

**Files:**
- Modify: `apps/web/app/(admin)/ui/SupportOperationsViews.tsx` (konuşma bölmesi: sanal açılış + iplik; inline composer — textarea + Send, StaffDialog DEĞİL)
- Modify/Create: iplik tembel yüklemesi için küçük istemci parçası (bölme açılınca `GET /api/admin/support/[id]/messages`; mevcut bölme zaten istemci — dosyayı OKU, desenine uy)

Kurallar: Send → `POST .../reply` → iplik tazelenir + durum rozeti `waiting_customer` (router.refresh) · boş gönderim engelli · hata inline (toast değil — form hatası formda kalır kuralı) · İngilizce metinler.

- [ ] Uygula → typecheck + prod build + tam takım → Commit: `feat(admin): live support thread with inline staff reply`

---

### Task 8: Tam doğrulama + görsel duman

- [ ] `npm run typecheck` · `npm test` (kök) · prod build (placeholder DATABASE_URL).
- [ ] Görsel (kontrolör): yerel dev + duman kullanıcısı → müşteri talep aç → admin'de iplik + Reply → müşteri detayda cevabı gör + cevap yaz → durum rozetleri iki yönde otomatik · bildirim zili + tercih ekranında 4. tip · TR/EN iki dilde detay sayfası. Ekran görüntüleri Hüseyin'e; duman verisi temizlenir.
- [ ] Rapor: deploy'un migrate+generate ŞART olduğu vurgusu.

## Self-Review Notu

- Spec kapsaması: §2→T1 · §4 müşteri→T2 · §5→T3(+T4 entegre) · §4 personel→T4 · §7→T5 · §6→T6-7 · §9→görev testleri+T8 · §8 bayrakları rapora.
- Sıra bilinçli: T3 (bildirim altyapısı) T4'ten ÖNCE — addStaffReply onları çağırır.
- Tip tutarlılığı: müşteri imzaları spec §4'ten; staff imzaları T4 Interfaces'te; API'ler T5'te bunları çağırır.
