import type { Mirror } from '../types';

/**
 * Destek sözlüğü (Task 9) — iki çağrı yeri: `SupportOperationsViews.tsx`
 * (dört görünüm: queue/cases/onboarding/playbooks + paylaşılan
 * `PreviewBadge`/`SupportSource`/`SupportSlaCard`/`SupportThread`/
 * `SupportConnectionEmpty` parçaları) ve `SupportActions.tsx` (durum/sahip/
 * öncelik diyalogları + `NewSupportCaseButton`).
 *
 * ⚠️ STAFF DİLİ, MÜŞTERİ DİLİ DEĞİL: `statusMeta` bu panelin KENDİ iç
 * terimidir — müşteri tarafındaki `app/(app)/app/support/support-labels.ts`
 * (`CASE_STATUS_LOOKS`) ile KASITLI olarak FARKLI kelimeler taşır.
 * `waiting_customer` müşteriye "Awaiting your reply"/"Cevabınız bekleniyor"
 * derken (müşteriye ne yapması gerektiğini söyler), burada personele
 * "Waiting customer"/"Müşteri bekleniyor" der (vakanın kimde olduğunu
 * söyler — iç operasyon dili). `escalated` de aynı şekilde: müşteriye
 * "In progress"/"İşlemde" (eskalasyon mutfağı gizlenir), burada personele
 * açıkça "Escalated"/"Yükseltildi". `open`/`resolved` iki tarafta da aynı
 * kelimeye çıkar (bu tesadüfi — ikisi de doğru çevirinin doğal sonucu,
 * BİREBİR paylaşılan bir anahtardan DEĞİL, bu dosyanın kendi `statusMeta`
 * girdisinden gelir).
 *
 * `STATUS_LOOKS` (`SupportOperationsViews.tsx`) admin-product'ın
 * `TEMPLATE_LOOKS`/`templateMeta` ayrımıyla AYNI kalıpla ikiye bölündü:
 * dil-bağımsız ton/ikon görünüm dosyasında kalır, İNSAN-OKUR etiket bu
 * sözlüğün `statusMeta`'sından gelir. `SupportCaseStatus` KAPALI bir union
 * olduğu için `Record<string, …>` cast'i GEREKMEDİ (admin-growth
 * `LEAD_META`/`GrowthLeadStage` emsali) — `t.statusMeta[status]` doğrudan
 * tip-güvenli. `PRIORITY_TONE`/`CATEGORY_ICON` ise hiç etiket TAŞIMIYOR
 * (yalnız ton/ikon) — brief'in "carry labels" koşulu onlara uygulanmıyor,
 * ikisi de görünüm dosyasında dil-bağımsız veri olarak KALDI, sözlüğe
 * girmedi. Ham öncelik/kategori DEĞERLERİ (`row.priority`/`selected.
 * category`, küçük harf: urgent/high/normal/low, billing/builder/…)
 * admin-revenue `row.status` emsali gibi VERİ olarak basılır — yalnız
 * bu değerlerin İNSAN-OKUR ALAN ETİKETLERİ ("Priority"/"Category") ve
 * `SupportActions.tsx`'teki elle yazılmış `<option>` metinleri
 * (Urgent/High/…, Billing/Builder/…) gerçek UI kopyası olduğu için
 * çevrildi — ikinci grup `LeadActions.tsx`'in ham `{value}` seçenek
 * deseninden FARKLI: orada seçenek metni değişkenin kendisiydi (kod),
 * burada elle yazılmış sabit metin (kopya). `StatusDialog`/`ErrorActions`
 * eşdeğerindeki `{target.replace('_', ' ')}` seçenek metni ise KvkkActions/
 * RevenueOperationsViews'teki YERLEŞİK kod tabanı kalıbının aynısı (ham
 * durum kodu, alt çizgi boşlukla değiştirilir) — bilerek çevrilmedi.
 *
 * `fields.*` küçük bir paylaşılan etiket tablosu ("Customer"/"Category"/
 * "Owner"/"Subject"/"Status"/"Priority"/"SLA due"): hem `SupportOperations
 * Views.tsx`'in vaka bağlamı/detay listelerinde HEM `SupportActions.tsx`'in
 * form alanlarında bayt-bayt aynı İngilizce kaynağa sahip olduğu için TEK
 * anahtardan okunur — admin-revenue `invoiceWorkbench.datum` emsali.
 * "Unassigned" kelimesi burada YOK — `adminCommon.unassigned`den okunur
 * (hem KPI etiketi hem sahipsiz-vaka yer tutucusu).
 *
 * `milestones` (Workspace/Identity/Design/Publish/Export) hem katılım
 * masası göstergesinde (büyük harfli liste) HEM kilometre taşı kapsamı
 * ızgarasında (öncesi `text-capitalize` ile küçük harfli ham aşama
 * anahtarını basıyordu) kullanılır — artık İKİSİ de bu tek diziden okur;
 * aşama ANAHTARI (`'workspace' | 'identity' | …`, `row.stageIndex`
 * karşılaştırması için) görünüm dosyasında ham kalır, yalnız GÖSTERİLEN
 * metin dizindeki bu insan-okur karşılığa döner.
 *
 * `SUPPORT_PLAYBOOKS`/`onboardingRows`/`slaState`'in (`support-operations-
 * model.ts`) ÜRETTİĞİ alanlar BİLEREK dokunulmadı (admin-growth
 * `growthLifecycle().stage.label` emsali — paylaşılan model dosyası bu
 * görevin dosya listesinde DEĞİL): `playbook.title/trigger/outcome/steps/
 * category`, `onboardingRows()`'un `ownerSignal`/`nextStep` alanları ve
 * `slaState()`'in ürettiği `sla.label` (ör. "4h remaining") İngilizce
 * literal olarak KALIR. Görünüm dosyasının KENDİ `formatSlaTime()`
 * yardımcısı ise (inbox listesindeki "Xh overdue"/"Xh left", `sla.label`
 * ile AYNI kavram ama ayrı, yerel üretilen metin) bu görevin sahipliğinde
 * — `queueView.slaTime` altında dil-anahtarlı hale getirildi.
 *
 * REVİZYON (dalga-sonu cila fix, `operations-model.ts`teki
 * `HEALTH_SIGNAL_LABELS` kalıbı): yukarıdaki paragraf artık KISMEN bayat —
 * `slaState()`'in `sla.label`'ı ve `onboardingRows()`'un `ownerSignal`/
 * `nextStep`'i `support-operations-model.ts`nin KENDİ `Record<Lang, …>`
 * tablolarından artık dile göre çeviriyor (bu dosyaya DOKUNMADAN; buradaki
 * `queueView.slaTime` ile bilerek AYNI TR kelimeler kullanıldı — "saat
 * gecikti"/"saat kaldı"). `SUPPORT_PLAYBOOKS` içeriği KASITLI olarak
 * İngilizce KALDI — küratörlü personel süreç metni, `support-operations-
 * model.ts`'in kendi dosya başı yorumuna bakın.
 */

