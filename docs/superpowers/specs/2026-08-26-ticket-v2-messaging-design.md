# Ticket v2 — Panel İçi Yazışma (Tasarım)

Tarih: 2026-08-26 · Onay: Hüseyin (sohbet — "ticket v2'ye başla" + 3 karar:
e-posta+panel bildirimi / iki yönlü durum otomasyonu / ayrı detay sayfası).

**Bu dalga MIGRATION içerir** (Dalga A/B'den farklı). Deploy ritüeli tam
zincir: DURDUR → `deploy.js --skip-build` → `exec -- prisma migrate deploy`
→ `exec -- prisma generate` → BAŞLAT (⚠️ generate atlanırsa girişli her
sayfa 500 — 2026-08-19 dersi).

---

## 1. Kapsam cümlesi

Müşteri, talebinin detay sayfasında (`/app/support/[id]`) yazışmayı görür
ve cevap yazar; personel, admin vaka görünümünde gerçek **Reply** ile
cevaplar (Dalga A'da kaldırılan düğme gerçek işlevle döner). Mesajlar yeni
`SupportMessage` tablosunda; durum iki yönde otomatik akar; müşteriye
link'li e-posta + panel bildirimi düşer.

**v2'de bilinçle YOK:** dosya eki (v3) · SLA yeniden hesabı (mesajlar
`slaDueAt`e dokunmaz) · müşteri mesajı için ActivityEvent (gürültü;
`support.case_opened` yeter) · zengin metin (düz metin, satır sonları
korunur).

## 2. Şema — migration `support_messages`

```prisma
model SupportMessage {
  id     String @id @default(cuid())
  caseId String

  /// 'customer' | 'staff'
  authorType  String @db.VarChar(16)
  /// Görünüm kopyası: müşteri için requesterEmail, personel için staff e-postası.
  authorEmail String @db.VarChar(255)
  body        String @db.VarChar(2000)

  createdAt DateTime @default(now())

  /// Defter FK'si Restrict — mesajı olan vaka silinemez (governance emsali).
  case SupportCase @relation(fields: [caseId], references: [id], onDelete: Restrict)

  @@index([caseId, createdAt])
}
```

`SupportCase`e `messages SupportMessage[]` ilişkisi eklenir (kolon yok).

**İlk mesaj = mevcut `summary`:** geriye dönük doldurma YOK; iplik her
zaman [sanal açılış balonu: `summary` + `requesterEmail` + `createdAt`]
+ `SupportMessage` satırları olarak çizilir. `openSupportCase` DEĞİŞMEZ
(yeni vakalarda da açılış metni summary'de yaşar — tek kaynak).

## 3. Durum otomasyonu (onaylı: iki yönlü)

| Olay | Durum geçişi |
|---|---|
| Personel cevap yazar | her durumdan → `waiting_customer` (zaten öyleyse kalır) |
| Müşteri cevap yazar | `waiting_customer` → `open` · `resolved` → `open` (otomatik yeniden açılış) · `open`/`escalated` → değişmez |

Mesaj + durum geçişi TEK transaction. Mevcut elle durum düğmeleri aynen
kalır (otomasyon ek, ikame değil). `SUPPORT_TRANSITIONS` haritası elle
geçişler için geçerli kalır; otomasyon geçişleri repo içinde ayrı ve
sabit — harita gevşetilMEZ.

## 4. Repo katmanı

### Müşteri — `lib/repo/support.ts` genişler (kapı: oturum + kendi org'u)

```ts
export interface CustomerMessage {
  id: string; authorType: 'customer' | 'staff';
  body: string; createdAt: Date;
}
export interface CustomerCaseDetail extends CustomerCaseRow {
  summary: string;            // sanal açılış balonu içeriği
  messages: CustomerMessage[];
}
export async function getOwnSupportCase(userId, caseId):
  Promise<CustomerCaseDetail | null>;   // başka org / yok → null
export type AddMessageResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'not_found' | 'invalid_input' };
export async function addCustomerMessage(userId, caseId, body):
  Promise<AddMessageResult>;
```

- `authorEmail` müşteri listesine SIZMAZ (staff e-postası müşteriye
  gösterilmez — balon etiketi "Mailmyra destek"; müşteri kendi mesajında
  "Sen"). `authorType` yeter.
- Doğrulama: trim, boş → `invalid_input`, 2000'e kırp (form maxLength
  aynı). Transaction: mesaj + §3 otomasyonu.

### Personel — `lib/repo/admin.ts` (sözleşme + numaralandırma testi)

- `listSupportMessages(staffUserId, caseId)`: iplik müşteri içeriği
  taşır → mevcut destek okuma deseni (SUPPORT_REGISTER StaffAccess
  kaydı) aynen; kayıt yazılamazsa iplik açılmaz (kapalıya düşme).
- `addStaffReply(staffUserId, caseId, body, ctx)`: `requireStaff` ·
  transaction: mesaj (`authorType:'staff'`, authorEmail = staff e-postası)
  + `waiting_customer` otomasyonu + `AdminAction`
  (`action:'support.replied'`, after: `{ messageId, bodyLength }` —
  **mesaj METNİ deftere GİRMEZ**, requesterEmail kuralının izdüşümü).
  **Sebep alanı otomatik `'reply'` sabiti** — her cevapta ayrı sebep
  yazdırmak eziyet; sözleşmenin "sebep" maddesine bilinçli dar istisna,
  Hüseyin bayrağı §8-1.
- Commit SONRASI (best-effort, mesaj kalıcı — posta düşerse cevap
  kaybolmaz): ① e-posta ② panel bildirimi (§5).

## 5. Bildirim (onaylı: e-posta + panel)

- **E-posta İNGİLİZCE** (işlemsel e-postalar İngilizce — kilitli karar;
  müşteri TR olsa bile). Yeni şablon `lib/mail/`: `supportReplyEmail` —
  kısa: "Your support case SUP-2026-#### has a new reply." + panel linki
  `/app/support/<id>`. **Cevabın içeriği e-postada YOK** (onaylı seçim).
  Gönderim `getMailer` üzerinden (MailDelivery defterine kendiliğinden
  düşer).
- **Panel bildirimi:** `NOTIFICATION_TYPES`'a 4. tip `support_reply`
  (opt-out modeli aynen; tercih ekranında görünür). Alıcı: org içinde
  `requesterEmail`e sahip KULLANICI varsa o; yoksa bildirim atlanır
  (e-posta yine gider). `notification-looks.ts`'e en+tr LOOK (Mirror
  zorlar): "Support replied" / "Talebine cevap geldi", link detaya.

