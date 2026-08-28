import type { Mirror } from '../types';

/**
 * Komuta merkezi sözlüğü (Task 4) — `CommandCenterView` + `CommandCenterControls`
 * ortak sözlüğü, tek dosyada tutulur (iki bileşen aynı ekranın parçaları,
 * bazı anahtarları — "Billed"/"Collected"/"Outstanding" gibi — birbirinden
 * bağımsız ama aynı anlamda kullanır; bilinçli tekrar, kırılgan çapraz
 * referans yerine).
 *
 * `view` → CommandCenterView.tsx; `controls` → CommandCenterControls.tsx.
 * `live`/`setup`/`Staff` gibi tekrar eden tekiller `admin-common`dan,
 * `sourceState.connect` ve `snapshot.label` `admin-nav`dan gelir — burada
 * yeniden yazılmaz (bkz. çağrı yerlerindeki `adminCommon`/`adminNav` importları).
 *
 * `AdminPageHeader`e geçen `crumb`/`title`/`support` PROP'ları Task 12'de
 * kapatıldı: `crumb`/`title` `adminNav[lang].menu.commandCenter` ile bayt-
 * bayt aynı olduğu için burada tekrar yazılmaz (bkz. `view` bloğunun kendi
 * notu), `support` ise aşağıdaki `headerSupport` anahtarından çevrilir.
 * Sekiz "temel" çalışma alanı sayfasının (henüz kendi ekranı olmayanlar)
 * prop'ları da aşağıdaki `workspaceFoundation` bloğunda (Task 12 backfill).
 */

