import type { Mirror } from '../types';

/**
 * Ürün sözlüğü (Task 6) — tek çağrı yeri: `ProductOperationsViews.tsx`
 * (altı görünüm: overview/activation/builderUsage/exports/templates/
 * cohorts + paylaşılan `TEMPLATE_META`/`eventMeta`/`EventStream`/
 * `PreviewBadge`/`ProductSource` parçaları).
 *
 * `templateMeta.name` — TERİM HİZASI kanıtı (`lib/i18n/dict/builder.ts`
 * `steps.style.template` ile karşılaştırıldı): classic-horizontal/
 * stacked-minimal/card-bordered EN adları bu dosyanın KENDİ özgün
 * literalleri olarak KALIR (builder'ın kısa 'Classic'/'Stacked'/'Card'
 * adlarıyla BİLEREK eşleşmez — builder form-seçici adı, bu panel geniş
 * bir analitik etiketi; brief bunu açıkça istisna tuttu). divider-columns/
 * photo-first/cta-banner ise EN'de zaten builder'ın
 * dividerColumnsName/photoFirstName/ctaBannerName ile BİREBİR aynı
 * ("Corporate divider"/"Photo first"/"CTA banner") — TR karşılıkları da
 * builder'dan BİREBİR alındı ("Kurumsal ayraçlı"/"Fotoğraf önde"/
 * "CTA bantlı"), ikinci bir TR varyant İCAT EDİLMEDİ. Bu üç şablonun
 * `copy` (blurb) alanı da EN'de builder'ın kendi blurb'üyle bayt-bayt
 * aynı olduğu için (karşılaştırıldı) TR çevirisi de builder'dan
 * alındı — tutarlılık için, zorunluluktan değil (brief yalnız `name`
 * hizasını şart koştu, `copy` "bu dosyanın kendi" metni sayılır).
 * classic/stacked/card'ın `copy` alanları builder'ınkinden FARKLI
 * cümleler — bu üçü tamamen bağımsız Mirror çevirisi.
 *
 * `templateMeta`/`eventMeta` dinamik string anahtarla (templateId / event
 * `type`, ikisi de model tarafında düz `string`) okunur — ama BURADA
 * (dict bildiriminde) `Record<string, …>` cast'i YOK: `en`in altı/dört
 * bilinen anahtarı literal kalır, `Mirror<T>` bu yüzden `tr`de AYNI
 * anahtar kümesini zorunlu kılar (fazla/eksik anahtar derlemede kırılır
 * — bekçi test değil derleyicidir kuralı burada da geçerli). Dinamik
 * cast SADECE çağrı yerinde yaşar (bkz. ProductOperationsViews.tsx
 * `templateDisplay`/`eventMeta` yardımcıları: `(t.templateMeta as
 * Record<string, …>)[id]`) — sözlük tablosunun kendisi hâlâ EN/TR
 * paritesiyle korunur, yalnız OKUMA tarafı geniş anahtarla esner. İkon/
 * ton (`TEMPLATE_LOOKS`, event ikon haritası) dil-bağımsız veri —
 * görünüm dosyasında yaşamaya devam eder, sözlüğe girmez.
 *
 * `activationStages()`'ın (`product-analytics-model.ts`) ürettiği
 * `stage.label` alanı BİLEREK dokunulmadı — Task 5'in `getCustomerHealth`
 * `signals`'ı için bıraktığı emsalin aynısı: paylaşılan model dosyası bu
 * görevin sahipliğinde değil, `stage.key` zaten stabil bir tanımlayıcı
 * ama etiketi yeniden yazmak ayrı bir süpürme kapsamı sayıldı. `tr`
 * modunda bu başlıklar (ör. "Workspace created") İngilizce kalır —
 * rapor bunu bilinen bir açık olarak işaretler.
 */