const en = {
  shared: {
    previewBadge: 'Preview data',
    source: {
      demonstrationTitle: 'Demonstration dataset',
      boundaryTitle: 'Source boundary',
      previewPrefix: 'This preview uses representative support records. ',
    },
  },
  statusMeta: {
    open: 'Open',
    waiting_customer: 'Waiting customer',
    escalated: 'Escalated',
    resolved: 'Resolved',
  },
  fields: {
    customer: 'Customer',
    category: 'Category',
    owner: 'Owner',
    lastUpdate: 'Last update',
    subject: 'Subject',
    status: 'Status',
    priority: 'Priority',
    slaDue: 'SLA due',
  },
  milestones: ['Workspace', 'Identity', 'Design', 'Publish', 'Export'] as readonly string[],
  queueView: {
    kpis: {
      activeQueue: { label: 'Active queue', support: 'Unresolved support records' },
      slaBreached: { label: 'SLA breached', support: 'Immediate response required' },
      dueWithin4h: { label: 'Due within 4h', support: 'Approaching response target' },
      unassignedSupport: 'Needs an accountable owner',
    },
    inbox: {
      title: 'Priority inbox',
      support: 'SLA first, then urgency and last activity.',
      searchPlaceholder: 'Search customer or subject',
    },
    slaTime: {
      overdue: (h: number) => `${h}h overdue`,
      left: (h: number) => `${h}h left`,
    },
    customerMessage: 'Customer message',
    caseContext: {
      title: 'Case context',
      support: 'Operational metadata only; customer signature content is never shown here.',
    },
    slaCard: {
      responseTarget: 'Response target',
      priorityPrefix: 'Priority:',
    },
    empty: {
      title: 'No open support cases',
      body: 'Every case has been resolved, or none have been opened yet.',
    },
    source: {
      previewBody: 'The inbox demonstrates the intended SLA workflow and is not production customer activity.',
      liveBody:
        'Support cases are a persisted, writable register. An empty queue means every case has been resolved, not that the source is missing.',
    },
  },
  thread: {
    loading: 'Loading replies…',
    loadError: 'Could not load replies — try again.',
    empty: 'No replies yet.',
    replyLabel: 'Reply',
    replyPlaceholder: 'Write a reply…',
    send: 'Send',
    emptyBodyError: 'Write a reply before sending.',
    sendError: 'Could not send — try again.',
  },
  casesView: {
    kpis: {
      allCases: { label: 'All cases', support: 'Loaded support portfolio' },
      openAttention: { label: 'Open attention', support: 'Unresolved records' },
      resolvedSupportPct: (pct: number) => `${pct}% resolution share`,
      waitingSupport: 'Paused for a customer response',
    },
    portfolio: {
      title: 'Case portfolio',
      support: 'Scan ownership, current state and SLA without opening every record.',
      searchPlaceholder: 'Reference, customer or subject',
      allStatuses: 'All statuses',
    },
    actionsAria: (reference: string) => `Actions for ${reference}`,
    detail: {
      previewSubtitle: 'Preview-only case detail.',
      subtitle: 'Case detail.',
      closePreview: 'Close preview',
    },
    empty: {
      title: 'No support cases yet',
      body: 'Cases created from the support queue will appear here.',
    },
    source: {
      previewBody: 'The case portfolio is representative UI data and is not connected to customers.',
      liveBody:
        'Support cases are a persisted, writable register; requester emails are personal data: every view of this register is access-logged, and they never enter audit payloads or reports.',
    },
  },
  onboardingView: {
    kpis: {
      workspaces: { label: 'Workspaces', support: 'Current onboarding portfolio' },
      averageProgress: { label: 'Average progress', support: 'Five durable milestones' },
      needsAssistance: { label: 'Needs assistance', support: 'First export not evidenced' },
      completed: { label: 'Completed', support: 'Export evidence recorded' },
    },
    desk: {
      title: 'Assisted launch desk',
      body: 'Prioritize workspaces by the next observable product milestone. Progress is derived from records, not session behavior.',
      stalled: (n: number) => `${n} stalled`,
      stalledNote: 'Older than 14 days and below publish readiness.',
    },
    coverage: {
      title: 'Milestone coverage',
      support: 'Current portfolio depth across the first-value journey.',
      coveragePct: (n: number) => `${n}% coverage`,
    },
    board: {
      title: 'Workspace launch board',
      support: 'Next best action for every incomplete onboarding path.',
      dayLabel: (n: number) => `day ${n}`,
      nextMilestone: 'Next milestone',
    },
    source: {
      title: 'Source-backed onboarding',
      body: 'Progress uses workspace, membership, signature, active-sender and export-evidence records. It does not infer installation success or user engagement.',
    },
  },
  playbooksView: {
    kpis: {
      published: { label: 'Published playbooks', support: 'Source-controlled procedures' },
      coverageAreas: { label: 'Coverage areas' },
      customerDataEdits: { label: 'Customer-data edits', support: 'Read-only support boundary' },
      approvalWorkflow: { label: 'Approval workflow', value: 'Source', support: 'No writable CMS connected' },
    },
    index: {
      badge: 'Support operating system',
      headline1: 'Resolve consistently.',
      headline2: 'Escalate with evidence.',
      body: 'Playbooks define the safest next action without giving staff unrestricted access to customer content.',
    },
    card: {
      trigger: 'Trigger',
      outcome: 'Expected outcome',
    },
    source: {
      title: 'Source-controlled guidance',
      body: 'These procedures are static operational guidance. A future writable playbook CMS must add versions, reviewers, approvals and publication history before staff can edit them here.',
    },
  },
  actions: {
    buttons: {
      changeStatus: 'Change status',
      assignOwner: 'Assign owner',
      setPriority: 'Set priority',
    },
    targetStatusLabel: 'Target status',
    onlyReachable: 'Only the statuses reachable from the current one are offered.',
    statusDialog: {
      title: (ref: string) => `Change status — ${ref}`,
      labelledBy: (ref: string) => `Change status ${ref}`,
      toast: (status: string) => `Status moved to ${status}.`,
    },
    ownerDialog: {
      title: (ref: string) => `Assign owner — ${ref}`,
      labelledBy: (ref: string) => `Assign owner ${ref}`,
      subtitle: 'The owner must already be a staff account.',
      ownerEmailLabel: 'Owner email',
      toast: 'Owner assigned.',
    },
    priorityDialog: {
      title: (ref: string) => `Set priority — ${ref}`,
      labelledBy: (ref: string) => `Set priority ${ref}`,
      subtitle: "SLA due date is recalculated from the case's creation time.",
      toast: (priority: string) => `Priority set to ${priority}.`,
    },
    priorityOptions: {
      urgent: 'Urgent',
      high: 'High',
      normal: 'Normal',
      low: 'Low',
    },
    newCase: {
      button: 'New case',
      dialogTitle: 'New support case',
      subtitle: 'Opens a durable support case record with its own SLA clock.',
      referenceLabel: 'Reference',
      requesterEmailLabel: 'Requester email',
      subjectLabel: 'Subject',
      channelLabel: 'Channel',
      channelOptions: { email: 'Email', form: 'Form', staff: 'Staff' },
      categoryOptions: { billing: 'Billing', builder: 'Builder', export: 'Export', access: 'Access', account: 'Account' },
      orgIdLabel: 'Org id',
      orgIdHelp: 'Org id — leave blank if the requester is not tied to a customer.',
      summaryLabel: 'Summary',
      submit: 'Create case',
      toast: 'Support case created.',
    },
  },
  /**
   * Task 12 — dört sayfanın (`support/{cases,queue,onboarding,playbooks}/
   * page.tsx`) `AdminPageHeader` prop'ları + sekme başlıkları. `title` alanı
   * her dördünde de `adminNav[lang].menu.supportCases/supportQueue/
   * supportOnboarding/supportPlaybooks` ile bayt-bayt AYNI olduğu için
   * burada TEKRAR yazılmaz — çağrı yeri doğrudan `adminNav`dan okur, crumb
   * kökü de aynı şekilde `adminNav[lang].menu.support`dan gelir. Yalnız
   * `queue.crumbLeaf` ayrık: crumb'daki kısa "Queue" ibaresi, menüdeki
   * "Support queue" ile aynı METİN değil (nav header'da tam ad, crumb'da
   * kısaltma) — bu yüzden ayrı anahtar.
   */
  pages: {
    cases: {
      support: 'Durable support portfolio. Opening this register is logged.',
    },
    queue: {
      crumbLeaf: 'Queue',
      support: 'Inbound customer work by SLA, ownership and state. Opening this register is logged.',
    },
    onboarding: {
      support: 'Guide workspaces toward first export using observable product milestones.',
    },
    playbooks: {
      support: 'Use consistent, auditable procedures for recurring support work.',
    },
  },
} as const;