const en = {
  view: {
    headerCustomersLink: 'Customers',
    /**
     * Task 12 — `AdminPageHeader` prop'ları. `crumb`/`title` çağrı yerinde
     * `adminNav[lang].menu.commandCenter` ile bayt-bayt AYNI olduğu için
     * burada tekrar yazılmaz (`CommandCenterView.tsx` zaten `adminNav`
     * import ediyor — `metaStateLabel`'in `sourceState.connect`i).
     */
    headerSupport: 'Run customers, revenue, product operations and governance from one source-aware workspace.',
    quickActions: {
      title: 'Control shortcuts',
      subtitle: 'Jump directly into the operating task, not another summary page.',
      badge: '8 workbenches',
      items: {
        findCustomer: { label: 'Find customer', detail: 'Organizations and users' },
        createInvoice: { label: 'Create invoice', detail: 'Manual billing record' },
        reviewTrials: { label: 'Review trials', detail: 'Ending and expired' },
        seatExceptions: { label: 'Seat exceptions', detail: 'Active over entitled' },
        supportQueue: { label: 'Support queue', detail: 'Cases and follow-ups' },
        contentDesk: { label: 'Content desk', detail: 'Pages and approvals' },
        accessAudit: { label: 'Access audit', detail: 'Sensitive customer reads' },
        reportLibrary: { label: 'Report library', detail: 'Defined operating views' },
      },
    },
    controlDesk: {
      eyebrow: "TODAY'S CONTROL DESK",
      itemsNeedAttention: (n: number) => `${n} items need attention`,
      support: 'Critical exceptions lead; routine monitoring stays out of the way.',
      critical: (n: number) => `${n} critical`,
      warning: (n: number) => `${n} warning`,
      trialsEnding: (n: number) => `${n} trials ending`,
      seatUtilization: 'Seat utilization',
      openQueue: 'Open action queue',
    },
    stats: {
      activeSeats: { label: 'Active seats', support: 'Current billing footprint' },
      billingCustomers: { label: 'Billing customers', support: (n: number) => `${n} total workspaces` },
      billed: { label: 'Billed', support: (n: number) => `${n} authoritative invoices` },
      collected: { label: 'Collected', support: (pct: number) => `${pct}% of billed amount` },
      outstanding: {
        label: 'Outstanding',
        support: (due: number, overdue: number) => `${due} due · ${overdue} overdue`,
      },
      activityCoverage: {
        label: 'Activity coverage',
        support: (coverage: number, total: number) => `${coverage}/${total} roots with events`,
      },
    },
    operatingCalendar: {
      title: 'Operating calendar',
      subtitle: 'Deadlines and recurring control checks',
      trialReview: {
        label: 'Trial review',
        ending: (n: number, next: string) => `${n} ending · next ${next}`,
        none: 'No trials ending in 7 days',
        defaultNext: 'this week',
      },
      receivables: {
        label: 'Receivables',
        overdue: (n: number) => `${n} overdue invoice${n === 1 ? '' : 's'}`,
        none: 'Nothing overdue',
      },
      accessReview: {
        label: 'Access review',
        detail: (n: number) => `${n} sensitive reads in 24h`,
      },
      releaseHealth: {
        label: 'Release health',
        detail: 'Deployment source not connected',
      },
    },
    approvalCenter: {
      title: 'Approval center',
      subtitle: 'High-risk changes require an explicit path',
      modelBadge: 'Model',
      action: 'Design approval policies',
      items: {
        invoiceVoids: 'Invoice voids',
        entitlementReductions: 'Entitlement reductions',
        legalPublishing: 'Legal publishing',
        productionFeatureFlags: 'Production feature flags',
      },
    },
    dataReadiness: {
      title: 'Data readiness',
      subtitle: 'Sources behind every control surface',
      action: 'Open measurement plan',
      items: {
        coreDatabase: { label: 'Core database', detail: 'Customers, seats, members' },
        billingLedger: { label: 'Billing ledger', detail: 'Invoices and payments' },
        productEventLayer: { label: 'Product event layer', detail: 'Activation and exports' },
        observability: { label: 'Observability', detail: 'Errors, jobs and uptime' },
      },
    },
    customerHealth: {
      title: 'Customer health',
      subtitle: 'Transparent operational signals, not a hidden score',
      healthy: 'Healthy',
      watch: 'Watch',
      risk: 'Risk',
      facts: {
        activityPresent: 'Activity present',
        withinEntitlement: 'Within seat entitlement',
        commercialStateVisible: 'Commercial state visible',
      },
    },
    controlPlaneLaunchpad: {
      title: 'Control plane',
      subtitle: 'Specialist workspaces keep the command center focused.',
      badge: '3 live · 5 foundation',
      items: {
        customers: { label: 'Customers', support: 'Organizations, people and seats' },
        product: { label: 'Product', support: 'Activation, builder and exports' },
        revenue: { label: 'Revenue', support: 'Invoices, collection and pricing' },
        growth: { label: 'Growth', support: 'Acquisition, leads and content' },
        support: { label: 'Support', support: 'Cases, tasks and playbooks' },
        platform: { label: 'Platform', support: 'Health, jobs and releases' },
        security: { label: 'Security', support: 'Access, actions and governance' },
        reports: { label: 'Reports', support: 'Recurring operating reports' },
      },
    },
  },
  controls: {
    cockpit: {
      title: 'Analysis cockpit',
      subtitle: 'Current truth first; historical panels unlock with instrumentation.',
      tabs: {
        business: 'Business',
        product: 'Product',
        revenue: 'Revenue',
        growth: 'Growth',
        reliability: 'Reliability',
      },
      business: {
        chartTitle: 'Active seats by customer',
        chartSubtitle: 'Largest current billing roots',
        noData: {
          title: 'No seat records',
          text: 'Seat distribution appears when customers have active senders.',
        },
        seriesName: 'Active seats',
        donutLabels: ['Active', 'Trial', 'Past due', 'Cancelled'] as readonly string[],
        donutCenter: 'Customers',
        billingRoots: 'Billing roots',
        workspaces: 'Workspaces',
        seatUtilization: 'Seat utilization',
      },
      product: {
        eyebrow: 'EVENT LAYER REQUIRED',
        title: 'Activation and product depth',
        support:
          'This funnel needs durable product events before it can report conversion or time-to-value.',
        steps: [
          'Signup',
          'Verified',
          'Org created',
          'Signature saved',
          'Sender live',
          'First export',
        ] as readonly string[],
      },
      revenue: {
        donutLabels: ['Paid', 'Due', 'Void'] as readonly string[],
        donutCenter: 'Invoices',
        collectionProgress: 'Collection progress',
        billingLive: 'Billing live',
        billed: 'Billed',
        collected: 'Collected',
        outstanding: 'Outstanding',
        action: 'Open revenue workbench',
      },
      growth: {
        eyebrow: 'ANALYTICS CONNECTION REQUIRED',
        title: 'Acquisition to activated customer',
        support:
          'Sessions, campaign attribution and landing-page conversion need a governed analytics source.',
        steps: ['Sessions', 'Signup', 'Verified', 'Activated', 'First export'] as readonly string[],
      },
      reliability: {
        action: 'Open platform control plan',
        noMonitor: 'No monitor',
        sources: {
          coreDatabase: { label: 'Core database', detail: 'Customers, seats and membership' },
          billingLedger: { label: 'Billing ledger', detail: 'Invoices and payment state' },
          webApplication: { label: 'Web application', detail: 'No uptime or latency monitor' },
          smtp: { label: 'SMTP', detail: 'No delivery event stream' },
          rendererExport: { label: 'Renderer & export', detail: 'No duration or failure rollup' },
          backgroundJobs: { label: 'Background jobs', detail: 'No job run registry' },
        },
      },
    },
    setupWorkspaceAction: 'Open setup workspace',
    instrumentBadge: 'Instrument',
    customizer: {
      trigger: 'Customize',
      closeSettingsAria: 'Close dashboard settings',
      title: 'Customize dashboard',
      sectionsVisible: (visible: number, total: number) => `${visible} of ${total} sections visible`,
      closeAria: 'Close',
      densityGroupAria: 'Dashboard density',
      density: 'Density',
      comfortable: 'Comfortable',
      compact: 'Compact',
      visibleSections: 'Visible sections',
      reset: 'Reset',
      done: 'Done',
      sections: {
        'quick-actions': 'Quick actions',
        overview: 'Operating overview',
        analysis: 'Analysis cockpit',
        operations: 'Operations center',
        audit: 'Governance and audit',
        customers: 'Customer table',
      },
    },
  },
  /**
   * Task 12 backfill — `[...workspace]/page.tsx`in yakalayıcı "temel" sayfası
   * (henüz gerçek sayfası olmayan sekiz çalışma alanı grubu için — bkz.
   * dosyanın kendi `WORKSPACE` haritası). Sekme başlığı DİNAMİK içerik
   * taşıyamaz (segment insan-okur adına çevrilir ama tek bir sabit soneke
   * ihtiyaç var) — brief'in izin verdiği "statik aile başlığı" burada
   * `metaTitle`. `groups.*.label` YOK: sekiz grup adı (`Customers`/`Product`/…)
   * `adminNav[lang].menu.customers/product/…` ile bayt-bayt AYNI, çağrı
   * yeri doğrudan oradan okur — yalnız `source`/`first`/`guardrail` (grup
   * başına üç YENİ cümle) burada.
   */
  workspaceFoundation: {
    metaTitle: 'Workspace',
    badge: 'Foundation',
    support: 'This control-plane surface is defined and ready for its data contract.',
    sourceSetup: {
      title: 'Source setup required',
      body: 'Navigation and governance are in place. This screen will not display generated or estimated metrics before its authoritative source exists.',
    },
    workspaceBadge: (label: string) => `${label} workspace`,
    buildSource: {
      title: 'Build the source before the chart.',
      body: 'The information architecture is stable, so implementation can progress module by module without another navigation redesign.',
    },
    readiness: {
      title: 'Readiness',
      informationArchitecture: 'Information architecture',
      accessBoundary: 'Access boundary',
      authoritativeSource: 'Authoritative source',
      historicalCoverage: 'Historical coverage',
      ready: 'Ready',
      required: 'Required',
      unavailable: 'Unavailable',
    },
    cards: {
      sourceContract: 'Source contract',
      firstDeliverable: 'First deliverable',
      controlBoundary: 'Control boundary',
    },
    groups: {
      customers: {
        source: 'Organizations, memberships, entitlements and activity events',
        first: 'Unified user, trial and customer-health views',
        guardrail: 'Customer personal data reads must create StaffAccess records',
      },
      product: {
        source: 'A versioned product-event taxonomy and server-side event collector',
        first: 'Activation, builder, preview and export funnels',
        guardrail: 'No inferred usage from mutable records; event history is append-only',
      },
      revenue: {
        source: 'Invoice ledger, entitlement snapshots and pricing versions',
        first: 'Revenue overview, receivables and seat movement ledger',
        guardrail: 'Never sum different currencies and never delete invoices',
      },
      growth: {
        source: 'Consent-aware web analytics, lead capture and a content registry',
        first: 'Acquisition, leads, pages, SEO and media governance',
        guardrail: 'Marketing consent and operational email purposes remain separate',
      },
      support: {
        source: 'Case model, queue ownership and customer activity context',
        first: 'Support inbox, onboarding queue and reusable playbooks',
        guardrail: 'No impersonation and no customer-content editing',
      },
      platform: {
        source: 'Job telemetry, structured errors, delivery probes and release markers',
        first: 'Health, failures, jobs, releases and feature controls',
        guardrail: 'Operational controls require confirmation, reason and audit evidence',
      },
      security: {
        source: 'StaffAccess, AdminAction, staff roles and approval records',
        first: 'Security overview, approvals, roles and KVKK request workflow',
        guardrail: 'Least privilege, four-eyes approval and immutable audit records',
      },
      reports: {
        source: 'Versioned KPI definitions backed by named source queries',
        first: 'Report library, schedules and an auditable KPI dictionary',
        guardrail: 'Every number must expose definition, source, grain and freshness',
      },
    },
  },
} as const;