const en = {
  previewBadge: 'Preview data',
  source: {
    title: 'Source-backed product snapshot',
    demonstrationTitle: 'Demonstration dataset',
    previewPrefix: 'This preview uses representative data. ',
  },
  templateMeta: {
    'classic-horizontal': {
      name: 'Classic horizontal',
      copy: 'Photo-led corporate layout with a strong horizontal information rhythm.',
    },
    'stacked-minimal': {
      name: 'Stacked minimal',
      copy: 'Compact single-column structure designed for narrow inbox surfaces.',
    },
    'card-bordered': {
      name: 'Card bordered',
      copy: 'Framed identity system with a dedicated CTA and campaign-ready edge.',
    },
    'divider-columns': {
      name: 'Corporate divider',
      copy: 'Logo left, a strong brand rule, contact on the right.',
    },
    'photo-first': {
      name: 'Photo first',
      copy: 'A big round portrait leads — built for personal brands.',
    },
    'cta-banner': {
      name: 'CTA banner',
      copy: 'A full-width action bar closes the signature.',
    },
  },
  templateFallbackCopy: 'Saved signature layout.',
  eventMeta: {
    'sender.published': 'Sender published',
    'sender.deactivated': 'Sender deactivated',
    'export.zip': 'Export completed',
    'brand.saved': 'Brand rules saved',
  },
  eventStream: {
    emptyDefault: 'No product events in the loaded window.',
    detail: (files: number, senders: number) => ` · ${files} files / ${senders} senders`,
  },
  workbenches: {
    activation: { label: 'Activation', support: 'Find milestone drop-offs' },
    builder: { label: 'Builder usage', support: 'Inspect saved design state' },
    exports: { label: 'Exports', support: 'Review delivery evidence' },
    templates: { label: 'Templates', support: 'Compare layout adoption' },
    cohorts: { label: 'Cohorts', support: 'Track operational return' },
  },
  overview: {
    sourceBody:
      'Counts come from current organizations, signatures, sender publication state and recorded export/activity evidence. No session telemetry is inferred.',
    kpis: {
      savedSignatures: { label: 'Saved signatures', support: (n: number) => `${n} updated in 30 days` },
      activeSenders: { label: 'Active senders', support: (n: number) => `${n} activated workspaces` },
      exportCoverage: { label: 'Export coverage', support: (n: number) => `${n} evidenced exports` },
      returning: { label: '30-day return', support: 'Active orgs with recent activity' },
    },
    attention: {
      title: 'Adoption queue',
      support: 'Current-state gaps that deserve a closer look.',
      needFirstSignature: 'Need first signature',
      savedNotPublished: 'Saved, not published',
      liveNoExport: 'Live, no export evidence',
      caption: 'Observable workspace state',
      reviewButton: 'Review activation gaps',
    },
    workbenchesCard: {
      title: 'Product workbenches',
      support: 'Move from the portfolio signal directly into the operating view.',
    },
    funnelCard: {
      title: 'Activation path',
      support: 'Workspace-level progression through observable product states.',
      openFunnel: 'Open funnel',
      ratePct: (n: number) => `${n}% of workspaces`,
    },
    evidenceCard: {
      title: 'Product evidence',
      support: 'Bounded operational events by month.',
      seriesName: 'Events',
      legendPublish: 'Publish',
      legendExport: 'Export',
      legendBrand: 'Brand',
    },
    depthCard: {
      title: 'Workspace adoption depth',
      support: 'Three observable milestones: signature saved, sender live and export evidenced.',
      openCohorts: 'Open cohorts',
      activeSenders: (n: number) => `${n} active senders`,
      milestoneSignature: 'Signature',
      milestonePublish: 'Publish',
      milestoneExport: 'Export',
    },
  },
  activation: {
    sourceBody:
      'The funnel is reconstructed from durable workspace state. Login sessions and in-builder step views are not currently instrumented.',
    cohortBaseline: 'Cohort baseline',
    stepRateDropoff: (stepRate: number, loss: number) => `${stepRate}% from prior step · ${loss} drop-off`,
    biggestDrop: {
      title: 'Largest observable drop',
      value: (n: number) => `${n} workspaces`,
      before: 'Between the prior milestone and ',
      fallbackLabel: 'the next step',
      after: '. This is a state transition gap, not a session conversion rate.',
      recommendation: 'Recommended review: onboarding copy, empty states and the hand-off into this milestone.',
    },
    byWorkspace: {
      title: 'Activation by workspace',
      support: 'Current milestone completion; useful for onboarding follow-up.',
      milestones: (n: number) => `${n}/4 activation milestones`,
    },
  },
  builderUsage: {
    sourceBody:
      'This page reads saved configuration state and update timestamps. It does not claim builder sessions, time-on-step or click analytics.',
    kpis: {
      savedDesigns: { label: 'Saved designs', support: 'Current signature records' },
      assigned: { label: 'Assigned', support: (n: number) => `${n} connected to senders` },
      editedIn30d: { label: 'Edited in 30d', support: 'Based on updatedAt' },
      designVariants: { label: 'Design variants', support: 'Templates currently in use' },
    },
    features: {
      assignedToSender: 'Assigned to sender',
      logoIncluded: 'Logo included',
      avatarIncluded: 'Avatar included',
      ctaConfigured: 'CTA configured',
    },
    sizeCard: { title: 'Signature size', support: 'Current saved configuration.', centerLabel: 'Designs' },
    iconCard: { title: 'Icon treatment', support: 'Filled, outline and mono usage.', centerLabel: 'Designs' },
    featureCard: { title: 'Feature adoption', support: 'Presence in saved signature documents.' },
    recentCard: {
      title: 'Recently edited designs',
      support: 'Latest current-state builder records; content fields remain private.',
      templatePortfolio: 'Template portfolio',
      assignedBadge: 'Assigned',
      draftBadge: 'Draft',
    },
  },
  exports: {
    sourceBody:
      "Export totals use immutable export.zip activity plus each active sender's lastExportedAt field. Installation and delivery telemetry are outside the current schema.",
    kpis: {
      recordedExports: { label: 'Recorded exports', support: 'Within the loaded event window' },
      filesGenerated: { label: 'Files generated', support: 'Copied from export payloads' },
      activeCoverage: { label: 'Active coverage', support: (n: number) => `${n} active senders never exported` },
      staleExports: { label: 'Stale exports', support: 'Last export more than 90d ago' },
    },
    movementCard: { title: 'Export movement', support: 'Completed ZIP events by month.', seriesName: 'Exports' },
    coverageCard: {
      title: 'Coverage position',
      support: 'Active senders by export evidence.',
      labelExported: 'Exported',
      labelNeverExported: 'Never exported',
      labelStale: 'Stale >90d',
      centerLabel: 'Senders',
    },
    recentEvidenceCard: {
      title: 'Recent export evidence',
      support: 'Newest completed exports across customer workspaces.',
    },
    boundaryCard: {
      title: 'Delivery boundary',
      body: 'Mailmyra records that a ZIP was generated and which sender records were included. It does not currently observe installation inside Outlook, Gmail or Apple Mail.',
      thereforeWord: 'Therefore:',
      thereforeRest: ' export coverage is evidence of file creation, not inbox installation success.',
    },
  },
  templates: {
    sourceBody:
      'Template ranking is based on current saved signature records. It does not claim conversion, engagement or recipient performance.',
    currentAdoption: 'Current adoption',
    sharePct: (n: number) => `${n}% share`,
    assignedLabel: 'Assigned',
    editedLabel: 'Edited 30d',
    empty: { title: 'No saved templates yet', body: 'Template adoption will appear when signatures are saved.' },
    interpretation: {
      title: 'Portfolio interpretation',
      support: 'Current stock, not marketing conversion.',
      savedDesigns: {
        value: (n: number) => `${n} saved designs`,
        body: 'The denominator for every adoption share on this page.',
      },
      assigned: {
        value: (n: number) => `${n} assigned`,
        body: 'Designs connected to a sender identity in current state.',
      },
      recentlyEdited: {
        value: (n: number) => `${n} recently edited`,
        body: 'Updated during the latest rolling 30-day window.',
      },
    },
  },
  cohorts: {
    sourceBody:
      'Cohorts use organization creation month, current published-sender state and the latest recorded activity. Historical state changes before the activity window are not reconstructed.',
    kpis: {
      loadedCohorts: { label: 'Loaded cohorts', support: 'Monthly registration cohorts' },
      activatedOrgs: { label: 'Activated orgs', support: 'At least one live sender' },
      returning: { label: '30-day return', support: 'Activated orgs with recent activity' },
      eventWindow: { label: 'Event window', value: '12m', support: 'Bounded activity evidence' },
    },
    tableCard: {
      title: 'Cohort activation and return',
      support: 'Registration month compared with current activation and recent operational activity.',
      headers: { cohort: 'Cohort', workspaces: 'Workspaces', activated: 'Activated', returning: '30-day return', signal: 'Signal' },
    },
    retention: {
      title: 'Retention definition',
      activatedIntro: 'An organization is ',
      activatedWord: 'activated',
      activatedRest: ' when it has a currently published sender.',
      returnedIntro: ' It is ',
      returnedWord: 'returned',
      returnedRest: ' when its latest durable activity is within 30 days.',
      footnote:
        'This operational heuristic is appropriate for support and adoption review. It is not DAU/WAU, session retention or a recipient-engagement metric.',
    },
  },
} as const;

