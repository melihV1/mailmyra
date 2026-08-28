import type { Mirror } from '../types';

/**
 * Büyüme sözlüğü (Task 8) — iki çağrı yeri: `GrowthOperationsViews.tsx`
 * (altı görünüm: overview/acquisition/leads/pagesSeo/mediaLibrary/
 * legalContent + paylaşılan `PreviewBadge`/`GrowthSource`/`GrowthShortcuts`
 * parçaları) ve `LeadActions.tsx` (yeni lead diyaloğu + lead güncelleme
 * diyaloğu).
 *
 * SÖZLÜK GLOSSARY KARARLARI (brief'in "pick ONE" istediği iki terim):
 * · **lead** → "Aday". Brief "potansiyel müşteri" önerdi ama
 *   `admin-nav.ts`'nin `menu.growthLeads` anahtarı ZATEN "Adaylar" olarak
 *   yayında (Task 3) — TERİM HİZASI (`admin-product.ts`'in builder.ts'e
 *   karşı yaptığı çapraz kontrolün aynısı) bu dosyanın "Aday" seçmesini
 *   gerektiriyor; aksi halde aynı panelde nav "Adaylar" derken içerik
 *   "Potansiyel müşteriler" derdi. "Aday" tüm `lead` türevlerinde
 *   (newLead/updateLead/toast/LEAD_META) tutarlı kullanılır.
 * · **pipeline** → "Satış hattı". "Pipeline fields"/"Pipeline stage"/
 *   "grouped by pipeline stage" hepsi bu kalıpla çevrildi; "aşama akışı"
 *   varyantı İCAT EDİLMEDİ.
 *
 * TERİM HİZASI (devamı): `shortcuts.items`'ın beş etiketi
 * (`Acquisition`/`Leads`/`Pages & SEO`/`Media library`/`Legal content`)
 * `admin-nav.ts`'nin `menu.growthAcquisition/growthLeads/growthPagesSeo/
 * growthMediaLibrary/growthLegalContent` anahtarlarıyla EN'de bayt-bayt
 * aynı — TR karşılıkları da oradan BİREBİR alındı (Kazanım/Adaylar/
 * Sayfalar ve SEO/Medya kütüphanesi/Yasal içerik), ikinci bir TR varyant
 * yazılmadı. `shortcuts.card.title` ("Growth workbenches") ise
 * `admin-product.ts`'in `workbenches`→"çalışma alanları" seçimiyle aynı
 * kalıba uydu ("Büyüme çalışma alanları") — bu, "Workspaces"
 * (`shared.workspacesLabel`, aynı panelde organizasyon sayısı) ile aynı
 * TR kelimeyi paylaşan BİLİNEN bir çakışma; Task 6'da zaten var, Task 8
 * onu tekrarlamaktan başka bir şey yapmadı (rapor bunu açık bir madde
 * olarak işaretler).
 *
 * MODEL-VERİSİ, DOKUNULMADI (Task 6 `activationStages().stage.label`
 * emsalinin aynısı — paylaşılan model dosyası bu görevin dosya listesinde
 * DEĞİL): `growth-analytics-model.ts`'in ÜRETTİĞİ şu alanlar İngilizce
 * literal olarak KALIR ve sözlüğe girmez:
 * · (Revizyon, dalga-sonu cila — aşağıdaki madde artık GEÇERSİZ):
 *   `growthLifecycle()`'ın `stage.label`'ı ("Workspace"/"Member ready"/
 *   "Signature saved"/"Sender live"/"Export evidenced") artık `lang:
 *   Lang = 'en'` parametresine göre çözülüyor — etiketler KENDİ
 *   dosyasında yaşayan dil-anahtarlı bir tabloda (`notification-looks.ts`
 *   emsali, bu sözlüğe girmez); `stage.key` de artık çevrilen etiketten
 *   TÜRETİLMİYOR, sabit bir tanımlayıcı listesinden geliyor. `GrowthOverview
 *   View`/`AcquisitionView` gerçek `lang`i geçirir. EN varsayılan çıktı
 *   bayt-bayt korunur.
 * · `CONTENT_PAGE_REGISTRY`'nin `route`/`title`/`owner` alanları — brief
 *   bunu açıkça VERİ saydı (gerçek pazarlama sayfalarının kaydı).
 * · `MEDIA_ASSET_REGISTRY`'nin `label`/`purpose` alanları (ör. "Primary
 *   logo"/"Light surfaces") — aynı gerekçe: paylaşılan model dosyası,
 *   bu görevin sahipliğinde değil.
 * · `LEGAL_CONTENT_REGISTRY`'nin `label`/`support` alanları (ör. "Privacy
 *   policy") — aynı gerekçe. `LegalContentView`'in KENDİ "Control model"
 *   kartındaki dört madde (`controlCard.items`) bundan AYRI — o görünüm
 *   dosyasının kendi literalı, çevrildi.
 *
 * VERİ (registry/status kodu, sözlüğe girmez, `AdminStatusBadge`/ham
 * yazdırma emsali): `PagesSeoView`'da `row.owner` rozeti — brief'in VERİ
 * dediği kayıt sahibi alanı, dilden bağımsız basılır. `LeadActions.tsx`
 * içindeki `<option>` metinleri (`new`/`qualified`/`scheduled`/`won`/
 * `lost`) — ham durum KODU olarak kalır (admin-revenue `row.status`
 * emsali); `LEAD_META`'nın (bu dosyada) İNSAN-OKUR etiketi ayrı, `leads.
 * meta`'dan gelir.
 *
 * PAYLAŞILAN ANAHTARLAR (bayt-bayt aynı literal, tek anahtardan okunur —
 * admin-revenue `currencyControl`/`datum.amount` emsali): `shared.
 * previewBadge`/`shared.source` `PreviewBadge`/`GrowthSource` yardımcı
 * bileşenlerinden BÜTÜN altı görünüm tarafından okunur.
 * `shared.workspacesLabel` ("Workspaces") üç yerde bayt-bayt aynı: genel
 * bakışın KPI etiketi, aynı KPI'ın bar grafiği `seriesName`'i, kazanım
 * görünümünün donut `centerLabel`'i. `shared.notConnected` ("Not
 * connected") beş yerde aynı: kazanım görünümünün atıf hazırlığı
 * kartında iki, medya kütüphanesinin yayın hazırlığı kartında üç.
 * `shared.sourceLabel` ("Source") üç yerde: lead kartının kaynak
 * satırı, yeni-lead formunun Kaynak alanı, boş-durum "Pipeline fields"
 * listesindeki "Source" maddesi. `shared.nextStepFieldLabel` ("Next
 * step") üç yerde: iki lead diyaloğunun Sonraki adım alanı ve aynı boş-
 * durum listesindeki "Next step" maddesi — LeadCard'ın KENDİ "Next
 * action" etiketi (`leads.card.nextActionLabel`) FARKLI bir literal,
 * BİLEREK ayrı anahtar. `shared.pctValue` çıplak yüzde biçimlendirir
 * (`${n}%` / TR `%${n}` — admin-revenue `kpis.collectionRate.pct`
 * emsali, TR'de yüzde işareti sayının ÖNÜNE geçer); genel bakışın
 * Activated/Export evidenced KPI değerlerinde VE sayfa-SEO kapsam
 * kartının yüzdelerinde kullanılır. `common`/`adminCommon`dan gelen tek
 * kelimeler (Cancel/Reason/failedTryAgain/Live) burada yeniden
 * YAZILMAZ — InvoiceCreateDialog emsali.
 *
 * `LEAD_META` (`GrowthOperationsViews.tsx`) admin-product'ın
 * `TEMPLATE_LOOKS`/`templateMeta` ayrımıyla AYNI kalıpla ikiye bölündü:
 * dil-bağımsız `LEAD_LOOKS` (tone/icon/step) görünüm dosyasında kalır,
 * İNSAN-OKUR etiket bu sözlüğün `leads.meta`'sından gelir. `GrowthLeadStage`
 * KAPALI bir union olduğu için (templateMeta'nın aksine) çağrı yerinde
 * `Record<string, …>` cast'i GEREKMEDİ — `t.leads.meta[stage]` doğrudan
 * tip-güvenli.
 */

