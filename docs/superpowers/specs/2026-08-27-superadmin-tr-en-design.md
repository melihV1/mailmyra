# Süper Admin TR/EN (Tasarım)

Tarih: 2026-08-27 · Onay: Hüseyin (sohbet — dörtlü seçimin son kalemi,
"başla") · Durum: spec.

Bu dalga iki belgeli kuralı TARİHLİ REVİZYONLA değiştirir:
① CLAUDE.md "Süper admin paneli bu karardan bağımsızdır (iç yüzey)" →
süper admin de TR/EN olur (işlemsel e-postalar + pazarlama İngilizce
KALIR; personel digest e-postası da İngilizce kalır).
② Dalga B kuralı "(admin) lib/i18n import etmez" → KALKAR; admin artık
aynı i18n çekirdeğini kullanır.
Migration YOK · yeni bağımlılık YOK.

---

## 1. Mimari — Dalga B makinesi aynen

- `(admin)/layout.tsx`: `const lang = await getLang()` +
  `<LangProvider lang={lang}>` AdminShell'i sarar ((app) emsali).
  AdminShell (istemci) kök sarmalayıcısına `lang={useLang()}` özniteliği.
- **Dil seçici:** admin navbar'ına kompakt seçici — müşteri panelindeki
  `LanguageMenu` deseninin admin sürümü (`AdminLanguageMenu`,
  AdminNavbarTools yanına; aynı `mm-lang` çerezi + `router.refresh()`).
  ⚠️ Kabuk-yasağı gerilimi (Hüseyin bayrağı §6-1): "kabuk yeniden
  tasarlanmaz" kuralı DURUYOR — bu bir yeniden tasarım değil, navbar
  araç listesine tek düğme ekidir (Dalga A quick-create emsali).
- Çerez PAYLAŞIMLI: tek cihaz-tercihi; müşteri panelinde TR seçen
  Hüseyin admin'i de TR görür (istenen davranış).
- `ToastProvider` bilinen yan etki: admin ağacına LangProvider gelince
  toast başlıkları da dile uyar — artık kazara değil bilinçli.
- Sözlükler: `lib/i18n/dict/admin-*.ts` (düz dizin, `admin-` öneki):
  `admin-common` · `admin-nav` (kabuk+navbar) · `admin-command` ·
  `admin-customers` · `admin-product` · `admin-revenue` ·
  `admin-growth` · `admin-support` · `admin-platform` ·
  `admin-security` · `admin-reports`. Kalıp aynen: en literal + `tr:
  Mirror<typeof en>` DOĞRUDAN literal; ortak kelimeler `common`dan.

## 2. Kapsam içi / dışı

**İçeride:** AdminShell MENU (PanelShell'in labelKey deseni birebir) +
WORKSPACE_SHORTCUTS + kabuk metinleri · AdminNavbarTools (CREATE_ACTIONS,
SOURCE_STATUS etiketleri, operations inbox) · AdminSearch ·
StaffUserMenu · tüm `ui/` görünümleri ve diyalogları · META/STATUS
tabloları (STATUS_META, LEAD_META, SERVICE_META…, AdminQueue EMPTY_TEXT
— Dalga B "looks" deseni: dil-anahtarlı, Mirror'lı) · 44 sayfanın
`generateMetadata`'sı (34 dönüşüm + 10 eksik backfill; "— Mailmyra
staff" soneki MARKA, çevrilmez) · tarih/saat formatlayıcıları dil alır.

**Dışarıda (değişmez):** VERİ — org/müşteri adları, e-postalar,
referanslar, staff'ın yazdığı sebepler, AdminAction/StaffAccess defter
içerikleri · `/dev/admin-preview` fixture VERİSİ (temsilî demo; krom
bileşenlerden kendiliğinden dil alır) · imza önizleme iframe içeriği
(SignaturePreviewButton — müşteri içeriği) · repo hata mesajları
(Türkçe fırlatılır, ham gösterilir — TR arayüzde artık TUTARLI görünür;
EN arayüzde Türkçe kalması bilinen eski durum, bu dalganın işi değil) ·
digest/işlemsel e-postalar (EN) · PARA biçimi (USD, 'en' formatı kalır
— defter/fatura tutarlılığı; Hüseyin bayrağı §6-2).

## 3. Formatlayıcılar (kırılmasız geçiş)

`OperationsShared.formatCompactDate` / `formatMoney`,
`AdminActionLogView`/`StaffAccessLogView`in Intl kullanımları,
model dosyalarındaki ay-adı üretimleri: **dil parametresi `lang: Lang =
'en'` İLE genişler** — varsayılan mevcut davranışı bayt-bayt korur,
domain süpürmeleri kendi çağrılarını dil-farkında yapar (Dalga B
`contrastWarnings` emsali). Para 'en' kalır (§2). `en-CA` date-input
tohumu teknik, dokunulmaz.

## 4. TR üslup

"Sen" hitabı, ürün sesiyle aynı; sözlükçe (Dalga B) + admin ekleri:
approval→onay · data request→veri talebi · ledger→defter ·
access log→erişim günlüğü · action log→işlem günlüğü · queue→kuyruk ·
seat→koltuk · trial→deneme · entitlement→tahsis · release→dağıtım ·
job→iş · flag→bayrak. Marka/teknik: Mailmyra staff, KVKK, SLA, SMTP,
CDN, SPF/DKIM çevrilmez. Rol/durum KODLARI (kolon değerleri) veri.

## 5. Test ve doğrulama

Mevcut takım (1282/51/532) yeşil kalır; admin model testleri İngilizce
etiket asserti taşıyorsa süpürme görevlerinde test de dil-farkında
güncellenir (EN default'lu formatlayıcılar sayesinde çoğu dokunulmaz).
Mirror + typecheck eksik çeviriyi kırar. Prod build. Görsel duman:
yerel staff kullanıcıyla admin TR/EN geçişi, ana ekranlar, bir yazma
diyaloğu, toast başlığı.

## 6. Açık bayraklar (Hüseyin'e, blokaj değil)

1. Navbar'a dil düğmesi — kabuk-yasağına dar istisna (yasağın sahibi
   sensin; itiraz edersen düğmesiz bırakır, çerezi müşteri panelinden
   yönetirsin).
2. Para biçimi 'en' kaldı ($1,234.56) — TR biçim istersen ayrı karar.
3. Breadcrumb kökü "Staff" → "Personel" çevrilir; sekme soneki
   "— Mailmyra staff" marka olarak kalır.