const tr: Mirror<typeof en> = {
  view: {
    headerCustomersLink: 'Müşteriler',
    headerSupport: 'Müşterileri, geliri, ürün operasyonlarını ve yönetişimi tek bir kaynağa duyarlı çalışma alanından yürüt.',
    quickActions: {
      title: 'Kontrol kısayolları',
      subtitle: 'Doğrudan yapılacak işe atla, başka bir özet sayfasına değil.',
      badge: '8 iş istasyonu',
      items: {
        findCustomer: { label: 'Müşteri bul', detail: 'Organizasyonlar ve kullanıcılar' },
        createInvoice: { label: 'Fatura oluştur', detail: 'Elle faturalama kaydı' },
        reviewTrials: { label: 'Denemeleri incele', detail: 'Biten ve süresi dolan' },
        seatExceptions: { label: 'Koltuk istisnaları', detail: 'Tahsisi aşan aktifler' },
        supportQueue: { label: 'Destek kuyruğu', detail: 'Talepler ve takipler' },
        contentDesk: { label: 'İçerik masası', detail: 'Sayfalar ve onaylar' },
        accessAudit: { label: 'Erişim denetimi', detail: 'Hassas müşteri okumaları' },
        reportLibrary: { label: 'Rapor kütüphanesi', detail: 'Tanımlı operasyon görünümleri' },
      },
    },
    controlDesk: {
      eyebrow: 'BUGÜNÜN KONTROL MASASI',
      itemsNeedAttention: (n: number) => `${n} öğe eylem bekliyor`,
      support: 'Kritik istisnalar öne çıkar; rutin izleme göz önünde durmaz.',
      critical: (n: number) => `${n} kritik`,
      warning: (n: number) => `${n} uyarı`,
      trialsEnding: (n: number) => `${n} deneme bitiyor`,
      seatUtilization: 'Koltuk kullanımı',
      openQueue: 'Eylem kuyruğunu aç',
    },
    stats: {
      activeSeats: { label: 'Aktif koltuklar', support: 'Güncel faturalama ayak izi' },
      billingCustomers: { label: 'Faturalanan müşteriler', support: (n: number) => `${n} toplam çalışma alanı` },
      billed: { label: 'Faturalanan', support: (n: number) => `${n} resmi fatura` },
      collected: { label: 'Tahsil edilen', support: (pct: number) => `Faturalanan tutarın %${pct}'i` },
      outstanding: {
        label: 'Bekleyen bakiye',
        support: (due: number, overdue: number) => `${due} vadeli · ${overdue} gecikmiş`,
      },
      activityCoverage: {
        label: 'Etkinlik kapsamı',
        support: (coverage: number, total: number) => `${coverage}/${total} kökte etkinlik var`,
      },
    },
    operatingCalendar: {
      title: 'Operasyon takvimi',
      subtitle: 'Son tarihler ve tekrarlayan kontrol denetimleri',
      trialReview: {
        label: 'Deneme incelemesi',
        ending: (n: number, next: string) => `${n} tanesi bitiyor · sıradaki ${next}`,
        none: '7 gün içinde biten deneme yok',
        defaultNext: 'bu hafta',
      },
      receivables: {
        label: 'Alacaklar',
        overdue: (n: number) => `${n} gecikmiş fatura`,
        none: 'Gecikmiş bir şey yok',
      },
      accessReview: {
        label: 'Erişim incelemesi',
        detail: (n: number) => `24 saatte ${n} hassas okuma`,
      },
      releaseHealth: {
        label: 'Dağıtım sağlığı',
        detail: 'Dağıtım kaynağı bağlı değil',
      },
    },
    approvalCenter: {
      title: 'Onay merkezi',
      subtitle: 'Yüksek riskli değişiklikler açık bir onay yolu gerektirir',
      modelBadge: 'Model',
      action: 'Onay politikalarını tasarla',
      items: {
        invoiceVoids: 'Fatura iptalleri',
        entitlementReductions: 'Tahsis azaltmaları',
        legalPublishing: 'Yasal içerik yayını',
        productionFeatureFlags: 'Üretim özellik bayrakları',
      },
    },
    dataReadiness: {
      title: 'Veri hazırlığı',
      subtitle: 'Her kontrol yüzeyinin arkasındaki kaynaklar',
      action: 'Ölçüm planını aç',
      items: {
        coreDatabase: { label: 'Çekirdek veritabanı', detail: 'Müşteriler, koltuklar, üyeler' },
        billingLedger: { label: 'Faturalama defteri', detail: 'Faturalar ve ödemeler' },
        productEventLayer: { label: 'Ürün olay katmanı', detail: 'Aktivasyon ve dışa aktarımlar' },
        observability: { label: 'Gözlemlenebilirlik', detail: 'Hatalar, işler ve çalışma süresi' },
      },
    },
    customerHealth: {
      title: 'Müşteri sağlığı',
      subtitle: 'Gizli bir skor değil, şeffaf operasyonel sinyaller',
      healthy: 'Sağlıklı',
      watch: 'İzlemede',
      risk: 'Risk',
      facts: {
        activityPresent: 'Etkinlik var',
        withinEntitlement: 'Koltuk tahsisi içinde',
        commercialStateVisible: 'Ticari durum görünür',
      },
    },
    controlPlaneLaunchpad: {
      title: 'Kontrol katmanı',
      subtitle: 'Uzman çalışma alanları komuta merkezini odaklı tutar.',
      badge: '3 canlı · 5 temel',
      items: {
        customers: { label: 'Müşteriler', support: 'Organizasyonlar, kişiler ve koltuklar' },
        product: { label: 'Ürün', support: "Aktivasyon, builder ve dışa aktarımlar" },
        revenue: { label: 'Gelir', support: 'Faturalar, tahsilat ve fiyatlandırma' },
        growth: { label: 'Büyüme', support: 'Kazanım, adaylar ve içerik' },
        support: { label: 'Destek', support: "Talepler, görevler ve playbook'lar" },
        platform: { label: 'Platform', support: 'Sağlık, işler ve dağıtımlar' },
        security: { label: 'Güvenlik', support: 'Erişim, işlemler ve yönetişim' },
        reports: { label: 'Raporlar', support: 'Tekrarlayan operasyon raporları' },
      },
    },
  },
  controls: {
    cockpit: {
      title: 'Analiz kokpiti',
      subtitle: 'Önce güncel gerçek; geçmiş paneller ölçümleme bağlanınca açılır.',
      tabs: {
        business: 'İşletme',
        product: 'Ürün',
        revenue: 'Gelir',
        growth: 'Büyüme',
        reliability: 'Güvenilirlik',
      },
      business: {
        chartTitle: 'Müşteriye göre aktif koltuklar',
        chartSubtitle: 'En büyük güncel faturalama kökleri',
        noData: {
          title: 'Koltuk kaydı yok',
          text: 'Koltuk dağılımı, müşterilerin aktif göndericileri olduğunda görünür.',
        },
        seriesName: 'Aktif koltuklar',
        donutLabels: ['Aktif', 'Deneme', 'Vadesi geçmiş', 'İptal edildi'],
        donutCenter: 'Müşteriler',
        billingRoots: 'Faturalama kökleri',
        workspaces: 'Çalışma alanları',
        seatUtilization: 'Koltuk kullanımı',
      },
      product: {
        eyebrow: 'OLAY KATMANI GEREKLİ',
        title: 'Aktivasyon ve ürün derinliği',
        support:
          'Bu huni, dönüşümü ya da değere ulaşma süresini raporlayabilmek için kalıcı ürün olaylarına ihtiyaç duyar.',
        steps: [
          'Kayıt',
          'Doğrulandı',
          'Organizasyon oluşturuldu',
          'İmza kaydedildi',
          'Gönderici yayında',
          'İlk dışa aktarım',
        ],
      },
      revenue: {
        donutLabels: ['Ödendi', 'Vadeli', 'İptal'],
        donutCenter: 'Faturalar',
        collectionProgress: 'Tahsilat ilerlemesi',
        billingLive: 'Faturalama canlı',
        billed: 'Faturalanan',
        collected: 'Tahsil edilen',
        outstanding: 'Bekleyen bakiye',
        action: 'Gelir iş istasyonunu aç',
      },
      growth: {
        eyebrow: 'ANALİTİK BAĞLANTISI GEREKLİ',
        title: 'Kazanımdan aktif müşteriye',
        support:
          'Oturumlar, kampanya atfı ve açılış sayfası dönüşümü, denetimli bir analitik kaynağına ihtiyaç duyar.',
        steps: ['Oturumlar', 'Kayıt', 'Doğrulandı', 'Aktifleşti', 'İlk dışa aktarım'],
      },
      reliability: {
        action: 'Platform kontrol planını aç',
        noMonitor: 'İzleyici yok',
        sources: {
          coreDatabase: { label: 'Çekirdek veritabanı', detail: 'Müşteriler, koltuklar ve üyelik' },
          billingLedger: { label: 'Faturalama defteri', detail: 'Faturalar ve ödeme durumu' },
          webApplication: { label: 'Web uygulaması', detail: 'Çalışma süresi ya da gecikme izleyicisi yok' },
          smtp: { label: 'SMTP', detail: 'Teslimat olay akışı yok' },
          rendererExport: { label: 'Renderer ve dışa aktarım', detail: 'Süre ya da hata toplulaştırması yok' },
          backgroundJobs: { label: 'Arka plan işleri', detail: 'İş çalıştırma kaydı yok' },
        },
      },
    },
    setupWorkspaceAction: 'Kurulum çalışma alanını aç',
    instrumentBadge: 'Ölçümle',
    customizer: {
      trigger: 'Özelleştir',
      closeSettingsAria: 'Panel ayarlarını kapat',
      title: 'Paneli özelleştir',
      sectionsVisible: (visible: number, total: number) => `${total} bölümden ${visible} tanesi görünür`,
      closeAria: 'Kapat',
      densityGroupAria: 'Panel yoğunluğu',
      density: 'Yoğunluk',
      comfortable: 'Rahat',
      compact: 'Kompakt',
      visibleSections: 'Görünür bölümler',
      reset: 'Sıfırla',
      done: 'Tamam',
      sections: {
        'quick-actions': 'Hızlı eylemler',
        overview: 'Operasyon özeti',
        analysis: 'Analiz kokpiti',
        operations: 'Operasyon merkezi',
        audit: 'Yönetişim ve denetim',
        customers: 'Müşteri tablosu',
      },
    },
  },
  workspaceFoundation: {
    metaTitle: 'Çalışma alanı',
    badge: 'Temel',
    support: 'Bu kontrol katmanı yüzeyi tanımlıdır ve veri sözleşmesi için hazırdır.',
    sourceSetup: {
      title: 'Kaynak kurulumu gerekli',
      body: 'Gezinme ve yönetişim hazır. Bu ekran, yetkili kaynağı var olmadan üretilmiş veya tahmini metrik göstermez.',
    },
    workspaceBadge: (label: string) => `${label} çalışma alanı`,
    buildSource: {
      title: 'Grafikten önce kaynağı kur.',
      body: 'Bilgi mimarisi kararlı, bu yüzden uygulama başka bir gezinme yeniden tasarımı olmadan modül modül ilerleyebilir.',
    },
    readiness: {
      title: 'Hazırlık',
      informationArchitecture: 'Bilgi mimarisi',
      accessBoundary: 'Erişim sınırı',
      authoritativeSource: 'Yetkili kaynak',
      historicalCoverage: 'Geçmiş kapsam',
      ready: 'Hazır',
      required: 'Gerekli',
      unavailable: 'Kullanılamaz',
    },
    cards: {
      sourceContract: 'Kaynak sözleşmesi',
      firstDeliverable: 'İlk teslim',
      controlBoundary: 'Kontrol sınırı',
    },
    groups: {
      customers: {
        source: 'Organizasyonlar, üyelikler, tahsisler ve etkinlik kayıtları',
        first: 'Birleşik kullanıcı, deneme ve müşteri sağlığı görünümleri',
        guardrail: 'Müşteri kişisel verisi okumaları StaffAccess kaydı oluşturmalı',
      },
      product: {
        source: 'Sürümlenmiş bir ürün olayı taksonomisi ve sunucu taraflı olay toplayıcı',
        first: 'Aktivasyon, builder, önizleme ve dışa aktarım hunileri',
        guardrail: 'Değişebilir kayıtlardan çıkarılan kullanım yok; olay geçmişi yalnız-ekleme',
      },
      revenue: {
        source: 'Fatura defteri, tahsis anlık görüntüleri ve fiyatlandırma sürümleri',
        first: 'Gelir özeti, alacaklar ve koltuk hareket defteri',
        guardrail: 'Farklı para birimlerini asla toplama, faturaları asla silme',
      },
      growth: {
        source: 'Onay-duyarlı web analitiği, aday yakalama ve bir içerik kaydı',
        first: 'Kazanım, adaylar, sayfalar, SEO ve medya yönetişimi',
        guardrail: 'Pazarlama onayı ve işlemsel e-posta amaçları ayrı kalır',
      },
      support: {
        source: 'Vaka modeli, kuyruk sahipliği ve müşteri etkinlik bağlamı',
        first: "Destek gelen kutusu, katılım kuyruğu ve yeniden kullanılabilir playbook'lar",
        guardrail: 'Kimliğe bürünme yok, müşteri içeriği düzenlemesi yok',
      },
      platform: {
        source: 'İş telemetrisi, yapılandırılmış hatalar, teslim sondaları ve dağıtım işaretleri',
        first: 'Sağlık, hatalar, işler, dağıtımlar ve özellik kontrolleri',
        guardrail: 'Operasyonel kontroller onay, sebep ve denetim kanıtı gerektirir',
      },
      security: {
        source: 'StaffAccess, AdminAction, personel rolleri ve onay kayıtları',
        first: 'Güvenlik özeti, onaylar, roller ve KVKK talep iş akışı',
        guardrail: 'En az yetki, dört göz onayı ve değişmez denetim kayıtları',
      },
      reports: {
        source: 'Adlandırılmış kaynak sorgularına dayanan sürümlenmiş KPI tanımları',
        first: 'Rapor kütüphanesi, zamanlamalar ve denetlenebilir bir KPI sözlüğü',
        guardrail: 'Her sayı tanımını, kaynağını, ayrıntı düzeyini ve güncelliğini göstermeli',
      },
    },
  },
};

export const adminCommand = { en, tr } as const;