const en = {
  shared: {
    previewBadge: 'Preview data',
    source: {
      demonstrationTitle: 'Demonstration dataset',
      boundaryTitle: 'Source boundary',
      title: 'Source-backed growth snapshot',
      previewPrefix: 'This preview uses representative data. ',
    },
    workspacesLabel: 'Workspaces',
    notConnected: 'Not connected',
    sourceLabel: 'Source',
    nextStepFieldLabel: 'Next step',
    pctValue: (n: number) => `${n}%`,
  },
  shortcuts: {
    card: {
      title: 'Growth workbenches',
      support: 'Move directly from the portfolio signal into the relevant operating surface.',
    },
    items: {
      acquisition: { label: 'Acquisition', support: 'Durable lifecycle evidence' },
      leads: { label: 'Leads', support: 'CRM connection readiness' },
      pages: { label: 'Pages & SEO', support: 'Published route registry' },
      media: { label: 'Media library', support: 'Approved brand assets' },
      legal: { label: 'Legal content', support: 'Publication and evidence' },
    },
  },
  overview: {
    kpis: {
      workspaces: { support: (n: number) => `${n} created in 30 days` },
      activated: { label: 'Activated', support: (n: number) => `${n} with a live sender` },
      exportEvidenced: { label: 'Export evidenced', support: (n: number) => `${n} workspaces` },
      signals30d: { label: '30-day signals', support: 'Durable product events' },
    },
    creationCard: { title: 'Workspace creation', support: 'Monthly registrations from the organization record.' },
    signalCard: {
      title: 'Signal coverage',
      support: 'What this dashboard can prove today.',
      registrationState: 'Registration state',
      productMilestones: 'Product milestones',
      durableEvents: 'Durable events',
      loadedSource: 'Loaded source',
      alert: 'Traffic sessions, UTM attribution and referrers are not stored, so they are intentionally absent.',
    },
    lifecycleCard: {
      title: 'Lifecycle position',
      support: 'Current workspace depth across observable product milestones.',
      ofRegisteredPct: (n: number) => `${n}% of registered workspaces`,
    },
    momentumCard: {
      title: 'Workspace momentum',
      support: 'Milestone depth and recency, ranked without inventing session engagement.',
      milestonesOf4: (n: number) => `${n}/4 milestones`,
      noEvent: 'No event',
      sinceActivity: (n: number) => `${n}d since activity`,
    },
    source: 'Counts use organization creation, current membership/signature/sender state and bounded product activity. They do not infer visits, channels or campaign attribution.',
  },
  acquisition: {
    pathCard: {
      baseline: 'Registered baseline',
      stepRatePct: (n: number) => `${n}% from prior state`,
    },
    registrationCard: { title: 'Registration movement', support: 'New organization records by month.', seriesName: 'Registered' },
    stateMixCard: {
      title: 'Commercial state mix',
      support: 'Current entitlement state, not acquisition source.',
      donutLabels: ['Trial', 'Active', 'Past due', 'Cancelled'] as readonly string[],
    },
    gap: {
      title: 'Largest observable gap',
      loss: (n: number) => `${n} workspaces`,
      prefix: 'The largest durable-state loss occurs before ',
      suffix: '. This supports onboarding review, not paid-channel optimization.',
      fallbackLabel: 'the next milestone',
    },
    readiness: {
      title: 'Attribution readiness',
      support: 'Required sources for a true acquisition dashboard.',
      landingSessions: 'Landing sessions and referrers',
      utm: 'UTM and campaign identity',
      registrations: 'Workspace registrations',
      activation: 'Product activation evidence',
    },
    source: 'This view deliberately starts at workspace creation. Channel, campaign, session and referrer telemetry do not exist in the current production schema.',
  },
  leads: {
    meta: {
      new: 'New',
      qualified: 'Qualified',
      scheduled: 'Demo scheduled',
      won: 'Converted',
      lost: 'Lost',
    },
    potentialSeats: (n: number) => `${n} potential seats`,
    card: {
      priority: { high: 'High value', growth: 'Growth', standard: 'Standard' },
      footprintLabel: 'Potential footprint',
      seatsSuffix: 'seats',
      nextActionLabel: 'Next action',
    },
    empty: {
      title: 'No leads yet',
      body: 'Leads opened from this board will appear here, grouped by pipeline stage.',
    },
    fieldsCard: {
      title: 'Pipeline fields',
      support: 'What a lead record carries.',
      items: {
        companyContact: 'Company and contact',
        seatEstimate: 'Seat estimate',
        pipelineStage: 'Pipeline stage',
      },
    },
    source: {
      preview: 'The board demonstrates the intended CRM workflow and does not represent production leads.',
      live: 'Leads are a manually curated, writable register — there is no automatic CRM or tracking source. Stage, seats and next step change only through this board.',
    },
  },
  pagesSeo: {
    kpis: {
      registeredRoutes: { label: 'Registered routes', support: 'Source-owned public pages' },
      metadataTitles: { label: 'Metadata titles', support: 'Declared in route source' },
      marketingPages: { label: 'Marketing pages', support: 'Public product narrative' },
      legalPages: { label: 'Legal pages', support: 'Public policy content' },
    },
    registryCard: {
      title: 'Published route registry',
      support: 'Actual App Router pages and declared metadata.',
      searchPlaceholder: 'Search route or owner',
      headers: { route: 'Route', title: 'Page title', owner: 'Owner', index: 'Index' },
      legalContent: 'Legal content',
      marketingContent: 'Marketing content',
      indexable: 'Indexable',
      review: 'Review',
      openAria: (route: string) => `Open ${route}`,
    },
    coverageCard: {
      title: 'SEO source coverage',
      support: 'Checks that are provable from the current codebase.',
      routeTitleMetadata: 'Route title metadata',
      canonicalRegistry: 'Canonical registry',
      searchPerformanceFeed: 'Search performance feed',
      contentApprovalWorkflow: 'Content approval workflow',
    },
    source: 'This registry is source-backed. Search impressions, rankings, canonical validation and editorial approvals are not stored by the application and are not inferred.',
  },
  mediaLibrary: {
    registryCard: { title: 'Approved brand media', support: 'Static assets currently shipped by the Mailmyra application.' },
    boundaryCard: {
      title: 'Library boundary',
      body: 'This view inventories product-owned public brand files. Customer-uploaded logos, avatars and handwritten signatures remain customer data and are not surfaced as marketing media.',
      approvedFiles: 'Approved files',
      cmsUploads: 'CMS uploads',
    },
    readinessCard: {
      title: 'Publishing readiness',
      support: 'Controls required for a writable media desk.',
      publicBrandInventory: 'Public brand inventory',
      usageOwnership: 'Usage ownership',
      definedValue: 'Defined',
      editorialUpload: 'Editorial upload',
      approvalHistory: 'Approval history',
    },
    source: 'The application has no marketing-media CMS. The visible inventory is limited to approved public brand files and deliberately excludes customer CDN assets.',
  },
  legalContent: {
    kpis: {
      registeredDocuments: { label: 'Registered documents', support: 'Content and evidence types' },
      publishedRoutes: { label: 'Published routes', support: 'Publicly readable documents' },
      acceptanceTypes: { label: 'Acceptance types', support: 'Schema-level evidence types' },
      missingRoutes: { label: 'Missing routes', support: 'Requires content publication' },
    },
    registerCard: {
      title: 'Legal publication register',
      support: 'Public route status compared with acceptance evidence capability.',
      published: 'Published',
      routeMissing: 'Route missing',
      evidenceType: 'Evidence type',
      disclosureOnly: 'Disclosure only',
      openRoute: (route: string) => `Open ${route}`,
      noPublicRoute: 'No public route registered',
    },
    controlCard: {
      title: 'Control model',
      support: 'What exists and what remains outside the current schema.',
      items: {
        publicLegalRoutes: { label: 'Public legal routes', support: 'Source-controlled pages' },
        acceptanceEvidence: { label: 'Acceptance evidence', support: 'Document type, version, time and IP' },
        editorialRevisions: { label: 'Editorial revisions', support: 'No CMS version workflow' },
        approvalChain: { label: 'Approval chain', support: 'No reviewer/sign-off model' },
      },
    },
    source: 'Publication status comes from actual routes and document types from the application schema. Legal copy revisions and approvals are source-controlled, not managed by a CMS.',
  },
  leadActions: {
    fields: {
      company: 'Company',
      contact: 'Contact',
      sourcePlaceholder: 'e.g. referral, outbound, event',
      seats: 'Seats',
      stage: 'Stage',
    },
    newLead: {
      dialogTitle: 'New lead',
      subtitle: 'Opens a pipeline entry in the manually curated lead board.',
      createSubmit: 'Create lead',
      toast: 'Lead created.',
    },
    updateLead: {
      ariaLabel: (company: string) => `Update ${company}`,
      dialogTitle: (company: string) => `Update lead — ${company}`,
      labelledBy: (company: string) => `Update lead ${company}`,
      subtitle: 'Move the pipeline stage, adjust the seat estimate or record the next step.',
      noChanges: 'No changes.',
      saveSubmit: 'Save changes',
      toast: 'Lead updated.',
    },
  },
  /**
   * Task 12 — altı sayfanın (`growth/{overview,acquisition,leads,content/
   * pages,content/media,content/legal}/page.tsx`) `AdminPageHeader` prop'ları
   * + sekme başlıkları. `title` her altısında da `adminNav[lang].menu.
   * growthOverview/growthAcquisition/growthLeads/growthPagesSeo/
   * growthMediaLibrary/growthLegalContent` ile bayt-bayt AYNI — burada
   * tekrar yazılmaz, çağrı yeri doğrudan `adminNav`dan okur (crumb kökü
   * `adminNav[lang].menu.growth`). Yalnız `overview.crumbLeaf` ayrık: crumb
   * ibaresi "Overview" iken menü başlığı "Growth overview" — aynı metin
   * DEĞİL, ayrı anahtar.
   */
  pages: {
    overview: {
      crumbLeaf: 'Overview',
      support: 'Read registration, activation and product evidence without inventing traffic attribution.',
    },
    acquisition: {
      support: 'Follow the durable path from workspace creation to export evidence.',
    },
    leads: {
      support: 'Manually curated pipeline — no tracking source is connected.',
    },
    pagesSeo: {
      support: 'Review the source-owned public route and metadata registry.',
    },
    mediaLibrary: {
      support: 'Inventory approved public brand media without exposing customer assets.',
    },
    legalContent: {
      support: 'Compare published policy routes with acceptance evidence capability.',
    },
  },
} as const;

