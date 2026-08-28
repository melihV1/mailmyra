import type { Mirror } from '../types';

/**
 * Rapor sözlüğü (Task 11) — tek çağrı yeri: `ReportingOperationsViews.tsx`
 * (üç görünüm: `ReportLibraryView`/`ScheduledReportsView`/
 * `KpiDefinitionsView`). `ScheduleActions.tsx`in rapor kromu Task 9'da
 * `adminPlatform[lang].scheduleActions` altında zaten süpürüldü — bu
 * dosyanın kapsamı DIŞINDA, dokunulmadı (doğrulandı: eksiksiz kapsama,
 * kaçak literal yok — `one@voldi.net`/`two@voldi.net` textarea
 * placeholder'ı örnek e-posta VERİSİDİR, çevrilmez).
 *
 * PAYLAŞILAN MODEL DOSYASI (`../reporting-model.ts`) bu görevin dosya
 * listesinde DEĞİL (admin-security `governance-overview-model.ts` emsali):
 * `REPORT_LIBRARY[].name/description/sources[]/metrics[]/owner/freshness`,
 * `KPI_DEFINITIONS[].name/description/formula/source/grain/owner/
 * freshness/guardrail` VERİDİR, İngilizce literal olarak KALIR — rapor
 * adları asla çevrilmez (brief sınırı). `reports/{definitions,library,
 * scheduled}/page.tsx` (+ `dev/admin-preview` aynaları) yalnız
 * `AdminPageHeader` prop'ları taşıyor — Task 12'nin kapsamı, dokunulmadı.
 *
 * Ham durum/kadans/biçim kodu yazdırmaları — `row.status`
 * (`mm-report-schedule--${row.status}` rozeti), `row.cadence`, `row.format`,
 * durum filtre düğmelerindeki ham `value` (`all`/`active`/`paused`/
 * `attention`), `row.category` (kütüphane kartı numaralandırması),
 * `row.domain` (KPI satırı) — GovernanceOperationsViews/SupportOperations
 * Views'teki YERLEŞİK kalıbın devamı (bkz. admin-security dosya başı notu):
 * modelden gelen ham kod, bir çeviri haritasından GEÇMEDEN doğrudan
 * yazdırılıyorsa VERİ sayılır, bilerek çevrilmedi.
 *
 * `row.lastRunStatus ?? 'Never'` (liste satırı) `adminCommon.never`den
 * okur — bu anahtar Task 3-10'da hiç kullanılmamıştı, ilk tüketicisi bu
 * görev (tam da bu "ham değer yoksa geri düşüş kelimesi" rolü için var).
 * Detay diyaloğundaki `selected.lastRunStatus ?? 'Never run'` FARKLI bir
 * ibare ("Never" değil "Never run") — `scheduled.detail.neverRun` olarak
 * ayrı anahtar. Alt bilgi düğmesindeki `{preview ? 'Close preview' :
 * 'Close'}` SupportOperationsViews `casesView.detail.closePreview` +
 * `common[lang].close` emsali: "Close" `common`den okunur (zaten oradaki
 * kelime), yalnız "Close preview" bu dosyada yerel (`scheduled.detail.
 * closePreview`) — dosyada TEK çağrı yeri olduğu için üst düzey `shared`e
 * çıkarılmadı.
 *
 * `shared.fields.owner`/`.freshness` üç görünüm arasında (library kart
 * meta'sı, scheduled + kpiDefinitions detay diyalogları) bayt-bayt aynı
 * tekrarlar — admin-security `shared.fields.customer` emsali. Diğer alan
 * etiketleri (Cadence/Format/Recipients/Source/Grain/Formula) yalnız KENDİ
 * görünümlerinde tekrarlandığı için o görünümün kendi anahtarı olarak
 * kaldı (actionLog `ledger.recorded`/`detail.fields.recorded` emsali —
 * bayt-eş literal her zaman `shared`e taşınmaz, yalnız görünümler-arası
 * gerçekten paylaşılan alan etiketleri taşınır). `scheduled.nextRun`
 * kendi görünümü İÇİNDE iki kez (liste + detay) kullanıldığı için tek
 * anahtar altında birleşti.
 *
 * `library.statusBadge.ready` HEM KPI şeridi etiketi HEM satır rozeti için
 * tek kaynak — aynı durumun iki farklı yüzeyde aynı kelimeyle görünmesi
 * (KPI'nin "kaç tanım Source ready" sayması ile satırın "bu tanım Source
 * ready" demesi aynı gerçeğin iki görünümü). `.partial` bu ikiliyi
 * PAYLAŞMAZ: satır rozetinin ham metni "Partial" iken KPI şeridi kartının
 * orijinal EN metni "Partial source" idi (review düzeltmesi — ilk
 * sürümde ikisi yanlışlıkla aynı anahtara bağlanmıştı) — bu yüzden KPI
 * etiketi kendi anahtarına ayrıldı: `library.kpis.partialSource.label`.
 *
 * Glossary: zamanlama→zamanlama (schedule) · koşu→run · teslim→delivery
 * (`scheduled` bölümü) · digest→digest (ürün terimi, TR'de de "digest"
 * kalır — `scheduled.emptyKpis.deliveryChannel.support`teki tek geçiş) ·
 * tanım→definition (`library`/`kpiDefinitions`) · alıcı→recipient.
 */

