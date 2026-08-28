import type { Mirror } from '../types';

/**
 * Personel kabuğu sözlüğü — `nav.ts` (PanelShell) emsali BİREBİR: AdminShell
 * (MENU, WORKSPACE_SHORTCUTS, kabuk metinleri), AdminNavbarTools
 * (QuickCreateMenu, SnapshotMenu, AdminNotifications/operations inbox),
 * AdminSearch, StaffUserMenu ve paylaşılan `ui/` bileşenleri (AdminQueue,
 * AdminAuditTimeline) burada. Tekrar eden tek kelimeler (`Live`/`Setup`/
 * `Staff`) `admin-common`dan, `Cancel`/`Close` `common`dan gelir — burada
 * yeniden yazılmaz.
 *
 * `menu` TEK düz nesne — PanelShell'in `MenuLabelKey = keyof nav.en.menu`
 * deseni birebir: header/item/group/child etiketleri aynı düz ad alanını
 * paylaşır, `t.menu[entry.labelKey]` ile çözülür.
 */

const en = {
  menu: {
    controlPlane: 'Control plane',
    commandCenter: 'Command center',

    customers: 'Customers',
    customersOrganizations: 'Organizations',
    customersUsers: 'Users',
    customersTrials: 'Trials & entitlements',
    customersHealth: 'Customer health',

    product: 'Product',
    productOverview: 'Product overview',
    productActivation: 'Activation funnel',
    productBuilder: 'Builder usage',
    productExports: 'Exports',
    productTemplates: 'Templates',
    productCohorts: 'Cohorts & retention',

    revenue: 'Revenue',
    revenueOverview: 'Revenue overview',
    revenueInvoices: 'Invoices',
    revenueReceivables: 'Receivables',
    revenueSeatLedger: 'Seat ledger',
    revenuePricingVersions: 'Pricing versions',

    growth: 'Growth & content',
    growthOverview: 'Growth overview',
    growthAcquisition: 'Acquisition',
    growthLeads: 'Leads',
    growthPagesSeo: 'Pages & SEO',
    growthMediaLibrary: 'Media library',
    growthLegalContent: 'Legal content',

    support: 'Support',
    supportQueue: 'Support queue',
    supportCases: 'Cases',
    supportOnboarding: 'Onboarding',
    supportPlaybooks: 'Playbooks',

    platform: 'Platform',
    platformSystemHealth: 'System health',
    platformMailDelivery: 'Mail delivery',
    platformExportPipeline: 'Export pipeline',
    platformJobs: 'Jobs',
    platformErrors: 'Errors',
    platformReleases: 'Releases',
    platformFeatureFlags: 'Feature flags',

    security: 'Security & governance',
    securityOverview: 'Security overview',
    securityAccessLog: 'Staff access log',
    securityActionLog: 'Admin action log',
    securityStaffRoles: 'Staff & roles',
    securityApprovals: 'Approvals',
    securityKvkkRequests: 'KVKK requests',

    reports: 'Reports',
    reportsLibrary: 'Report library',
    reportsScheduled: 'Scheduled reports',
    reportsKpiDefinitions: 'KPI definitions',
  },
  shortcuts: {
    customers: 'Customers',
    product: 'Product',
    revenue: 'Revenue',
    growth: 'Growth',
    platform: 'Platform',
    security: 'Security',
  },
  workspaceSwitcher: {
    ariaLabel: 'Open workspaces',
    heading: 'Control plane',
    badge: (n: number) => `${n} workspaces`,
    kpiDefinitions: 'KPI definitions',
  },
  shell: {
    toggleMenu: 'Toggle menu',
    openMenu: 'Open menu',
    topBar: 'Staff top bar',
    staffContextAria: 'Staff production console',
    staffConsole: 'Staff console',
    productionControl: 'Production control',
    envRailLabel: 'STAFF · PRODUCTION',
    envRailCopy: 'customer data — every sensitive view is logged',
    footerCopyright: (year: number) => `© ${year} Mailmyra staff operations — Voldi Creative`,
    footerAllAccessRecorded: 'All access is recorded',
  },
  quickCreate: {
    ariaLabel: 'Quick create',
    label: 'Quick create',
    header: 'Create',
    subheader: 'Safe entry points to governed workflows',
    actions: {
      invoice: {
        label: 'Create invoice',
        detail: 'Pick the customer first — invoices are issued from the org page.',
      },
      supportCase: {
        label: 'Open support case',
        detail: 'Create an owned customer follow-up',
      },
      dataRequest: {
        label: 'Open data request',
        detail: 'Track a KVKK or GDPR workflow',
      },
    },
  },
  snapshot: {
    ariaLabel: 'Open data snapshot',
    label: 'Current snapshot',
    header: 'Data snapshot',
    subheader: 'Current authoritative records',
    comparisonNote:
      'Historical comparison unlocks after the event and rollup layers are connected.',
  },
  sourceStatus: {
    coreDatabase: 'Core database',
    billingLedger: 'Billing ledger',
    productEvents: 'Product events',
    platformMonitoring: 'Platform monitoring',
    growthAnalytics: 'Growth analytics',
  },
  /** `live`/`setup` `admin-common`dan gelir — burada yalnız fazlası. */
  sourceState: {
    connect: 'Connect',
  },
  operationsInbox: {
    openAria: 'Open operations inbox',
    closeAria: 'Close operations inbox',
    dialogAria: 'Operations inbox',
    header: 'Operations inbox',
    subheader: 'Alerts, approvals and source readiness',
    observabilityTitle: 'Observability is not connected',
    observabilityBody: 'Platform incidents and job failures cannot alert staff yet.',
    sourceReadiness: 'Source readiness',
    controlShortcuts: 'Control shortcuts',
    pendingApprovals: 'Pending approvals',
    platformHealth: 'Platform health',
    measurementPlan: 'Measurement plan',
    footerNote: 'No inferred uptime and no fabricated alert counts.',
  },
  search: {
    placeholder: 'Org, invoice or email',
    ariaLabel: 'Search customers',
    noMatches: 'No matches.',
  },
  userMenu: {
    ariaLabel: 'Staff menu',
    logOut: 'Log out',
  },
  queue: {
    title: 'Action queue',
    subtitle: 'Sorted by severity and deadline.',
    openOrgAria: (orgName: string) => `Open ${orgName}`,
    severityAria: (severity: number) => `severity ${severity}`,
  },
  auditTimeline: {
    title: 'Staff activity',
    subtitle: 'Sensitive reads and controlled writes',
    openLogAria: 'Open access log',
    tabs: {
      all: 'All',
      access: 'Access',
      actions: 'Actions',
    },
    empty: 'No activity in this view.',
    relativeTime: {
      now: 'now',
      minutesSuffix: 'm',
      hoursSuffix: 'h',
      daysSuffix: 'd',
    },
  },
} as const;