## 6. UI

### Müşteri (`(app)`, TR/EN — Dalga B sözlük düzeni)

- `/app/support` listesi: satırlar `/app/support/[id]`e link olur
  (Dalga A'nın "tıklanmaz satır" kararı v2'yle kapanır).
- `/app/support/[id]` (YENİ): başlık (referans + konu + durum rozeti,
  müşteri dili aynen) · mesaj balonları (açılış = summary; müşteri sağ/
  "Sen", personel sol/"Mailmyra destek"; tarihler `formatDate` + saat) ·
  altta cevap formu (textarea, maxLength 2000, boş gönderilmez; resolved
  vakada form ÜSTÜNDE dürüst not: "Cevap yazarsan talep yeniden açılır.")
  · gönderimde toast + refresh. Oturum kapısı sayfada; başka org → 404.
- `dict/support.ts` genişler (en+tr, EN yeni metinler de İngilizce doğal
  yazılır — bu YENİ yüzey, bayt-koruma kuralı yeni metinlere uygulanmaz).

### Personel (`(admin)`, İngilizce)

- `SupportOperationsViews` konuşma bölmesi: sanal açılış + gerçek iplik
  (`listSupportMessages`) · **Reply** düğmesi geri gelir — inline
  composer (textarea + Send; StaffDialog değil, konuşma bölmesinin
  doğal parçası) · gönderimde iplik tazelenir, durum rozeti
  `waiting_customer`a döner.
- Vaka LİSTE sorguları mesajları çekmez (detay açılınca yüklenir).

## 7. API

- Müşteri: `POST /api/support/[id]/messages` (ince: oturum → repo →
  404/400/200). Detay sayfası repo'dan okur, GET yok (emsal).
- Personel: `GET /api/admin/support/[id]/messages` (bölme tembel
  yükleme için) + `POST /api/admin/support/[id]/reply` (tip-farkında
  gövde; NotStaffError → 404 emsali).

## 8. Açık bayraklar (Hüseyin'e, blokaj değil)

1. Staff cevabında AdminAction sebep alanı otomatik `'reply'` — her
   cevaba elle sebep yazdırmıyorum; itirazın varsa zorunlu yaparız.
2. Balon etiketi müşteride "Mailmyra destek" (kişi adı değil — digest/
   aktivite emsali: müşteri ürünü tanır, personeli değil).
3. E-posta bildirimi her staff cevabında gider (art arda cevapta da) —
   birleştirme/debounce v3.

## 9. Test ve doğrulama

- Repo (müşteri): durum otomasyon matrisi (§3 tablosunun 4 satırı) ·
  kırpma/boş doğrulama · başka org 404 · sanal açılış balonu sözleşmesi ·
  transaction bütünlüğü (mesaj + durum tek adımda).
- Repo (staff): AdminAction payload'ında mesaj metni/requesterEmail YOK
  (mevcut sızıntı taraması genişler) · waiting_customer otomasyonu ·
  StaffAccess kapısı (kapalıya düşme) · numaralandırma testi yeni
  export'ları otomatik yakalar.
- Bildirim: kullanıcı eşleşmezse panel bildirimi atlanır, e-posta gider ·
  `NOTIFICATION_TYPES` 4'e çıkınca tercih ekranı + looks (Mirror) tam.
- Route smoke'ları (401/404/400/200) · typecheck · prod build ·
  görsel duman (yerel DB'de migrate + iki taraflı yazışma).