const tr: Mirror<typeof en> = {
  shared: {
    previewBadge: 'Önizleme verisi',
    source: {
      demonstrationTitle: 'Gösterim veri kümesi',
      boundaryTitle: 'Kaynak sınırı',
      previewPrefix: 'Bu önizleme temsili destek kayıtları kullanır. ',
    },
  },
  statusMeta: {
    open: 'Açık',
    waiting_customer: 'Müşteri bekleniyor',
    escalated: 'Yükseltildi',
    resolved: 'Çözüldü',
  },
  fields: {
    customer: 'Müşteri',
    category: 'Kategori',
    owner: 'Sahip',
    lastUpdate: 'Son güncelleme',
    subject: 'Konu',
    status: 'Durum',
    priority: 'Öncelik',
    slaDue: 'SLA vadesi',
  },
  milestones: ['Çalışma alanı', 'Kimlik', 'Tasarım', 'Yayın', 'Dışa aktarım'],
  queueView: {
    kpis: {
      activeQueue: { label: 'Aktif kuyruk', support: 'Çözülmemiş destek kayıtları' },
      slaBreached: { label: 'SLA aşıldı', support: 'Acil yanıt gerekiyor' },
      dueWithin4h: { label: '4 saat içinde vadesi dolan', support: 'Yaklaşan yanıt hedefi' },
      unassignedSupport: 'Hesap verebilir bir sahip gerekiyor',
    },
    inbox: {
      title: 'Öncelik gelen kutusu',
      support: 'Önce SLA, sonra aciliyet ve son etkinlik.',
      searchPlaceholder: 'Müşteri veya konu ara',
    },
    slaTime: {
      overdue: (h: number) => `${h} saat gecikti`,
      left: (h: number) => `${h} saat kaldı`,
    },
    customerMessage: 'Müşteri mesajı',
    caseContext: {
      title: 'Vaka bağlamı',
      support: 'Yalnız operasyonel meta veri; müşteri imza içeriği burada asla gösterilmez.',
    },
    slaCard: {
      responseTarget: 'Yanıt hedefi',
      priorityPrefix: 'Öncelik:',
    },
    empty: {
      title: 'Açık destek vakası yok',
      body: 'Ya her vaka çözüldü ya da henüz hiç vaka açılmadı.',
    },
    source: {
      previewBody: 'Gelen kutusu, amaçlanan SLA iş akışını gösterir ve üretim müşteri etkinliği değildir.',
      liveBody:
        'Destek vakaları kalıcı, yazılabilir bir kayıttır. Boş bir kuyruk her vakanın çözüldüğü anlamına gelir, kaynağın eksik olduğu anlamına gelmez.',
    },
  },
  thread: {
    loading: 'Yanıtlar yükleniyor…',
    loadError: 'Yanıtlar yüklenemedi — tekrar dene.',
    empty: 'Henüz yanıt yok.',
    replyLabel: 'Yanıt',
    replyPlaceholder: 'Bir yanıt yaz…',
    send: 'Gönder',
    emptyBodyError: 'Göndermeden önce bir yanıt yaz.',
    sendError: 'Gönderilemedi — tekrar dene.',
  },
  casesView: {
    kpis: {
      allCases: { label: 'Tüm vakalar', support: 'Yüklü destek portföyü' },
      openAttention: { label: 'Açık dikkat', support: 'Çözülmemiş kayıtlar' },
      resolvedSupportPct: (pct: number) => `%${pct} çözüm payı`,
      waitingSupport: 'Müşteri yanıtı için beklemede',
    },
    portfolio: {
      title: 'Vaka portföyü',
      support: 'Her kaydı tek tek açmadan sahiplik, güncel durum ve SLA\'yı tara.',
      searchPlaceholder: 'Referans, müşteri veya konu',
      allStatuses: 'Tüm durumlar',
    },
    actionsAria: (reference: string) => `${reference} için eylemler`,
    detail: {
      previewSubtitle: 'Yalnız önizleme vaka detayı.',
      subtitle: 'Vaka detayı.',
      closePreview: 'Önizlemeyi kapat',
    },
    empty: {
      title: 'Henüz destek vakası yok',
      body: 'Destek kuyruğundan açılan vakalar burada görünür.',
    },
    source: {
      previewBody: 'Vaka portföyü temsili arayüz verisidir ve müşterilere bağlı değildir.',
      liveBody:
        'Destek vakaları kalıcı, yazılabilir bir kayıttır; talep sahibi e-postaları kişisel veridir: bu kaydın her görüntülenmesi erişim günlüğüne kaydedilir ve bu e-postalar asla denetim yüklerine veya raporlara girmez.',
    },
  },
  onboardingView: {
    kpis: {
      workspaces: { label: 'Çalışma alanları', support: 'Güncel katılım portföyü' },
      averageProgress: { label: 'Ortalama ilerleme', support: 'Beş kalıcı kilometre taşı' },
      needsAssistance: { label: 'Yardım gerekiyor', support: 'İlk dışa aktarım kanıtlanmadı' },
      completed: { label: 'Tamamlandı', support: 'Dışa aktarım kanıtı kaydedildi' },
    },
    desk: {
      title: 'Destekli başlangıç masası',
      body: 'Çalışma alanlarını bir sonraki gözlemlenebilir ürün kilometre taşına göre önceliklendir. İlerleme kayıtlardan türetilir, oturum davranışından değil.',
      stalled: (n: number) => `${n} durakladı`,
      stalledNote: '14 günden eski ve yayın hazırlığının altında.',
    },
    coverage: {
      title: 'Kilometre taşı kapsamı',
      support: 'İlk değer yolculuğu boyunca güncel portföy derinliği.',
      coveragePct: (n: number) => `%${n} kapsam`,
    },
    board: {
      title: 'Çalışma alanı başlangıç panosu',
      support: 'Tamamlanmamış her katılım yolu için sıradaki en iyi eylem.',
      dayLabel: (n: number) => `${n}. gün`,
      nextMilestone: 'Sıradaki kilometre taşı',
    },
    source: {
      title: 'Kaynağa dayalı katılım',
      body: 'İlerleme; çalışma alanı, üyelik, imza, aktif gönderici ve dışa aktarım kanıtı kayıtlarını kullanır. Kurulum başarısı veya kullanıcı etkileşimi çıkarmaz.',
    },
  },
  playbooksView: {
    kpis: {
      published: { label: 'Yayınlanan playbook\'lar', support: 'Kaynak kontrollü prosedürler' },
      coverageAreas: { label: 'Kapsam alanları' },
      customerDataEdits: { label: 'Müşteri verisi düzenlemesi', support: 'Salt okunur destek sınırı' },
      approvalWorkflow: { label: 'Onay iş akışı', value: 'Kaynak', support: 'Yazılabilir CMS bağlı değil' },
    },
    index: {
      badge: 'Destek işletim sistemi',
      headline1: 'Tutarlı çöz.',
      headline2: 'Kanıtla yükselt.',
      body: 'Playbook\'lar, personele müşteri içeriğine sınırsız erişim vermeden en güvenli sıradaki eylemi tanımlar.',
    },
    card: {
      trigger: 'Tetikleyici',
      outcome: 'Beklenen sonuç',
    },
    source: {
      title: 'Kaynak kontrollü rehberlik',
      body: 'Bu prosedürler statik operasyonel rehberliktir. Personel bunları burada düzenleyebilmeden önce yazılabilir bir playbook CMS\'i sürüm, inceleyici, onay ve yayın geçmişi eklemelidir.',
    },
  },
  actions: {
    buttons: {
      changeStatus: 'Durumu değiştir',
      assignOwner: 'Sahip ata',
      setPriority: 'Öncelik belirle',
    },
    targetStatusLabel: 'Hedef durum',
    onlyReachable: 'Yalnız güncel durumdan ulaşılabilen durumlar sunulur.',
    statusDialog: {
      title: (ref: string) => `Durumu değiştir — ${ref}`,
      labelledBy: (ref: string) => `${ref} durumunu değiştir`,
      toast: (status: string) => `Durum ${status} olarak değişti.`,
    },
    ownerDialog: {
      title: (ref: string) => `Sahip ata — ${ref}`,
      labelledBy: (ref: string) => `${ref} için sahip ata`,
      subtitle: 'Sahip zaten bir personel hesabı olmalı.',
      ownerEmailLabel: 'Sahip e-postası',
      toast: 'Sahip atandı.',
    },
    priorityDialog: {
      title: (ref: string) => `Öncelik belirle — ${ref}`,
      labelledBy: (ref: string) => `${ref} için öncelik belirle`,
      subtitle: 'SLA vade tarihi vakanın oluşturulma zamanından yeniden hesaplanır.',
      toast: (priority: string) => `Öncelik ${priority} olarak ayarlandı.`,
    },
    priorityOptions: {
      urgent: 'Acil',
      high: 'Yüksek',
      normal: 'Normal',
      low: 'Düşük',
    },
    newCase: {
      button: 'Yeni vaka',
      dialogTitle: 'Yeni destek vakası',
      subtitle: 'Kendi SLA saatine sahip kalıcı bir destek vakası kaydı açar.',
      referenceLabel: 'Referans',
      requesterEmailLabel: 'Talep sahibi e-postası',
      subjectLabel: 'Konu',
      channelLabel: 'Kanal',
      channelOptions: { email: 'E-posta', form: 'Form', staff: 'Personel' },
      categoryOptions: { billing: 'Faturalama', builder: 'Builder', export: 'Dışa aktarım', access: 'Erişim', account: 'Hesap' },
      orgIdLabel: 'Organizasyon id',
      orgIdHelp: 'Organizasyon id — talep sahibi bir müşteriye bağlı değilse boş bırak.',
      summaryLabel: 'Özet',
      submit: 'Vaka oluştur',
      toast: 'Destek vakası oluşturuldu.',
    },
  },
  pages: {
    cases: {
      support: 'Kalıcı destek portföyü. Bu kaydı açmak günlüğe yazılır.',
    },
    queue: {
      crumbLeaf: 'Kuyruk',
      support: 'SLA, sahiplik ve duruma göre gelen müşteri işi. Bu kaydı açmak günlüğe yazılır.',
    },
    onboarding: {
      support: 'Çalışma alanlarını gözlemlenebilir ürün kilometre taşlarıyla ilk dışa aktarıma yönlendir.',
    },
    playbooks: {
      support: 'Tekrarlayan destek işleri için tutarlı, denetlenebilir prosedürler kullan.',
    },
  },
};

export const adminSupport = { en, tr } as const;

export type AdminSupportDict = Mirror<typeof en>;