const tr: Mirror<typeof en> = {
  menu: {
    controlPlane: 'Kontrol katmanı',
    commandCenter: 'Komuta merkezi',

    customers: 'Müşteriler',
    customersOrganizations: 'Organizasyonlar',
    customersUsers: 'Kullanıcılar',
    customersTrials: 'Denemeler ve tahsisler',
    customersHealth: 'Müşteri sağlığı',

    product: 'Ürün',
    productOverview: 'Ürün özeti',
    productActivation: 'Aktivasyon hunisi',
    productBuilder: "Builder kullanımı",
    productExports: 'Dışa aktarımlar',
    productTemplates: 'Şablonlar',
    productCohorts: 'Kohortlar ve elde tutma',

    revenue: 'Gelir',
    revenueOverview: 'Gelir özeti',
    revenueInvoices: 'Faturalar',
    revenueReceivables: 'Alacaklar',
    revenueSeatLedger: 'Koltuk defteri',
    revenuePricingVersions: 'Fiyat sürümleri',

    growth: 'Büyüme ve içerik',
    growthOverview: 'Büyüme özeti',
    growthAcquisition: 'Kazanım',
    growthLeads: 'Adaylar',
    growthPagesSeo: 'Sayfalar ve SEO',
    growthMediaLibrary: 'Medya kütüphanesi',
    growthLegalContent: 'Yasal içerik',

    support: 'Destek',
    supportQueue: 'Destek kuyruğu',
    supportCases: 'Talepler',
    supportOnboarding: 'Onboarding',
    supportPlaybooks: "Playbook'lar",

    platform: 'Platform',
    platformSystemHealth: 'Sistem sağlığı',
    platformMailDelivery: 'E-posta teslimi',
    platformExportPipeline: 'Dışa aktarım hattı',
    platformJobs: 'İşler',
    platformErrors: 'Hatalar',
    platformReleases: 'Dağıtımlar',
    platformFeatureFlags: 'Özellik bayrakları',

    security: 'Güvenlik ve yönetişim',
    securityOverview: 'Güvenlik özeti',
    securityAccessLog: 'Personel erişim günlüğü',
    securityActionLog: 'Yönetici işlem günlüğü',
    securityStaffRoles: 'Personel ve roller',
    securityApprovals: 'Onaylar',
    securityKvkkRequests: 'KVKK talepleri',

    reports: 'Raporlar',
    reportsLibrary: 'Rapor kütüphanesi',
    reportsScheduled: 'Zamanlanmış raporlar',
    reportsKpiDefinitions: 'KPI tanımları',
  },
  shortcuts: {
    customers: 'Müşteriler',
    product: 'Ürün',
    revenue: 'Gelir',
    growth: 'Büyüme',
    platform: 'Platform',
    security: 'Güvenlik',
  },
  workspaceSwitcher: {
    ariaLabel: 'Çalışma alanlarını aç',
    heading: 'Kontrol katmanı',
    badge: (n: number) => `${n} çalışma alanı`,
    kpiDefinitions: 'KPI tanımları',
  },
  shell: {
    toggleMenu: 'Menüyü aç/kapat',
    openMenu: 'Menüyü aç',
    topBar: 'Personel üst çubuğu',
    staffContextAria: 'Personel üretim konsolu',
    staffConsole: 'Personel konsolu',
    productionControl: 'Üretim kontrolü',
    envRailLabel: 'PERSONEL · ÜRETİM',
    envRailCopy: 'müşteri verisi — her hassas görüntüleme günlüğe yazılır',
    footerCopyright: (year: number) => `© ${year} Mailmyra personel operasyonları — Voldi Creative`,
    footerAllAccessRecorded: 'Her erişim kayıt altına alınır',
  },
  quickCreate: {
    ariaLabel: 'Hızlı oluştur',
    label: 'Hızlı oluştur',
    header: 'Oluştur',
    subheader: 'Denetimli iş akışlarına güvenli giriş noktaları',
    actions: {
      invoice: {
        label: 'Fatura oluştur',
        detail: 'Önce müşteriyi seç — faturalar organizasyon sayfasından kesilir.',
      },
      supportCase: {
        label: 'Destek talebi aç',
        detail: 'Sahiplenilmiş bir müşteri takibi oluştur',
      },
      dataRequest: {
        label: 'Veri talebi aç',
        detail: 'Bir KVKK ya da GDPR sürecini takip et',
      },
    },
  },
  snapshot: {
    ariaLabel: 'Veri anlık görüntüsünü aç',
    label: 'Güncel anlık görüntü',
    header: 'Veri anlık görüntüsü',
    subheader: 'Güncel yetkili kayıtlar',
    comparisonNote:
      'Geçmişle karşılaştırma, olay ve toplulaştırma katmanları bağlanınca açılır.',
  },
  sourceStatus: {
    coreDatabase: 'Çekirdek veritabanı',
    billingLedger: 'Faturalama defteri',
    productEvents: 'Ürün olayları',
    platformMonitoring: 'Platform izleme',
    growthAnalytics: 'Büyüme analitiği',
  },
  sourceState: {
    connect: 'Bağlan',
  },
  operationsInbox: {
    openAria: 'Operasyon gelen kutusunu aç',
    closeAria: 'Operasyon gelen kutusunu kapat',
    dialogAria: 'Operasyon gelen kutusu',
    header: 'Operasyon gelen kutusu',
    subheader: 'Uyarılar, onaylar ve kaynak hazırlığı',
    observabilityTitle: 'Gözlemlenebilirlik bağlı değil',
    observabilityBody: 'Platform olayları ve iş hataları henüz personeli uyaramıyor.',
    sourceReadiness: 'Kaynak hazırlığı',
    controlShortcuts: 'Kontrol kısayolları',
    pendingApprovals: 'Bekleyen onaylar',
    platformHealth: 'Platform sağlığı',
    measurementPlan: 'Ölçüm planı',
    footerNote: 'Tahmini çalışma süresi yok, uydurma uyarı sayısı yok.',
  },
  search: {
    placeholder: 'Organizasyon, fatura ya da e-posta',
    ariaLabel: 'Müşterilerde ara',
    noMatches: 'Eşleşme yok.',
  },
  userMenu: {
    ariaLabel: 'Personel menüsü',
    logOut: 'Çıkış yap',
  },
  queue: {
    title: 'Eylem kuyruğu',
    subtitle: 'Önem ve son tarihe göre sıralanır.',
    openOrgAria: (orgName: string) => `${orgName} sayfasını aç`,
    severityAria: (severity: number) => `önem ${severity}`,
  },
  auditTimeline: {
    title: 'Personel etkinliği',
    subtitle: 'Hassas okumalar ve denetimli yazmalar',
    openLogAria: 'Erişim günlüğünü aç',
    tabs: {
      all: 'Tümü',
      access: 'Erişim',
      actions: 'İşlemler',
    },
    empty: 'Bu görünümde etkinlik yok.',
    relativeTime: {
      now: 'şimdi',
      minutesSuffix: 'dk',
      hoursSuffix: 'sa',
      daysSuffix: 'g',
    },
  },
};

export const adminNav = { en, tr } as const;