const tr: Mirror<typeof en> = {
  previewBadge: 'Önizleme verisi',
  source: {
    title: 'Kaynağa dayalı ürün görüntüsü',
    demonstrationTitle: 'Gösterim veri kümesi',
    previewPrefix: 'Bu önizleme temsili veri kullanır. ',
  },
  templateMeta: {
    'classic-horizontal': {
      name: 'Klasik yatay',
      copy: 'Fotoğraf öncülüğünde kurumsal yerleşim, güçlü bir yatay bilgi ritmiyle.',
    },
    'stacked-minimal': {
      name: 'Alt alta minimal',
      copy: 'Dar gelen kutusu yüzeyleri için tasarlanmış kompakt, tek sütunlu yapı.',
    },
    'card-bordered': {
      name: 'Çerçeveli kart',
      copy: 'Kendine özgü bir eylem çağrısı ve kampanyaya hazır kenarlığı olan çerçeveli kimlik sistemi.',
    },
    'divider-columns': {
      name: 'Kurumsal ayraçlı',
      copy: 'Logo solda, güçlü marka çizgisi, iletişim sağda.',
    },
    'photo-first': {
      name: 'Fotoğraf önde',
      copy: 'Büyük portre önde — kişisel marka için.',
    },
    'cta-banner': {
      name: 'CTA bantlı',
      copy: 'İmzayı tam genişlik eylem bandı kapatır.',
    },
  },
  templateFallbackCopy: 'Kayıtlı imza yerleşimi.',
  eventMeta: {
    'sender.published': 'Gönderici yayınlandı',
    'sender.deactivated': 'Gönderici devre dışı bırakıldı',
    'export.zip': 'Dışa aktarım tamamlandı',
    'brand.saved': 'Marka kuralları kaydedildi',
  },
  eventStream: {
    emptyDefault: 'Yüklenen pencerede ürün etkinliği yok.',
    detail: (files: number, senders: number) => ` · ${files} dosya / ${senders} gönderici`,
  },
  workbenches: {
    activation: { label: 'Aktivasyon', support: 'Kilometre taşı düşüşlerini bul' },
    builder: { label: 'Builder kullanımı', support: 'Kayıtlı tasarım durumunu incele' },
    exports: { label: 'Dışa aktarımlar', support: 'Teslimat kanıtını incele' },
    templates: { label: 'Şablonlar', support: 'Yerleşim benimsemesini karşılaştır' },
    cohorts: { label: 'Kohortlar', support: 'Operasyonel geri dönüşü takip et' },
  },
  overview: {
    sourceBody:
      'Sayılar; güncel organizasyonlardan, imzalardan, gönderici yayın durumundan ve kayıtlı dışa aktarım/etkinlik kanıtından gelir. Oturum telemetrisi çıkarılmaz.',
    kpis: {
      savedSignatures: { label: 'Kayıtlı imzalar', support: (n: number) => `Son 30 günde ${n} güncellendi` },
      activeSenders: { label: 'Aktif göndericiler', support: (n: number) => `${n} aktifleşmiş çalışma alanı` },
      exportCoverage: { label: 'Dışa aktarım kapsamı', support: (n: number) => `${n} kanıtlanmış dışa aktarım` },
      returning: { label: '30 günlük geri dönüş', support: 'Son etkinliği olan aktif organizasyonlar' },
    },
    attention: {
      title: 'Benimseme kuyruğu',
      support: 'Yakından bakılmayı hak eden güncel durum açıkları.',
      needFirstSignature: 'İlk imzayı bekliyor',
      savedNotPublished: 'Kaydedildi, yayınlanmadı',
      liveNoExport: 'Canlı, dışa aktarım kanıtı yok',
      caption: 'Gözlemlenebilir çalışma alanı durumu',
      reviewButton: 'Aktivasyon açıklarını incele',
    },
    workbenchesCard: {
      title: 'Ürün çalışma alanları',
      support: 'Portföy sinyalinden doğrudan operasyon görünümüne geç.',
    },
    funnelCard: {
      title: 'Aktivasyon yolu',
      support: 'Gözlemlenebilir ürün durumları boyunca çalışma alanı düzeyinde ilerleme.',
      openFunnel: 'Huniyi aç',
      ratePct: (n: number) => `Çalışma alanlarının %${n} kadarı`,
    },
    evidenceCard: {
      title: 'Ürün kanıtı',
      support: 'Aya göre sınırlandırılmış operasyonel etkinlikler.',
      seriesName: 'Etkinlikler',
      legendPublish: 'Yayın',
      legendExport: 'Dışa aktarım',
      legendBrand: 'Marka',
    },
    depthCard: {
      title: 'Çalışma alanı benimseme derinliği',
      support: 'Üç gözlemlenebilir kilometre taşı: imza kaydedildi, gönderici canlı ve dışa aktarım kanıtlandı.',
      openCohorts: 'Kohortları aç',
      activeSenders: (n: number) => `${n} aktif gönderici`,
      milestoneSignature: 'İmza',
      milestonePublish: 'Yayın',
      milestoneExport: 'Dışa aktarım',
    },
  },
  activation: {
    sourceBody:
      'Huni, kalıcı çalışma alanı durumundan yeniden oluşturulur. Giriş oturumları ve builder içi adım görüntülemeleri şu anda ölçümlenmiyor.',
    cohortBaseline: 'Kohort başlangıcı',
    stepRateDropoff: (stepRate: number, loss: number) => `Önceki adımdan %${stepRate} · ${loss} düşüş`,
    biggestDrop: {
      title: 'En büyük gözlemlenen düşüş',
      value: (n: number) => `${n} çalışma alanı`,
      before: 'Önceki kilometre taşı ile ',
      fallbackLabel: 'sonraki adım',
      after: ' arasında. Bu bir durum geçişi boşluğu, oturum dönüşüm oranı değil.',
      recommendation: 'Önerilen inceleme: onboarding metni, boş durumlar ve bu kilometre taşına geçiş.',
    },
    byWorkspace: {
      title: 'Çalışma alanına göre aktivasyon',
      support: 'Güncel kilometre taşı tamamlanması; onboarding takibi için yararlı.',
      milestones: (n: number) => `${n}/4 aktivasyon kilometre taşı`,
    },
  },
  builderUsage: {
    sourceBody:
      'Bu sayfa, kayıtlı yapılandırma durumunu ve güncelleme zaman damgalarını okur. Builder oturumları, adımda geçirilen süre veya tıklama analitiği iddia etmez.',
    kpis: {
      savedDesigns: { label: 'Kayıtlı tasarımlar', support: 'Güncel imza kayıtları' },
      assigned: { label: 'Atanmış', support: (n: number) => `${n} göndericiye bağlı` },
      editedIn30d: { label: '30 günde düzenlendi', support: 'updatedAt alanına dayanır' },
      designVariants: { label: 'Tasarım çeşitleri', support: 'Şu anda kullanılan şablonlar' },
    },
    features: {
      assignedToSender: 'Göndericiye atanmış',
      logoIncluded: 'Logo eklendi',
      avatarIncluded: 'Avatar eklendi',
      ctaConfigured: 'CTA yapılandırıldı',
    },
    sizeCard: { title: 'İmza boyutu', support: 'Güncel kayıtlı yapılandırma.', centerLabel: 'Tasarımlar' },
    iconCard: { title: 'İkon işlemesi', support: 'Dolu, çizgi ve tek renk kullanımı.', centerLabel: 'Tasarımlar' },
    featureCard: { title: 'Özellik benimsemesi', support: 'Kayıtlı imza belgelerindeki varlık.' },
    recentCard: {
      title: 'Son düzenlenen tasarımlar',
      support: 'En güncel builder kayıtları; içerik alanları gizli kalır.',
      templatePortfolio: 'Şablon portföyü',
      assignedBadge: 'Atanmış',
      draftBadge: 'Taslak',
    },
  },
  exports: {
    sourceBody:
      "Dışa aktarım toplamları, değişmez export.zip etkinliğini ve her aktif göndericinin lastExportedAt alanını kullanır. Kurulum ve teslimat telemetrisi mevcut şemanın dışındadır.",
    kpis: {
      recordedExports: { label: 'Kayıtlı dışa aktarımlar', support: 'Yüklenen etkinlik penceresi içinde' },
      filesGenerated: { label: 'Üretilen dosyalar', support: 'Dışa aktarım yüklerinden kopyalandı' },
      activeCoverage: { label: 'Aktif kapsam', support: (n: number) => `${n} aktif gönderici hiç dışa aktarmadı` },
      staleExports: { label: 'Bayatlamış dışa aktarımlar', support: '90 günden uzun süredir dışa aktarım yok' },
    },
    movementCard: { title: 'Dışa aktarım hareketi', support: 'Aya göre tamamlanan ZIP etkinlikleri.', seriesName: 'Dışa aktarımlar' },
    coverageCard: {
      title: 'Kapsam durumu',
      support: 'Dışa aktarım kanıtına göre aktif göndericiler.',
      labelExported: 'Dışa aktarıldı',
      labelNeverExported: 'Hiç dışa aktarılmadı',
      labelStale: '90 günden bayat',
      centerLabel: 'Göndericiler',
    },
    recentEvidenceCard: {
      title: 'Son dışa aktarım kanıtı',
      support: 'Müşteri çalışma alanları genelinde en yeni tamamlanan dışa aktarımlar.',
    },
    boundaryCard: {
      title: 'Teslimat sınırı',
      body: 'Mailmyra, bir ZIP üretildiğini ve hangi gönderici kayıtlarının dahil edildiğini kaydeder. Outlook, Gmail veya Apple Mail içindeki kurulumu şu anda gözlemlemez.',
      thereforeWord: 'Bu nedenle:',
      thereforeRest: ' dışa aktarım kapsamı dosya oluşturma kanıtıdır, gelen kutusu kurulum başarısı değildir.',
    },
  },
  templates: {
    sourceBody:
      'Şablon sıralaması güncel kayıtlı imza kayıtlarına dayanır. Dönüşüm, etkileşim veya alıcı performansı iddia etmez.',
    currentAdoption: 'Güncel benimseme',
    sharePct: (n: number) => `%${n} pay`,
    assignedLabel: 'Atanmış',
    editedLabel: '30 günde düzenlendi',
    empty: { title: 'Henüz kayıtlı şablon yok', body: 'İmzalar kaydedildiğinde şablon benimsemesi burada görünür.' },
    interpretation: {
      title: 'Portföy yorumu',
      support: 'Güncel stok, pazarlama dönüşümü değil.',
      savedDesigns: {
        value: (n: number) => `${n} kayıtlı tasarım`,
        body: 'Bu sayfadaki her benimseme payının paydası.',
      },
      assigned: {
        value: (n: number) => `${n} atanmış`,
        body: 'Güncel durumda bir gönderici kimliğine bağlı tasarımlar.',
      },
      recentlyEdited: {
        value: (n: number) => `${n} yakın zamanda düzenlendi`,
        body: 'Son 30 günlük hareketli pencerede güncellendi.',
      },
    },
  },
  cohorts: {
    sourceBody:
      'Kohortlar; organizasyon oluşturulma ayını, güncel yayınlanmış-gönderici durumunu ve en son kayıtlı etkinliği kullanır. Etkinlik penceresinden önceki geçmiş durum değişiklikleri yeniden oluşturulmaz.',
    kpis: {
      loadedCohorts: { label: 'Yüklenen kohortlar', support: 'Aylık kayıt kohortları' },
      activatedOrgs: { label: 'Aktifleşmiş organizasyonlar', support: 'En az bir canlı gönderici' },
      returning: { label: '30 günlük geri dönüş', support: 'Son etkinliği olan aktifleşmiş organizasyonlar' },
      eventWindow: { label: 'Etkinlik penceresi', value: '12 ay', support: 'Sınırlandırılmış etkinlik kanıtı' },
    },
    tableCard: {
      title: 'Kohort aktivasyonu ve geri dönüşü',
      support: 'Kayıt ayı, güncel aktivasyon ve son operasyonel etkinlikle karşılaştırılır.',
      headers: { cohort: 'Kohort', workspaces: 'Çalışma alanları', activated: 'Aktifleşmiş', returning: '30 günlük geri dönüş', signal: 'Sinyal' },
    },
    retention: {
      title: 'Elde tutma tanımı',
      activatedIntro: 'Bir organizasyon, güncel olarak yayınlanmış bir göndericisi varsa ',
      activatedWord: 'aktifleşmiş',
      activatedRest: ' sayılır.',
      returnedIntro: ' En son kalıcı etkinliği 30 gün içindeyse ',
      returnedWord: 'geri dönmüş',
      returnedRest: ' sayılır.',
      footnote:
        'Bu operasyonel sezgisel değer, destek ve benimseme incelemesi için uygundur. DAU/WAU, oturum elde tutma veya alıcı-etkileşim metriği değildir.',
    },
  },
};

export const adminProduct = { en, tr } as const;

/** Görünüm dosyasındaki yardımcı fonksiyonlar (`templateLook`, `eventMeta`) bu geniş tipi alır — bkz. builder.ts `BuilderDict` emsali. */
export type AdminProductDict = Mirror<typeof en>;
