import type { Mirror } from '../types';

/**
 * Platform sözlüğü (Task 9) — üç çağrı yeri: `PlatformOperationsViews.tsx`
 * (yedi görünüm: systemHealth/mail/exportPipeline/jobs/errors/releases/flags
 * + paylaşılan `PreviewBadge`/`PlatformSource`/`EmptyTelemetry` parçaları),
 * `ErrorActions.tsx` (hata grubu durum diyaloğu) ve `ScheduleActions.tsx`
 * (yeni rapor zamanlaması diyaloğu + duraklat/sürdür satır eylemi — rapor
 * KROMU burada, Task 11 yalnız `ReportingOperationsViews.tsx`'e bakacak).
 *
 * `SERVICE_LOOKS`/`MAIL_LOOKS`/`JOB_LOOKS`/`RELEASE_LOOKS`/`FLAG_LOOKS`
 * (`PlatformOperationsViews.tsx`) admin-product'ın `TEMPLATE_LOOKS`/
 * `templateMeta` ayrımıyla AYNI kalıpla ikiye bölündü: dil-bağımsız ton/
 * ikon görünüm dosyasında kalır, İNSAN-OKUR etiket bu sözlüğün `serviceMeta`/
 * `mailMeta`/`jobMeta`/`releaseMeta`/`flagMeta`'sından gelir. Beş durum tipi
 * de (`ServiceState`/`MailDeliveryRow['state']`/…) KAPALI union olduğu için
 * `Record<string, …>` cast'i hiçbirinde GEREKMEDİ — doğrudan tip-güvenli
 * indeksleme. `ERROR_META` (yalnız ton/ikon, hiç etiket TAŞIMIYOR — brief'in
 * "carry labels" koşulu ona uygulanmıyor) BÖLÜNMEDİ, görünüm dosyasında
 * dil-bağımsız veri olarak KALDI (admin-support `PRIORITY_TONE`/
 * `CATEGORY_ICON` emsali). Hata grubu `row.severity`/`row.state`, iş
 * `row.state.replace('_', ' ')`, dışa aktarım `row.state.replace('_', ' ')`
 * gibi HAM durum kodu yazdırmaları KvkkActions/RevenueOperationsViews'teki
 * YERLEŞİK kalıbın (ham kod, alt çizgi boşlukla değiştirilir, çevrilmez)
 * devamı — bilerek dokunulmadı.
 *
 * VERİ, sözlüğe girmez (`platform-operations-model.ts`'in ÜRETTİĞİ alanlar
 * — paylaşılan model dosyası bu görevin dosya listesinde DEĞİL, admin-growth
 * `growthLifecycle().stage.label` emsali): `JobRow.name`/`.queue`,
 * `ReleaseRow.owner`/`.commit`/`.checks[].label`, `FeatureFlagRow.label`/
 * `.description`/`.owner`/`.key`, `MailDeliveryRow.kind`/`.provider`/
 * `.recipientDomain`, `PlatformServiceRow.name`/`.group`. Bunların hepsi
 * fixture/örnek verisidir, İngilizce literal olarak KALIR.
 *
 * "Not connected" (`shared.notConnected`) tek yerde geçer (Operating pulse
 * kartının "Latest production release" satırı) ama admin-growth'un aynı
 * anahtarıyla PATERN tutarlılığı için `shared` altına kondu, ileride başka
 * bir platform görünümü aynı boş-durum yer tutucusunu paylaşabilir.
 *
 * Glossary: delivery→teslim (`mail.*`, `scheduleActions.subtitle`daki
 * "delivery schedule"), job→iş (`jobs.*`), queue→kuyruk ("queue identity"
 * `jobs.empty.body`de), owner→sahip (`releases.card.ownerLabel`,
 * `errorActions`/`scheduleActions`ta AYRICA yok — bu iki dosyada "owner"
 * kelimesi geçmiyor), release→dağıtım (`releases.*`), flag→bayrak
 * (`flags.*`). "Owner · {row.owner}" gibi etiket+veri ikilileri admin-
 * support `queueView.customerMessage` emsali: ayraç (" · ") JSX'te KALIR,
 * sözlük yalnız etiket kelimesini taşır.
 */

