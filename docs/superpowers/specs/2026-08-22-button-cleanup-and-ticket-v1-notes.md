# Düğme Temizliği + Müşteri Ticket v1 — Onaylı Girdiler

Tarih: 2026-08-22 · Onay: Hüseyin (sohbet, "tamam bunları yapalım")
Durum: SPEC ÖNCESİ onaylı girdi — yeni oturum bundan spec+plan üretecek.

## A. Ölü kontrol denetimi (3 paralel ajan, tam tarama) — ONAYLI KARARLAR

### Bağlanacak (3)

1. `apps/web/app/(admin)/AdminNavbarTools.tsx:17` — Quick create →
   "Open support case": `?new=1` parametresi okunmuyor. **Bağla:**
   `NewSupportCaseButton` (SupportActions.tsx) `useSearchParams` ile
   `new=1` görünce diyaloğu otomatik açsın.
2. `AdminNavbarTools.tsx:31` — Quick create → "Open data request":
   aynı desen. **Bağla:** `NewKvkkButton` (KvkkActions.tsx) otomatik açsın.
3. `AdminNavbarTools.tsx:10` — Quick create → "Create invoice":
   `/admin/invoices?new=1` hedefinde oluşturma UI'ı YOK (fatura org
   sayfasından kesiliyor). **Yönlendir:** `/admin/orgs` + destek metni
   "müşteriyi seç" akışını anlatsın.

### Kaldırılacak (8)

4. `apps/web/app/(admin)/ui/SupportOperationsViews.tsx:75` — vaka
   detayındaki "Reply" düğmesi (onClick yok; panel içi yazışma özelliği
   yok — ticket v2'de mesaj tablosuyla geri gelir).
5. `SupportOperationsViews.tsx:161` — playbook kartındaki "Open
   procedure" (details/summary zaten aç-kapa yapıyor).
6. `apps/web/app/(admin)/ui/GrowthOperationsViews.tsx:148` — lead kartı
   "Add note" (not özelliği yok; nextStep alanı var).
7. `GrowthOperationsViews.tsx:149` — lead kartı "Open" (lead detay
   rotası yok; LeadUpdateButton yanında).
8. `GrowthOperationsViews.tsx:162` — leads sütun başlığı üç-nokta
   (menü yok).
9. `apps/web/app/(admin)/ui/PlatformOperationsViews.tsx:153` — jobs
   şerit başlığı üç-nokta (menü yok).
10. `AdminNavbarTools.tsx:24` — Quick create → "New content draft"
    (içerik taslak akışı diye bir özellik yok; girdi silinir).
11. `apps/web/app/(app)/navbar/ShortcutsMenu.tsx:61-66` — müşteri panel
    kısayollar menüsündeki sahte "+" (span, buton görünümlü, handler
    yok) — kaldır.

### Denetimde TEMİZ çıkanlar (yeniden taramaya gerek yok)

Tüm admin diyalog/filtre/sekme/arama/org-detay aksiyonları · AdminShell
menüsü (tüm href'ler gerçek rotalara) · AdminSearch gerçek API ·
bildirim çekmecesi · müşteri panelinin TAMAMI (1 bulgu hariç) · builder
chrome'u · menu-data.ts linkleri. `admin/[...workspace]` dürüst
placeholder, menüden erişilmiyor. RevenueOperationsViews disabled
"Open"lar preview-only dal. FlagCard toggle'ları bilinçli local-only.

### Yan bulgu (dil dalgası için)

Müşteri paneli navbar'ında ÇALIŞIR bir `LanguageMenu` bileşeni zaten var
(`apps/web/app/(app)/navbar/`) — i18n dalgasına oradan başla; tema
kalıntısı mı gerçek iskelet mi incele.

## B. Müşteri Ticket v1 — ONAYLI KAPSAM

- (app) panelinde **Support** sayfası: form = konu + kategori
  (billing/builder/export/access/account) + mesaj → mevcut `SupportCase`
  defterine `channel: 'form'` ile düşer.
- Referans OTOMATİK üretilir (SUP-2026-#### deseni; P2002'de yeniden
  dene). Org + requesterEmail OTURUMDAN gelir (kullanıcı yazmaz).
- Öncelik MÜŞTERİYE SORULMAZ — varsayılan 'normal' (staff panelden
  yükseltir); SLA saati otomatik işler (lib/support-sla.ts).
- Müşteri kendi org'unun taleplerini durumlarıyla listeler
  (open / waiting_customer→"awaiting your reply" gibi dürüst müşteri
  diliyle / resolved). Başka org'un vakası ASLA görünmez.
- **v1'de YOK:** panel içi yazışma/thread (şemada mesaj tablosu yok —
  v2 migration işi; yanıt e-postayla döner), dosya eki, öncelik seçimi.
- Yazma sözleşmesi: müşteri tarafı yazma = kendi org'una vaka açmak;
  staff sözleşmesindeki audit/AdminAction MÜŞTERİ yazması için geçerli
  değil (o personel defteri) — müşteri aktivitesine (`ActivityEvent`)
  'support.case_opened' düşülebilir (spec'te karara bağla). Kapı:
  oturum + org üyeliği.
- UI dili İNGİLİZCE (ürün dili; TR/EN dil dalgası ayrı iş).

## C. Dalga sırası (Hüseyin onayı)

1. **Dalga A:** yukarıdaki 11 düğme kararı + Ticket v1 → tek spec/plan,
   subagent-driven (yerleşik süreç: spec → plan → görev başına
   implementer+reviewer → fable final review → fix wave → deploy).
2. **Dalga B:** müşteri paneli + builder TR/EN (CLAUDE.md revizyonu
   2026-08-22 commit `fc1fbe0`'da; pazarlama+e-postalar İngilizce kalır).