const en = {
  shared: {
    fields: {
      owner: 'Owner',
      freshness: 'Freshness',
    },
  },
  categories: {
    all: 'All reports',
    executive: 'Executive',
    revenue: 'Revenue',
    product: 'Product',
    customer: 'Customer',
    security: 'Security',
    support: 'Support',
  },
  library: {
    statusBadge: { ready: 'Source ready', partial: 'Partial' },
    kpis: {
      definitions: { label: 'Report definitions', support: 'Reusable operating views' },
      sourceReady: { support: (percent: number) => `${percent}% catalog coverage` },
      partialSource: { label: 'Partial source', support: 'Definition exists; feed pending' },
      domains: { label: 'Domains', support: 'Cross-functional catalog' },
    },
    header: {
      title: 'Operating report catalog',
      support: 'Open a definition to inspect its purpose, source contract, metric set and owner.',
      badge: 'Definition layer',
    },
    filtersAria: 'Report categories',
    notice: {
      title: 'Catalog versus generated output',
      body: 'This page defines authoritative report contracts. A definition can be ready even when no persisted export file or delivery schedule exists.',
    },
    detail: {
      subtitle: 'Report definition',
      sourceContract: 'Source contract',
      metricSet: 'Metric set',
      ownsSuffix: 'owns this definition',
    },
  },
  scheduled: {
    emptyKpis: {
      schedules: { label: 'Schedules', support: 'No schedule opened yet' },
      deliveryChannel: { label: 'Delivery channel', value: 'Connected', support: 'Daily runner delivers digest and CSV' },
      runHistory: { label: 'Run history', value: 'Pending', support: 'Populates after the first run' },
      definitions: { label: 'Definitions', value: 'Ready', support: 'Use the report library' },
    },
    empty: {
      title: 'No delivery schedule yet',
      body: 'Open the first schedule from this page — the daily runner picks it up on its next planned run.',
    },
    previewNotice: {
      title: 'Preview schedules',
      emptyBody: 'This preview demonstrates the intended scheduler UI and is not connected to production delivery.',
      listBody: 'Delivery rows are representative fixtures used to validate the future scheduler workbench.',
    },
    kpis: {
      schedules: { label: 'Schedules', support: 'Configured deliveries' },
      active: { label: 'Active', support: 'Eligible for next run' },
      next24h: { label: 'Next 24 hours', support: 'Upcoming executions' },
      needsAttention: { label: 'Needs attention', support: 'Failure or manual review' },
    },
    header: {
      title: 'Delivery calendar',
      support: 'Cadence, owner, recipients and execution state without hiding failed runs.',
    },
    statusFilterAria: 'Schedule status',
    nextRun: 'Next run',
    lastRun: 'Last run',
    detail: {
      subtitle: 'Schedule definition',
      cadence: 'Cadence',
      format: 'Format',
      recipients: 'Recipients',
      lastStatus: 'Last status',
      neverRun: 'Never run',
      closePreview: 'Close preview',
    },
  },
  kpiDefinitions: {
    kpis: {
      definitions: { label: 'KPI definitions', support: 'Shared metric vocabulary' },
      sourceBacked: { label: 'Source backed', support: 'Definition and feed available' },
      sourceGaps: { label: 'Source gaps', support: 'Definition retained, feed pending' },
      owners: { label: 'Owners', support: 'Named accountability' },
    },
    header: {
      title: 'Metric dictionary',
      support: 'Every number keeps its formula, denominator, source, grain, freshness and interpretation guardrail.',
      badge: 'Versioned contract',
    },
    searchPlaceholder: 'Search metric or source',
    allDomains: 'All domains',
    formula: 'Formula',
    sourceGrain: 'Source · grain',
    statusBadge: { defined: 'Defined', sourceGap: 'Source gap' },
    emptyMatches: {
      title: 'No KPI matches this view',
      body: 'Clear the search or choose another metric domain.',
    },
    detail: {
      subtitleSuffix: (domain: string) => `${domain} KPI definition`,
      businessDefinition: 'Business definition',
      interpretationGuardrail: 'Interpretation guardrail',
      source: 'Source',
      grain: 'Grain',
    },
  },
} as const;