const en = {
  shared: {
    previewBadge: 'Preview data',
    source: {
      demonstrationTitle: 'Demonstration telemetry',
      boundaryTitle: 'Platform source boundary',
      previewPrefix: 'This preview uses representative platform telemetry. ',
    },
    notConnected: 'Not connected',
  },
  serviceMeta: {
    operational: 'Operational',
    degraded: 'Degraded',
    outage: 'Outage',
    unknown: 'No probe',
  },
  mailMeta: {
    delivered: 'Delivered',
    deferred: 'Deferred',
    bounced: 'Bounced',
    failed: 'Failed',
  },
  jobMeta: {
    queued: 'Queued',
    running: 'Running',
    complete: 'Complete',
    failed: 'Failed',
    retrying: 'Retrying',
  },
  releaseMeta: {
    deployed: 'Deployed',
    rolling_out: 'Rolling out',
    rolled_back: 'Rolled back',
    planned: 'Planned',
  },
  flagMeta: {
    on: 'On',
    testing: 'Testing',
    off: 'Off',
  },
  systemHealth: {
    kpis: {
      monitoredServices: { label: 'Monitored services', supportActive: 'Active service probes', supportDisconnected: 'Probe source not connected' },
      operational: { label: 'Operational', support: 'Passing current checks' },
      needsAttention: { label: 'Needs attention', support: 'Degraded or unavailable' },
      averageLatency: { label: 'Average latency', support: 'Across current probes' },
    },
    serviceMap: {
      title: 'Service map',
      support: 'Current status, latency and thirty-day availability.',
      latency: 'Latency',
      uptime30d: '30d uptime',
      msValue: (n: number) => `${n} ms`,
      pctValue: (n: number) => `${n}%`,
    },
    pulse: {
      title: 'Operating pulse',
      support: 'A compact control-room view.',
      incidentActive: 'Incident active',
      partialDegradation: 'Partial degradation',
      allNominal: 'All systems nominal',
      caption: 'Latest probe cycle completed less than three minutes ago.',
      activeSenders: 'Active senders',
      recordedEvents: 'Recorded product events',
      latestRelease: 'Latest production release',
    },
    empty: {
      title: 'No infrastructure probes are connected',
      body: 'The application can report durable product records, but it cannot claim uptime, latency or dependency health without an external probe source.',
    },
    source:
      'Health claims require timestamped service probes. Product records are shown separately and are not treated as uptime evidence.',
  },
  mail: {
    kpis: {
      observed: { label: 'Messages observed', support: 'Loaded delivery window' },
      deliveryRate: { label: 'Delivery rate', support: 'Provider-confirmed delivery' },
      deferred: { label: 'Deferred', support: 'Awaiting another attempt' },
      failedBounced: { label: 'Failed / bounced', support: 'Needs delivery review' },
    },
    mix: { title: 'Delivery mix', support: 'Outcome distribution in the loaded window.', centerLabel: 'Messages' },
    degradedAlert: 'Transactional mail is partially degraded.',
    stream: {
      title: 'Delivery stream',
      support: 'Operational metadata only; message bodies are never displayed.',
      allOutcomes: 'All outcomes',
    },
    table: { headers: { message: 'Message', purpose: 'Purpose', domain: 'Domain', attempts: 'Attempts', outcome: 'Outcome' } },
    empty: {
      title: 'No mail delivery ledger is connected',
      body: 'SMTP send calls exist, but provider responses, attempts, bounces and delivery outcomes are not persisted in an authoritative operational store.',
    },
    source:
      'A production mail workbench needs provider message IDs, purpose, attempt history and delivery webhooks. Recipient addresses and message bodies should remain outside this view.',
  },
  exportPipeline: {
    kpis: {
      runs: { label: 'Pipeline runs', support: 'Loaded telemetry window' },
      completed: { label: 'Completed', support: (n: number) => `${n} files generated` },
      runningFailed: { label: 'Running / failed', support: 'Current worker state' },
      durableEvidence: { label: 'Durable evidence', support: (n: number) => `${n} files in activity events` },
    },
    stages: {
      title: 'Export assembly line',
      support: 'The stages every signature output must clear.',
      validate: { label: 'Validate', support: 'Entitlement and sender state' },
      assets: { label: 'Assets', support: 'Fetch approved image URLs' },
      render: { label: 'Render', support: 'Generate Outlook-safe HTML' },
      pkg: { label: 'Package', support: 'Create rich copy or .htm/.zip' },
    },
    recent: { title: 'Recent pipeline runs', support: 'Worker telemetry joined to workspace identity.' },
    table: {
      headers: { workspace: 'Workspace', format: 'Format', files: 'Files', duration: 'Duration', started: 'Started', status: 'Status' },
      inProgress: 'In progress',
      durationSeconds: (s: string) => `${s}s`,
    },
    empty: {
      title: 'Worker telemetry is not connected',
      body: (n: number) => `The application does retain ${n} durable export events, but stage timings, failures and retries are not persisted.`,
    },
    source:
      'ActivityEvent export.zip is durable completion evidence. Pipeline stages, timings and failures require a separate append-only worker telemetry source.',
  },
  jobs: {
    kpis: {
      observed: { label: 'Observed jobs', support: 'Loaded scheduler window' },
      active: { label: 'Active', support: 'Queued, running or retrying' },
      failed: { label: 'Failed', support: 'Reached terminal failure' },
      retries: { label: 'Retries', support: 'More than one attempt' },
    },
    lanes: { active: 'Active work', queued: 'Scheduled next', finished: 'Recently finished' },
    card: {
      attempts: (n: number) => (n === 1 ? `${n} attempt` : `${n} attempts`),
      waiting: 'Waiting',
      durationMs: (n: number) => `${n} ms`,
    },
    emptyLane: 'No jobs in this lane',
    empty: {
      title: 'No job runtime is connected',
      body: 'Scheduled cleanup and delivery work currently has no shared queue ledger with state, attempts, duration and terminal outcome.',
    },
    source:
      'A job console needs immutable attempts, queue identity, lease/heartbeat state and terminal outcome. It must not infer jobs from user-facing activity events.',
  },
  errors: {
    kpis: {
      groups: { label: 'Error groups', support: 'Deduplicated fingerprints' },
      open: { label: 'Open', support: 'Needs triage or resolution' },
      critical: { label: 'Critical', support: 'Immediate attention' },
      events: { label: 'Events', support: 'Across loaded groups' },
    },
    detailFacts: { events: 'Events', affectedOrgs: 'Affected orgs', firstSeen: 'First seen', lastSeen: 'Last seen' },
    privacyBoundary: {
      title: 'Privacy boundary',
      body: 'Stack traces must be scrubbed before storage. Customer signature fields and recipient addresses never belong in this surface.',
    },
    list: {
      title: 'Error groups',
      support: 'Grouped by stable fingerprint.',
      itemSupport: (events: number, orgs: number) => `${events} events · ${orgs} orgs`,
    },
    empty: {
      title: 'No open error groups',
      body: 'Nothing has reported a server-side failure in the loaded window. New groups appear automatically the next time a request fails.',
    },
    source:
      'Error groups are deduplicated by fingerprint and scrubbed before storage; staff triage and resolve them here. Stack traces and customer signature content never appear in this surface.',
  },
  releases: {
    kpis: {
      records: { label: 'Release records', support: 'Loaded deployment history' },
      production: { label: 'Production deploys', support: 'Completed releases' },
      planned: { label: 'Planned / active', support: 'Upcoming delivery' },
      rollbacks: { label: 'Rollbacks', support: 'Recorded reversals' },
    },
    card: { ownerLabel: 'Owner', checksOf: (passed: number, total: number) => `${passed}/${total} checks` },
    gate: {
      title: 'Production gate',
      support: 'Controls required before a release can move forward.',
      score: (passed: number, total: number) => `${passed}/${total}`,
      latestChecksPassed: 'latest checks passed',
      controls: [
        'Versioned deployment record',
        'Automated test evidence',
        'Database migration state',
        'Post-deploy smoke check',
        'Rollback reference',
      ] as readonly string[],
    },
    empty: {
      title: 'No release registry is connected',
      body: 'The application does not persist deployment version, commit, environment, checks or rollback references. Source control history alone is not an operational release ledger.',
    },
    source:
      'A release record must bind version, commit, environment, checks, actor and rollback evidence. Repository commits are not silently promoted into deployment claims.',
  },
  flags: {
    kpis: {
      registered: { label: 'Registered flags', support: 'Loaded control registry' },
      enabled: { label: 'Enabled', support: 'Fully active flags' },
      testing: { label: 'Testing', support: 'Partial or staged rollout' },
      productionScope: { label: 'Production scope', support: 'Flags touching production' },
    },
    rolloutLabel: 'Production rollout',
    updatedPrefix: 'Updated',
    stateAria: (label: string) => `${label} state`,
    highImpact: {
      title: 'High-impact control surface',
      body: 'Production changes require confirmation, reason, second-person approval and immutable AdminAction evidence. Preview controls below are local-only.',
    },
    empty: {
      title: 'No feature flag registry is connected',
      body: 'Runtime behavior is currently source-controlled. A writable flag service must add environment targeting, rollout rules, approvals and immutable change history.',
    },
    source: 'Feature controls are not application settings. Production writes require explicit ownership, environment scope, approvals, reason and audit evidence.',
  },
  errorActions: {
    changeStatus: 'Change status',
    onlyReachable: 'Only the statuses reachable from the current one are offered.',
    targetStatusLabel: 'Target status',
    title: (title: string) => `Change status — ${title}`,
    labelledBy: (title: string) => `Change status ${title}`,
    toast: (state: string) => `Status moved to ${state}.`,
  },
  scheduleActions: {
    newSchedule: 'New schedule',
    dialogTitle: 'New schedule',
    subtitle: "Opens a delivery schedule — the daily runner picks it up on its next planned run.",
    reportLabel: 'Report',
    cadenceLabel: 'Cadence',
    cadenceOptions: { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' },
    formatLabel: 'Format',
    formatOptions: { digest: 'Email digest', csv: 'CSV', csvDisabled: 'CSV (no table output)' },
    recipientsLabel: 'Recipients',
    recipientsHelp: 'One email per line — 1 to 10 recipients.',
    submit: 'Create schedule',
    toast: 'Schedule created.',
    resume: 'Resume',
    pause: 'Pause',
    resumeTitle: (name: string) => `Resume — ${name}`,
    pauseTitle: (name: string) => `Pause — ${name}`,
    resumeLabelledBy: (name: string) => `Resume ${name}`,
    pauseLabelledBy: (name: string) => `Pause ${name}`,
    resumeSubtitle: 'The schedule becomes eligible for its next planned run.',
    pauseSubtitle: 'The schedule stops running until it is resumed.',
    resumeToast: 'Schedule resumed.',
    pauseToast: 'Schedule paused.',
  },
} as const;

const tr: Mirror<typeof en> = {
  shared: {
    previewBadge: 'Önizleme verisi',
    source: {
      demonstrationTitle: 'Gösterim telemetrisi',
      boundaryTitle: 'Platform kaynak sınırı',
      previewPrefix: 'Bu önizleme temsili platform telemetrisi kullanır. ',
    },
    notConnected: 'Bağlı değil',
  },
  serviceMeta: {
    operational: 'Çalışıyor',
    degraded: 'Düşük performans',
    outage: 'Kesinti',
    unknown: 'Sonda yok',
  },
  mailMeta: {
    delivered: 'Teslim edildi',
    deferred: 'Ertelendi',
    bounced: 'Geri döndü',
    failed: 'Başarısız',
  },
  jobMeta: {
    queued: 'Kuyrukta',
    running: 'Çalışıyor',
    complete: 'Tamamlandı',
    failed: 'Başarısız',
    retrying: 'Yeniden deneniyor',
  },
  releaseMeta: {
    deployed: 'Dağıtıldı',
    rolling_out: 'Dağıtılıyor',
    rolled_back: 'Geri alındı',
    planned: 'Planlandı',
  },
  flagMeta: {
    on: 'Açık',
    testing: 'Test',
    off: 'Kapalı',
  },
  systemHealth: {
    kpis: {
      monitoredServices: { label: 'İzlenen servisler', supportActive: 'Aktif servis sondaları', supportDisconnected: 'Sonda kaynağı bağlı değil' },
      operational: { label: 'Çalışıyor', support: 'Güncel kontrolleri geçiyor' },
      needsAttention: { label: 'Dikkat gerekiyor', support: 'Düşük performanslı veya kullanılamaz' },
      averageLatency: { label: 'Ortalama gecikme', support: 'Güncel sondalar genelinde' },
    },
    serviceMap: {
      title: 'Servis haritası',
      support: 'Güncel durum, gecikme ve otuz günlük kullanılabilirlik.',
      latency: 'Gecikme',
      uptime30d: '30 günlük çalışma süresi',
      msValue: (n: number) => `${n} ms`,
      pctValue: (n: number) => `%${n}`,
    },
    pulse: {
      title: 'Operasyon nabzı',
      support: 'Kompakt bir kontrol odası görünümü.',
      incidentActive: 'Olay devam ediyor',
      partialDegradation: 'Kısmi performans düşüşü',
      allNominal: 'Tüm sistemler normal',
      caption: 'En son sonda döngüsü üç dakikadan kısa süre önce tamamlandı.',
      activeSenders: 'Aktif göndericiler',
      recordedEvents: 'Kayıtlı ürün etkinlikleri',
      latestRelease: 'Son üretim dağıtımı',
    },
    empty: {
      title: 'Bağlı bir altyapı sondası yok',
      body: 'Uygulama kalıcı ürün kayıtlarını bildirebilir, ancak harici bir sonda kaynağı olmadan çalışma süresi, gecikme veya bağımlılık sağlığı iddia edemez.',
    },
    source:
      'Sağlık iddiaları zaman damgalı servis sondaları gerektirir. Ürün kayıtları ayrı gösterilir ve çalışma süresi kanıtı sayılmaz.',
  },
  mail: {
    kpis: {
      observed: { label: 'Gözlemlenen mesajlar', support: 'Yüklü teslim penceresi' },
      deliveryRate: { label: 'Teslim oranı', support: 'Sağlayıcı onaylı teslim' },
      deferred: { label: 'Ertelendi', support: 'Başka bir deneme bekleniyor' },
      failedBounced: { label: 'Başarısız / geri döndü', support: 'Teslim incelemesi gerekiyor' },
    },
    mix: { title: 'Teslim dağılımı', support: 'Yüklü penceredeki sonuç dağılımı.', centerLabel: 'Mesajlar' },
    degradedAlert: 'İşlemsel e-posta kısmen düşük performansta.',
    stream: {
      title: 'Teslim akışı',
      support: 'Yalnız operasyonel meta veri; mesaj gövdeleri asla gösterilmez.',
      allOutcomes: 'Tüm sonuçlar',
    },
    table: { headers: { message: 'Mesaj', purpose: 'Amaç', domain: 'Alan adı', attempts: 'Deneme', outcome: 'Sonuç' } },
    empty: {
      title: 'Bağlı bir e-posta teslim defteri yok',
      body: 'SMTP gönderim çağrıları var, ancak sağlayıcı yanıtları, denemeler, geri dönüşler ve teslim sonuçları yetkili bir operasyonel depoda saklanmıyor.',
    },
    source:
      'Üretim düzeyinde bir e-posta çalışma masası sağlayıcı mesaj kimlikleri, amaç, deneme geçmişi ve teslim webhook\'ları gerektirir. Alıcı adresleri ve mesaj gövdeleri bu görünümün dışında kalmalı.',
  },
  exportPipeline: {
    kpis: {
      runs: { label: 'Hat çalışmaları', support: 'Yüklü telemetri penceresi' },
      completed: { label: 'Tamamlandı', support: (n: number) => `${n} dosya üretildi` },
      runningFailed: { label: 'Çalışıyor / başarısız', support: 'Güncel işçi durumu' },
      durableEvidence: { label: 'Kalıcı kanıt', support: (n: number) => `${n} dosya etkinlik kayıtlarında` },
    },
    stages: {
      title: 'Dışa aktarım hattı',
      support: 'Her imza çıktısının geçmesi gereken aşamalar.',
      validate: { label: 'Doğrula', support: 'Tahsis ve gönderici durumu' },
      assets: { label: 'Varlıklar', support: 'Onaylı görsel URL\'lerini getir' },
      render: { label: 'Render', support: 'Outlook-güvenli HTML üret' },
      pkg: { label: 'Paketle', support: 'Zengin kopya veya .htm/.zip oluştur' },
    },
    recent: { title: 'Son hat çalışmaları', support: 'İşçi telemetrisi çalışma alanı kimliğiyle birleştirildi.' },
    table: {
      headers: { workspace: 'Çalışma alanı', format: 'Biçim', files: 'Dosyalar', duration: 'Süre', started: 'Başladı', status: 'Durum' },
      inProgress: 'Devam ediyor',
      durationSeconds: (s: string) => `${s} sn`,
    },
    empty: {
      title: 'İşçi telemetrisi bağlı değil',
      body: (n: number) => `Uygulama ${n} kalıcı dışa aktarım etkinliğini saklıyor, ancak aşama süreleri, hatalar ve yeniden denemeler kalıcı değil.`,
    },
    source:
      'ActivityEvent export.zip kalıcı tamamlanma kanıtıdır. Hat aşamaları, süreler ve hatalar ayrı, yalnız-ekleme bir işçi telemetri kaynağı gerektirir.',
  },
  jobs: {
    kpis: {
      observed: { label: 'Gözlemlenen işler', support: 'Yüklü zamanlayıcı penceresi' },
      active: { label: 'Aktif', support: 'Kuyrukta, çalışıyor veya yeniden deneniyor' },
      failed: { label: 'Başarısız', support: 'Kalıcı başarısızlığa ulaştı' },
      retries: { label: 'Yeniden denemeler', support: 'Birden fazla deneme' },
    },
    lanes: { active: 'Aktif iş', queued: 'Sıradaki zamanlanan', finished: 'Son tamamlanan' },
    card: {
      attempts: (n: number) => `${n} deneme`,
      waiting: 'Bekliyor',
      durationMs: (n: number) => `${n} ms`,
    },
    emptyLane: 'Bu şeritte iş yok',
    empty: {
      title: 'Bağlı bir iş çalışma zamanı yok',
      body: 'Zamanlanmış temizlik ve teslim işinin şu anda durum, deneme, süre ve kalıcı sonuç taşıyan paylaşılan bir kuyruk defteri yok.',
    },
    source:
      'Bir iş konsolu değişmez denemeler, kuyruk kimliği, lease/heartbeat durumu ve kalıcı sonuç gerektirir. İşleri kullanıcıya dönük etkinlik kayıtlarından çıkarmamalı.',
  },
  errors: {
    kpis: {
      groups: { label: 'Hata grupları', support: 'Tekilleştirilmiş parmak izleri' },
      open: { label: 'Açık', support: 'Triyaj veya çözüm gerekiyor' },
      critical: { label: 'Kritik', support: 'Acil dikkat gerekiyor' },
      events: { label: 'Etkinlikler', support: 'Yüklü gruplar genelinde' },
    },
    detailFacts: { events: 'Etkinlikler', affectedOrgs: 'Etkilenen organizasyonlar', firstSeen: 'İlk görülme', lastSeen: 'Son görülme' },
    privacyBoundary: {
      title: 'Gizlilik sınırı',
      body: 'Yığın izleri saklanmadan önce temizlenmelidir. Müşteri imza alanları ve alıcı adresleri bu yüzeye asla girmez.',
    },
    list: {
      title: 'Hata grupları',
      support: 'Sabit parmak izine göre gruplanır.',
      itemSupport: (events: number, orgs: number) => `${events} etkinlik · ${orgs} organizasyon`,
    },
    empty: {
      title: 'Açık hata grubu yok',
      body: 'Yüklü pencerede hiçbir şey sunucu tarafı hata bildirmedi. Bir sonraki istek başarısız olduğunda yeni gruplar otomatik olarak görünür.',
    },
    source:
      'Hata grupları parmak izine göre tekilleştirilir ve saklanmadan önce temizlenir; personel onları burada triyaj edip çözer. Yığın izleri ve müşteri imza içeriği bu yüzeyde asla görünmez.',
  },
  releases: {
    kpis: {
      records: { label: 'Dağıtım kayıtları', support: 'Yüklü dağıtım geçmişi' },
      production: { label: 'Üretim dağıtımları', support: 'Tamamlanan dağıtımlar' },
      planned: { label: 'Planlı / aktif', support: 'Yaklaşan teslim' },
      rollbacks: { label: 'Geri almalar', support: 'Kaydedilen geri dönüşler' },
    },
    card: { ownerLabel: 'Sahip', checksOf: (passed: number, total: number) => `${passed}/${total} kontrol` },
    gate: {
      title: 'Üretim geçidi',
      support: 'Bir dağıtımın ilerleyebilmesi için gereken kontroller.',
      score: (passed: number, total: number) => `${passed}/${total}`,
      latestChecksPassed: 'son kontrol geçti',
      controls: [
        'Sürümlenmiş dağıtım kaydı',
        'Otomatik test kanıtı',
        'Veritabanı geçiş durumu',
        'Dağıtım sonrası duman testi',
        'Geri alma referansı',
      ],
    },
    empty: {
      title: 'Bağlı bir dağıtım kaydı yok',
      body: 'Uygulama dağıtım sürümünü, commit\'i, ortamı, kontrolleri veya geri alma referanslarını saklamıyor. Yalnız kaynak kontrolü geçmişi operasyonel bir dağıtım defteri sayılmaz.',
    },
    source:
      'Bir dağıtım kaydı sürüm, commit, ortam, kontroller, eylemi yapan ve geri alma kanıtını birbirine bağlamalıdır. Depo commit\'leri sessizce dağıtım iddiasına yükseltilmez.',
  },
  flags: {
    kpis: {
      registered: { label: 'Kayıtlı bayraklar', support: 'Yüklü kontrol kaydı' },
      enabled: { label: 'Etkin', support: 'Tam etkin bayraklar' },
      testing: { label: 'Test', support: 'Kısmi veya aşamalı yayılım' },
      productionScope: { label: 'Üretim kapsamı', support: 'Üretime dokunan bayraklar' },
    },
    rolloutLabel: 'Üretim yayılımı',
    updatedPrefix: 'Güncellendi',
    stateAria: (label: string) => `${label} durumu`,
    highImpact: {
      title: 'Yüksek etkili kontrol yüzeyi',
      body: 'Üretim değişiklikleri onay, sebep, ikinci kişi onayı ve değişmez AdminAction kanıtı gerektirir. Aşağıdaki önizleme kontrolleri yalnız yereldir.',
    },
    empty: {
      title: 'Bağlı bir özellik bayrağı kaydı yok',
      body: 'Çalışma zamanı davranışı şu anda kaynak kontrollüdür. Yazılabilir bir bayrak servisi ortam hedefleme, yayılım kuralları, onaylar ve değişmez değişiklik geçmişi eklemelidir.',
    },
    source: 'Özellik kontrolleri uygulama ayarı değildir. Üretim yazmaları açık sahiplik, ortam kapsamı, onaylar, sebep ve denetim kanıtı gerektirir.',
  },
  errorActions: {
    changeStatus: 'Durumu değiştir',
    onlyReachable: 'Yalnız güncel durumdan ulaşılabilen durumlar sunulur.',
    targetStatusLabel: 'Hedef durum',
    title: (title: string) => `Durumu değiştir — ${title}`,
    labelledBy: (title: string) => `${title} durumunu değiştir`,
    toast: (state: string) => `Durum ${state} olarak değişti.`,
  },
  scheduleActions: {
    newSchedule: 'Yeni zamanlama',
    dialogTitle: 'Yeni zamanlama',
    subtitle: 'Bir teslim zamanlaması açar — günlük çalıştırıcı bunu sıradaki planlı çalışmasında alır.',
    reportLabel: 'Rapor',
    cadenceLabel: 'Sıklık',
    cadenceOptions: { daily: 'Günlük', weekly: 'Haftalık', monthly: 'Aylık' },
    formatLabel: 'Biçim',
    formatOptions: { digest: 'E-posta özeti', csv: 'CSV', csvDisabled: 'CSV (tablo çıktısı yok)' },
    recipientsLabel: 'Alıcılar',
    recipientsHelp: 'Satır başına bir e-posta — 1 ile 10 alıcı arası.',
    submit: 'Zamanlama oluştur',
    toast: 'Zamanlama oluşturuldu.',
    resume: 'Sürdür',
    pause: 'Duraklat',
    resumeTitle: (name: string) => `Sürdür — ${name}`,
    pauseTitle: (name: string) => `Duraklat — ${name}`,
    resumeLabelledBy: (name: string) => `${name} sürdür`,
    pauseLabelledBy: (name: string) => `${name} duraklat`,
    resumeSubtitle: 'Zamanlama sıradaki planlı çalışması için uygun hale gelir.',
    pauseSubtitle: 'Zamanlama, sürdürülene kadar çalışmayı durdurur.',
    resumeToast: 'Zamanlama sürdürüldü.',
    pauseToast: 'Zamanlama duraklatıldı.',
  },
};

export const adminPlatform = { en, tr } as const;

export type AdminPlatformDict = Mirror<typeof en>;