const tr: Mirror<typeof en> = {
  shared: {
    previewBadge: 'Önizleme verisi',
    source: {
      demonstrationTitle: 'Gösterim veri kümesi',
      boundaryTitle: 'Kaynak sınırı',
      title: 'Kaynağa dayalı büyüme görüntüsü',
      previewPrefix: 'Bu önizleme temsili veri kullanır. ',
    },
    workspacesLabel: 'Çalışma alanları',
    notConnected: 'Bağlı değil',
    sourceLabel: 'Kaynak',
    nextStepFieldLabel: 'Sonraki adım',
    pctValue: (n: number) => `%${n}`,
  },
  shortcuts: {
    card: {
      title: 'Büyüme çalışma alanları',
      support: 'Portföy sinyalinden doğrudan ilgili operasyon yüzeyine geç.',
    },
    items: {
      acquisition: { label: 'Kazanım', support: 'Kalıcı yaşam döngüsü kanıtı' },
      leads: { label: 'Adaylar', support: 'CRM bağlantı hazırlığı' },
      pages: { label: 'Sayfalar ve SEO', support: 'Yayınlanan rota kaydı' },
      media: { label: 'Medya kütüphanesi', support: 'Onaylı marka varlıkları' },
      legal: { label: 'Yasal içerik', support: 'Yayın ve kanıt' },
    },
  },
  overview: {
    kpis: {
      workspaces: { support: (n: number) => `Son 30 günde ${n} tanesi oluşturuldu` },
      activated: { label: 'Aktifleşmiş', support: (n: number) => `${n} tanesinde canlı gönderici var` },
      exportEvidenced: { label: 'Dışa aktarım kanıtlandı', support: (n: number) => `${n} çalışma alanı` },
      signals30d: { label: '30 günlük sinyaller', support: 'Kalıcı ürün etkinlikleri' },
    },
    creationCard: { title: 'Çalışma alanı oluşturma', support: 'Organizasyon kaydından aylık kayıtlar.' },
    signalCard: {
      title: 'Sinyal kapsamı',
      support: 'Bu panonun bugün kanıtlayabildikleri.',
      registrationState: 'Kayıt durumu',
      productMilestones: 'Ürün kilometre taşları',
      durableEvents: 'Kalıcı etkinlikler',
      loadedSource: 'Yüklü kaynak',
      alert: 'Trafik oturumları, UTM ilişkilendirmesi ve yönlendirenler saklanmaz, bu yüzden bilerek burada yer almaz.',
    },
    lifecycleCard: {
      title: 'Yaşam döngüsü konumu',
      support: 'Gözlemlenebilir ürün kilometre taşlarında güncel çalışma alanı derinliği.',
      ofRegisteredPct: (n: number) => `Kayıtlı çalışma alanlarının %${n} kadarı`,
    },
    momentumCard: {
      title: 'Çalışma alanı ivmesi',
      support: 'Oturum etkileşimi uydurmadan, kilometre taşı derinliği ve güncelliğe göre sıralanır.',
      milestonesOf4: (n: number) => `${n}/4 kilometre taşı`,
      noEvent: 'Etkinlik yok',
      sinceActivity: (n: number) => `${n} gün önce etkinlik`,
    },
    source: 'Sayımlar; organizasyon oluşturmayı, güncel üyelik/imza/gönderici durumunu ve sınırlı ürün etkinliğini kullanır. Ziyaret, kanal veya kampanya ilişkilendirmesi çıkarmaz.',
  },
  acquisition: {
    pathCard: {
      baseline: 'Kayıtlı başlangıç',
      stepRatePct: (n: number) => `önceki durumun %${n} kadarı`,
    },
    registrationCard: { title: 'Kayıt hareketi', support: 'Aya göre yeni organizasyon kayıtları.', seriesName: 'Kayıtlı' },
    stateMixCard: {
      title: 'Ticari durum dağılımı',
      support: 'Güncel tahsis durumu, kazanım kaynağı değil.',
      donutLabels: ['Deneme', 'Aktif', 'Vadesi geçmiş', 'İptal edildi'],
    },
    gap: {
      title: 'Gözlemlenebilir en büyük boşluk',
      loss: (n: number) => `${n} çalışma alanı`,
      prefix: 'En büyük kalıcı durum kaybı şu aşamadan önce oluşuyor: ',
      suffix: '. Bu, katılım (onboarding) incelemesini destekler; ücretli kanal optimizasyonunu değil.',
      fallbackLabel: 'sıradaki kilometre taşı',
    },
    readiness: {
      title: 'İlişkilendirme hazırlığı',
      support: 'Gerçek bir kazanım panosu için gereken kaynaklar.',
      landingSessions: 'İniş sayfası oturumları ve yönlendirenler',
      utm: 'UTM ve kampanya kimliği',
      registrations: 'Çalışma alanı kayıtları',
      activation: 'Ürün aktivasyon kanıtı',
    },
    source: 'Bu görünüm kasıtlı olarak çalışma alanı oluşturulmasından başlar. Kanal, kampanya, oturum ve yönlendiren telemetrisi güncel üretim şemasında bulunmaz.',
  },
  leads: {
    meta: {
      new: 'Yeni',
      qualified: 'Nitelikli',
      scheduled: 'Demo planlandı',
      won: 'Dönüştürüldü',
      lost: 'Kaybedildi',
    },
    potentialSeats: (n: number) => `${n} potansiyel koltuk`,
    card: {
      priority: { high: 'Yüksek değerli', growth: 'Büyüme', standard: 'Standart' },
      footprintLabel: 'Potansiyel kapasite',
      seatsSuffix: 'koltuk',
      nextActionLabel: 'Sıradaki eylem',
    },
    empty: {
      title: 'Henüz aday yok',
      body: 'Bu panodan açılan adaylar, satış hattı aşamasına göre gruplanmış şekilde burada görünür.',
    },
    fieldsCard: {
      title: 'Satış hattı alanları',
      support: 'Bir aday kaydının taşıdığı bilgiler.',
      items: {
        companyContact: 'Şirket ve irtibat kişisi',
        seatEstimate: 'Koltuk tahmini',
        pipelineStage: 'Satış hattı aşaması',
      },
    },
    source: {
      preview: 'Bu pano, amaçlanan CRM iş akışını gösterir ve üretim adaylarını temsil etmez.',
      live: 'Adaylar elle küratörlüğü yapılan, yazılabilir bir kayıttır — otomatik bir CRM veya izleme kaynağı yoktur. Aşama, koltuk ve sonraki adım yalnızca bu pano üzerinden değişir.',
    },
  },
  pagesSeo: {
    kpis: {
      registeredRoutes: { label: 'Kayıtlı rotalar', support: 'Kaynak kod sahipliğindeki genel sayfalar' },
      metadataTitles: { label: 'Meta veri başlıkları', support: 'Rota kaynağında tanımlı' },
      marketingPages: { label: 'Pazarlama sayfaları', support: 'Genel ürün anlatısı' },
      legalPages: { label: 'Yasal sayfalar', support: 'Genel politika içeriği' },
    },
    registryCard: {
      title: 'Yayınlanan rota kaydı',
      support: 'Gerçek App Router sayfaları ve tanımlı meta veriler.',
      searchPlaceholder: 'Rota veya sahip ara',
      headers: { route: 'Rota', title: 'Sayfa başlığı', owner: 'Sahip', index: 'Dizin' },
      legalContent: 'Yasal içerik',
      marketingContent: 'Pazarlama içeriği',
      indexable: 'Dizine eklenebilir',
      review: 'İncelenmeli',
      openAria: (route: string) => `${route} aç`,
    },
    coverageCard: {
      title: 'SEO kaynak kapsamı',
      support: 'Güncel kod tabanından kanıtlanabilir kontroller.',
      routeTitleMetadata: 'Rota başlığı meta verisi',
      canonicalRegistry: 'Canonical kaydı',
      searchPerformanceFeed: 'Arama performansı beslemesi',
      contentApprovalWorkflow: 'İçerik onay iş akışı',
    },
    source: 'Bu kayıt kaynağa dayalıdır. Arama gösterimleri, sıralamalar, canonical doğrulaması ve editoryal onaylar uygulama tarafından saklanmaz ve çıkarım yapılmaz.',
  },
  mediaLibrary: {
    registryCard: { title: 'Onaylı marka medyası', support: 'Mailmyra uygulamasının hâlihazırda dağıttığı statik varlıklar.' },
    boundaryCard: {
      title: 'Kütüphane sınırı',
      body: 'Bu görünüm, ürün sahipliğindeki genel marka dosyalarını envanterler. Müşterinin yüklediği logolar, avatarlar ve el imzaları müşteri verisi olarak kalır ve pazarlama medyası olarak gösterilmez.',
      approvedFiles: 'Onaylı dosyalar',
      cmsUploads: 'CMS yüklemeleri',
    },
    readinessCard: {
      title: 'Yayın hazırlığı',
      support: 'Yazılabilir bir medya masası için gereken kontroller.',
      publicBrandInventory: 'Genel marka envanteri',
      usageOwnership: 'Kullanım sahipliği',
      definedValue: 'Tanımlı',
      editorialUpload: 'Editoryal yükleme',
      approvalHistory: 'Onay geçmişi',
    },
    source: "Uygulamanın bir pazarlama medyası CMS'i yoktur. Görünen envanter, onaylı genel marka dosyalarıyla sınırlıdır ve müşteri CDN varlıklarını bilerek dışarıda bırakır.",
  },
  legalContent: {
    kpis: {
      registeredDocuments: { label: 'Kayıtlı belgeler', support: 'İçerik ve kanıt türleri' },
      publishedRoutes: { label: 'Yayınlanan rotalar', support: 'Herkese açık okunabilir belgeler' },
      acceptanceTypes: { label: 'Kabul türleri', support: 'Şema düzeyinde kanıt türleri' },
      missingRoutes: { label: 'Eksik rotalar', support: 'İçerik yayını gerektirir' },
    },
    registerCard: {
      title: 'Yasal yayın kaydı',
      support: 'Genel rota durumunun kabul kanıtı kapasitesiyle karşılaştırılması.',
      published: 'Yayınlandı',
      routeMissing: 'Rota eksik',
      evidenceType: 'Kanıt türü',
      disclosureOnly: 'Yalnız açıklama',
      openRoute: (route: string) => `${route} aç`,
      noPublicRoute: 'Kayıtlı genel rota yok',
    },
    controlCard: {
      title: 'Kontrol modeli',
      support: 'Nelerin var olduğu ve nelerin güncel şema dışında kaldığı.',
      items: {
        publicLegalRoutes: { label: 'Genel yasal rotalar', support: 'Kaynak kontrollü sayfalar' },
        acceptanceEvidence: { label: 'Kabul kanıtı', support: 'Belge türü, sürüm, zaman ve IP' },
        editorialRevisions: { label: 'Editoryal revizyonlar', support: 'CMS sürüm iş akışı yok' },
        approvalChain: { label: 'Onay zinciri', support: 'İnceleyici/onay modeli yok' },
      },
    },
    source: "Yayın durumu, gerçek rotalardan ve uygulama şemasındaki belge türlerinden gelir. Yasal metin revizyonları ve onayları kaynak kontrollüdür, bir CMS tarafından yönetilmez.",
  },
  leadActions: {
    fields: {
      company: 'Şirket',
      contact: 'İrtibat kişisi',
      sourcePlaceholder: 'ör. referans, outbound, etkinlik',
      seats: 'Koltuklar',
      stage: 'Aşama',
    },
    newLead: {
      dialogTitle: 'Yeni aday',
      subtitle: 'Elle yürütülen aday panosunda yeni bir satış hattı kaydı açar.',
      createSubmit: 'Aday oluştur',
      toast: 'Aday oluşturuldu.',
    },
    updateLead: {
      ariaLabel: (company: string) => `${company} güncelle`,
      dialogTitle: (company: string) => `Adayı güncelle — ${company}`,
      labelledBy: (company: string) => `Adayı güncelle ${company}`,
      subtitle: 'Satış hattı aşamasını taşı, koltuk tahminini güncelle veya sonraki adımı kaydet.',
      noChanges: 'Değişiklik yok.',
      saveSubmit: 'Değişiklikleri kaydet',
      toast: 'Aday güncellendi.',
    },
  },
  pages: {
    overview: {
      crumbLeaf: 'Özet',
      support: 'Trafik atfı uydurmadan kayıt, aktivasyon ve ürün kanıtını oku.',
    },
    acquisition: {
      support: 'Çalışma alanı oluşturmadan dışa aktarım kanıtına kadar kalıcı yolu takip et.',
    },
    leads: {
      support: 'Elle küratörlüğü yapılan hat — bağlı bir izleme kaynağı yok.',
    },
    pagesSeo: {
      support: 'Kaynağa ait genel rota ve meta veri kaydını incele.',
    },
    mediaLibrary: {
      support: 'Müşteri varlıklarını açığa çıkarmadan onaylı genel marka medyasını envanterle.',
    },
    legalContent: {
      support: 'Yayınlanan politika rotalarını kabul kanıtı yeteneğiyle karşılaştır.',
    },
  },
};

export const adminGrowth = { en, tr } as const;

export type AdminGrowthDict = Mirror<typeof en>;