const tr: Mirror<typeof en> = {
  shared: {
    fields: {
      owner: 'Sahip',
      freshness: 'Güncellik',
    },
  },
  categories: {
    all: 'Tüm raporlar',
    executive: 'Yönetici',
    revenue: 'Gelir',
    product: 'Ürün',
    customer: 'Müşteri',
    security: 'Güvenlik',
    support: 'Destek',
  },
  library: {
    statusBadge: { ready: 'Kaynak hazır', partial: 'Kısmi' },
    kpis: {
      definitions: { label: 'Rapor tanımları', support: 'Yeniden kullanılabilir operasyon görünümleri' },
      sourceReady: { support: (percent: number) => `%${percent} katalog kapsamı` },
      partialSource: { label: 'Kısmi kaynak', support: 'Tanım var; beslemesi bekleniyor' },
      domains: { label: 'Alanlar', support: 'İşlevler arası katalog' },
    },
    header: {
      title: 'Operasyon rapor kataloğu',
      support: 'Amacını, kaynak sözleşmesini, metrik setini ve sahibini incelemek için bir tanım aç.',
      badge: 'Tanım katmanı',
    },
    filtersAria: 'Rapor kategorileri',
    notice: {
      title: 'Katalog ile üretilen çıktı farkı',
      body: 'Bu sayfa yetkili rapor sözleşmelerini tanımlar. Kalıcı bir dışa aktarım dosyası veya teslim zamanlaması olmasa bile bir tanım hazır sayılabilir.',
    },
    detail: {
      subtitle: 'Rapor tanımı',
      sourceContract: 'Kaynak sözleşmesi',
      metricSet: 'Metrik seti',
      ownsSuffix: 'bu tanımın sahibi',
    },
  },
  scheduled: {
    emptyKpis: {
      schedules: { label: 'Zamanlamalar', support: 'Henüz zamanlama açılmadı' },
      deliveryChannel: { label: 'Teslim kanalı', value: 'Bağlı', support: 'Günlük çalıştırıcı digest ve CSV teslim eder' },
      runHistory: { label: 'Koşu geçmişi', value: 'Bekliyor', support: 'İlk koşudan sonra dolar' },
      definitions: { label: 'Tanımlar', value: 'Hazır', support: 'Rapor kütüphanesini kullan' },
    },
    empty: {
      title: 'Henüz teslim zamanlaması yok',
      body: 'İlk zamanlamayı bu sayfadan aç — günlük çalıştırıcı sıradaki planlı koşusunda bunu alır.',
    },
    previewNotice: {
      title: 'Önizleme zamanlamaları',
      emptyBody: 'Bu önizleme amaçlanan zamanlayıcı arayüzünü gösterir ve üretim teslimatına bağlı değildir.',
      listBody: 'Teslim satırları gelecekteki zamanlayıcı çalışma masasını doğrulamak için kullanılan temsili sabit verilerdir.',
    },
    kpis: {
      schedules: { label: 'Zamanlamalar', support: 'Yapılandırılmış teslimler' },
      active: { label: 'Aktif', support: 'Sıradaki koşu için uygun' },
      next24h: { label: 'Sıradaki 24 saat', support: 'Yaklaşan çalıştırmalar' },
      needsAttention: { label: 'Dikkat gerekiyor', support: 'Hata veya elle inceleme' },
    },
    header: {
      title: 'Teslim takvimi',
      support: 'Başarısız koşuları gizlemeden kadans, sahip, alıcı ve çalıştırma durumu.',
    },
    statusFilterAria: 'Zamanlama durumu',
    nextRun: 'Sıradaki koşu',
    lastRun: 'Son koşu',
    detail: {
      subtitle: 'Zamanlama tanımı',
      cadence: 'Kadans',
      format: 'Biçim',
      recipients: 'Alıcılar',
      lastStatus: 'Son durum',
      neverRun: 'Hiç koşmadı',
      closePreview: 'Önizlemeyi kapat',
    },
  },
  kpiDefinitions: {
    kpis: {
      definitions: { label: 'KPI tanımları', support: 'Paylaşılan metrik sözlüğü' },
      sourceBacked: { label: 'Kaynak destekli', support: 'Tanım ve besleme mevcut' },
      sourceGaps: { label: 'Kaynak eksikleri', support: 'Tanım korundu, besleme bekliyor' },
      owners: { label: 'Sahipler', support: 'Adlandırılmış sorumluluk' },
    },
    header: {
      title: 'Metrik sözlüğü',
      support: 'Her sayı formülünü, paydasını, kaynağını, ayrıntı düzeyini, güncelliğini ve yorumlama uyarısını taşır.',
      badge: 'Sürümlü sözleşme',
    },
    searchPlaceholder: 'Metrik veya kaynak ara',
    allDomains: 'Tüm alanlar',
    formula: 'Formül',
    sourceGrain: 'Kaynak · ayrıntı düzeyi',
    statusBadge: { defined: 'Tanımlı', sourceGap: 'Kaynak eksik' },
    emptyMatches: {
      title: 'Bu görünümle eşleşen KPI yok',
      body: 'Aramayı temizle veya başka bir metrik alanı seç.',
    },
    detail: {
      subtitleSuffix: (domain: string) => `${domain} KPI tanımı`,
      businessDefinition: 'İş tanımı',
      interpretationGuardrail: 'Yorumlama uyarısı',
      source: 'Kaynak',
      grain: 'Ayrıntı düzeyi',
    },
  },
};

export const adminReports = { en, tr } as const;

export type AdminReportsDict = Mirror<typeof en>;
