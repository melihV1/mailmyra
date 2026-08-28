import type { Mirror } from '../types';

/**
 * Güvenlik/governance sözlüğü (Task 10 — dalganın en ağır süpürmesi) —
 * altı çağrı yeri: `GovernanceOperationsViews.tsx` (dört görünüm: security
 * overview/staff roles/approvals/data requests), `ApprovalActions.tsx`
 * (karar diyalogları), `KvkkActions.tsx` (KVKK yaşam döngüsü diyalogları),
 * `StaffFlagActions.tsx` (personel yetkisi talep/icra diyalogları),
 * `StaffAccessLogView.tsx` ve `AdminActionLogView.tsx` (defter görüntü-
 * leyicileri).
 *
 * ⚠️ DEFTER İÇERİĞİ VERİDİR: `StaffAccessLogView`/`AdminActionLogView`de
 * scope/action/reason DEĞERLERİ, before/after JSON, e-postalar, IP'ler
 * asla çevrilmez — yalnız KROM (sütun başlıkları, filtreler, boş durumlar,
 * dışa aktarma düğmeleri) bu sözlükten okur.
 *
 * PAYLAŞILAN MODEL DOSYALARI bu görevin dosya listesinde DEĞİL (admin-
 * support/admin-platform emsali — `growthLifecycle().stage.label`): `access-
 * log-model.ts` (`getAccessScopeLabel`, `getClientLabel`, `getAccessReview
 * Facts().label/.detail`), `action-log-model.ts` (`getActionDescriptor().
 * label`, `humanize()`, `formatActionValue()`), `operations-model.ts` ve
 * `governance-overview-model.ts` (`snapshot.controls[].label/support/value`,
 * `snapshot.activity[].title/subject`, `getRequestFacts()`). Bunların
 * ÜRETTİĞİ tüm etiketler İngilizce literal olarak KALIR — bu dosyalar
 * `GovernanceOperationsViews.tsx`den import edilir ama KENDİLERİ ayrı
 * dosyalardır.
 *
 * `humanize()`-KURULU etiketler (scope/action KODLARINDAN türetilir,
 * Task 4 kararının devamı — bilerek DOKUNULMADI, dalga-sonu cila kararı
 * için işaretlendi):
 *   1. `AdminActionLogView.tsx` `ChangeRow`: `humanize(field)` (before/
 *      after alan adı → insan-okur etiket, DEĞİŞTİRİLEN ALAN kodundan).
 *   2. `admin/page.tsx` (bu görevin dosya listesinde DEĞİL, ama aynı
 *      sınırın parçası): `` `Viewed ${humanize(row.scope)}` `` ve
 *      `'customer data'` yer tutucusu, `humanize(row.action)`.
 *
 * `AdminActionLogView.tsx`nin KENDİ YEREL `getClientLabel()`'i (dosyanın
 * altında, `access-log-model.ts`teki AYNI adlı — ama farklı, model
 * dosyasına ait — fonksiyondan BAĞIMSIZ) bu görevin kapsamında: "Not
 * recorded"/"Other client" çevrildi, tarayıcı MARKA adları ("Microsoft
 * Edge", "Google Chrome", "Safari", "Firefox") KVKK/GDPR gibi değişmez
 * terim sayılıp sözlüğe hiç girmedi (kod içinde literal kaldı).
 * `StaffAccessLogView.tsx`nin `getClientLabel` çağrısı ise `access-log-
 * model.ts`ten İTHAL edilir (yerel değil) — o yüzden dönüş değeri VERİ
 * sayılır, dokunulmadı.
 *
 * `KvkkActions.tsx`teki `en-CA` tarih-girdisi tohumlama (`NewKvkkButton`)
 * BİLEREK dokunulmadı (brief) — yerel/UTC ayrımı çözümü, dile bağlı değil.
 * "KVKK"/"GDPR" terimleri her iki dilde de İngilizce/orijinal kalır.
 *
 * `StaffFlagActions.tsx`teki `RequestStaffChangeButton`in POST ettiği
 * `title` alanı (`` `Grant staff — ${targetId}` ``/`` `Revoke staff —
 * ${targetId}` ``) BİLEREK dokunulmadı: bu, `ApprovalQueueRow.title`
 * serbest-metin alanına yazılan, kalıcı olarak saklanan bir DEĞERDİR —
 * `NewApprovalButton`daki elle yazılan Title alanının otomatik-üretilmiş
 * eşdeğeri, dolayısıyla `row.title` her yerde VERİ sayıldığı gibi bu da
 * veri sayılır (`ApprovalsView`'daki `Row label="Request" value={selected.
 * title}` zaten VERİ). Diyaloğun KENDİ başlığı (`${grant ? 'Grant' :
 * 'Revoke'} staff access — ${targetId}`, `ExecuteStaffChangeButton`te) ise
 * KROM olduğu için "Grant"/"Revoke" kelimeleri çevrildi, `targetId` veri
 * olarak kaldı.
 *
 * Ham durum/risk/tip kodu yazdırmaları (`row.risk`, `selected.domain`,
 * `selected.type`, `request.status text-capitalize`, KvkkActions'taki
 * `target.replace('_',' ')` seçenek metni) KvkkActions/RevenueOperations
 * Views'teki YERLEŞİK kalıbın devamı — bilerek çevrilmedi. `StatusDialog`
 * toast'ı (`kvkkActions.statusDialog.toast`) çağıran tarafın ÖNCEDEN
 * `.replace('_',' ')` uyguladığı işlenmiş status string'i alır (admin-
 * support `actions.statusDialog.toast` emsali).
 *
 * Glossary: onay→approval · veri talebi→data request · kanıt→evidence ·
 * erişim günlüğü→access log · işlem günlüğü→action log · personel
 * yetkisi→staff flag · icra et→execute · karar→decision · defter→ledger ·
 * ilgili kişi→subject (KVKK bağlamında) · yaşam döngüsü→lifecycle.
 *
 * `shared.fields.customer` iki görünümde (ApprovalsView/DataRequestsView)
 * `Row label="Customer"`in bayt-bayt aynı kaynağı — admin-support
 * `fields.*` emsali. `shared.previewBadge`/`closePreview` de aynı şekilde
 * GovernanceOperationsViews içinde birden çok yerde tekrarlanan bayt-bayt
 * aynı metinler. `shared.readOnlyLedgerNote` `StaffAccessLogView`/
 * `AdminActionLogView`in ikisinde de BİREBİR aynı cümle ("No edit or
 * delete controls are exposed.") — iki ayrı defter görünümünün aynı
 * değişmezlik notu.
 */

const en = {
  shared: {
    previewBadge: 'Preview data',
    closePreview: 'Close preview',
    fields: { customer: 'Customer' },
    readOnlyLedgerNote: 'No edit or delete controls are exposed.',
  },
  overview: {
    previewNotice: {
      title: 'Preview control plane',
      body: 'Approval and KVKK records on this route are representative fixtures. Production reads only connected, authoritative sources.',
    },
    kpis: {
      controlReadiness: {
        label: 'Control readiness',
        support: (connected: number, total: number) => `${connected}/${total} domains connected`,
      },
      sensitiveReads: { label: 'Sensitive reads', support: (n: number) => `${n} recorded today` },
      privilegedWrites: { label: 'Privileged writes', support: (n: number) => `${n} recorded today` },
      reviewQueue: { label: 'Review queue', support: 'Critical decisions and overdue work' },
    },
    controlMap: {
      title: 'Governance control map',
      support:
        'One source-aware view of who can enter, what they read, what they change and which workflows still need persistence.',
      connectedBadge: (n: number) => `${n} connected`,
      connected: 'Connected',
      sourceGap: 'Source gap',
    },
    posture: {
      title: 'Control posture',
      support: 'Coverage, not a security certification score.',
      sourceCoverage: 'source coverage',
      staffIdentities: 'Staff identities',
      seenValue: (a: number, b: number) => `${a}/${b} seen`,
      readReviewSignals: 'Read review signals',
      criticalApprovals: 'Critical approvals',
      overdueKvkk: 'Overdue KVKK',
    },
    activity: {
      title: 'Recent governance activity',
      support: 'Newest reads, writes, decisions and data-rights work across the loaded sources.',
      openAuditLog: 'Open audit log',
      empty: {
        title: 'No governance events loaded',
        body: 'Connected audit sources are available, but no records exist in the current window.',
      },
    },
    queue: {
      title: 'Open control work',
      support: 'Move directly to the evidence or policy surface that needs attention.',
      approvalDecisions: 'Approval decisions',
      pendingValue: (n: number) => `${n} pending`,
      kvkkEvidence: 'KVKK evidence',
      openValue: (n: number) => `${n} open`,
      sensitiveReads: 'Sensitive reads',
      signalsValue: (n: number) => `${n} signals`,
      privilegedWrites: 'Privileged writes',
      recordsValue: (n: number) => `${n} records`,
    },
    gapsNotice: {
      title: 'Two governance sources are not persisted yet',
      body:
        'Approval decisions and KVKK request lifecycle records require dedicated schemas, immutable events and ownership rules. The overview marks those gaps instead of manufacturing production telemetry.',
    },
  },
  staffRoles: {
    kpis: {
      staffAccounts: { label: 'Staff accounts', support: 'Accounts behind isStaff' },
      recordedLogin: { label: 'Recorded login', support: 'At least one login event' },
      persistedRoles: { label: 'Persisted roles', value: '1', support: 'Single staff gate' },
      awaitingExecution: { label: 'Awaiting execution', support: 'Approved, not yet executed' },
    },
    directory: {
      title: 'Staff directory',
      support: 'Read-only view of accounts currently allowed into the control plane.',
      addedPrefix: 'Added',
      staffBadge: 'Staff',
      empty: { title: 'No staff accounts', body: 'No account currently has the staff gate enabled.' },
    },
    accessModel: {
      title: 'Current access model',
      support: 'The database has one staff flag, not granular role assignments.',
      steps: {
        authenticate: { title: 'Authenticate', body: 'A normal Mailmyra account signs in.' },
        staffGate: { title: 'Staff gate', body: 'isStaff permits the control-plane shell.' },
        audit: { title: 'Audit', body: 'Sensitive reads and supported writes create immutable events.' },
      },
    },
    changeRequests: {
      title: 'Staff change requests',
      support:
        'Grant and revoke go through Security → Approvals first; execution is a separate, deliberate step and can only be spent once.',
      grantBadge: 'Grant',
      revokeBadge: 'Revoke',
      executedSuffix: ' · executed',
      empty: {
        title: 'No staff change requests',
        previewBody: 'Grant and revoke requests will appear here once they are opened.',
        liveBody: 'Use Request staff change above to grant or revoke the staff gate.',
      },
    },
    capabilityBoundary: {
      title: 'Capability boundary',
      support: 'What staff can do today, without implying a role engine that does not exist.',
      sensitiveReads: { title: 'Sensitive customer reads', body: 'Logged per organization and target scope.' },
      invoiceOps: { title: 'Invoice operations', body: 'Issue, settle and void authoritative invoice records.' },
      entitlementUpdates: { title: 'Entitlement updates', body: 'Change seats, state and trial dates with a reason.' },
      staffProvisioning: {
        title: 'Staff provisioning',
        body: 'Grant or revoke the staff gate through an approved, single-use request.',
      },
    },
    singleFlagNotice: {
      title: 'Single flag, not a role engine',
      body:
        'Grant and revoke change the one isStaff flag through an approved, single-use request. There is still no granular per-feature role model.',
    },
  },
  approvalsView: {
    empty: {
      title: 'Approval workflow needs a source',
      body:
        'No approval model exists in the current schema. Add approval requests, approvers, decisions and immutable decision events before this workbench can become operational.',
    },
    noSimulatedNotice: {
      title: 'No simulated approvals in production',
      body: 'The navigation remains ready, but this screen will not present invented queues or functional approve/reject controls.',
    },
    previewNotice: { body: 'These records exist only to validate the future approval workbench layout.' },
    columns: { awaitingDecision: 'Awaiting decision', approved: 'Approved', rejected: 'Rejected' },
    kpis: {
      pending: { label: 'Pending', support: 'Awaiting a decision' },
      critical: { label: 'Critical', support: 'Highest risk requests' },
      decided: { label: 'Decided', support: 'Approved or rejected' },
      policy: {
        label: 'Policy',
        previewValue: '2-person',
        liveValue: 'Per request',
        previewSupport: 'Preview target only',
        liveSupport: 'Self-approval allowed',
      },
    },
    detail: {
      title: 'Approval request',
      previewSubtitle: 'Preview-only request context.',
      subtitle: 'Request detail.',
      fields: { request: 'Request', domain: 'Domain', requester: 'Requester', decisionProgress: 'Decision progress' },
      platformFallback: 'Platform',
    },
  },
  dataRequestsView: {
    previewNotice: { body: 'These requests are illustrative and are not customer records.' },
    empty: {
      title: 'KVKK request register needs a source',
      body:
        'The current schema has no data-subject request record, ownership, identity-check evidence or due-date workflow. Add those records before operational controls are exposed.',
    },
    evidenceNotice: {
      title: 'Access evidence is available separately',
      body: 'Existing staff access and admin action logs support investigations, but they are not a substitute for a formal KVKK request register.',
    },
    kpis: {
      openRequests: { label: 'Open requests', support: 'Active statutory work' },
      dueIn5Days: { label: 'Due in 5 days', support: 'Near SLA boundary' },
      overdue: { label: 'Overdue', support: 'Immediate escalation' },
      completed: { label: 'Completed', support: 'Closed with evidence' },
    },
    register: { title: 'Request register', support: 'SLA-first work queue with identity and evidence context.' },
    remaining: {
      closed: 'Closed',
      overdue: (n: number) => `${n}d overdue`,
      left: (n: number) => `${n}d left`,
    },
    evidenceSuffix: (n: number) => `${n} evidence`,
    workflow: {
      title: 'Statutory workflow',
      support: 'A visible evidence chain from intake to closure.',
      steps: {
        intake: { title: 'Intake', body: 'Register scope and statutory clock.' },
        identityCheck: { title: 'Identity check', body: 'Validate the data subject safely.' },
        collectEvidence: { title: 'Collect evidence', body: 'Locate data and access history.' },
        legalReview: { title: 'Legal review', body: 'Confirm exemptions and response.' },
        respondClose: { title: 'Respond and close', body: 'Deliver securely and retain proof.' },
      },
    },
    detail: {
      previewSubtitle: 'Preview-only request detail.',
      subtitle: 'Request detail.',
      fields: { subject: 'Subject', owner: 'Owner', requestType: 'Request type', received: 'Received', due: 'Due' },
    },
  },
  approvalActions: {
    buttons: { approve: 'Approve', reject: 'Reject', cancel: 'Cancel' },
    decisionDialog: {
      approveTitle: (title: string) => `Approve — ${title}`,
      rejectTitle: (title: string) => `Reject — ${title}`,
      approveLabelledBy: (title: string) => `Approve ${title}`,
      rejectLabelledBy: (title: string) => `Reject ${title}`,
      approveSubtitle: (approvals: number, required: number) => `${approvals}/${required} approvals once this decision is recorded.`,
      rejectSubtitle: 'A single rejection closes the request.',
      pendingToast: 'Decision recorded — still pending.',
      approvedToast: 'Request approved.',
      rejectedToast: 'Request rejected.',
      approveSubmit: 'Approve',
      rejectSubmit: 'Reject',
    },
    cancelDialog: {
      title: (title: string) => `Cancel — ${title}`,
      subtitle: 'The request stays in the ledger; it only drops out of the active queue.',
      labelledBy: (title: string) => `Cancel ${title}`,
      submit: 'Cancel request',
      toast: 'Request cancelled.',
    },
    newApproval: {
      button: 'New approval request',
      dialogTitle: 'New approval request',
      subtitle: 'Opens a decision-ledger entry — nothing is applied automatically.',
      titleLabel: 'Title',
      domainLabel: 'Domain',
      domainOptions: { entitlement: 'Entitlement', billing: 'Billing', security: 'Security', platform: 'Platform' },
      riskLabel: 'Risk level',
      riskOptions: { medium: 'Medium', high: 'High', critical: 'Critical' },
      orgIdLabel: 'Org id',
      orgIdHelp: 'Org id — leave blank for a platform-wide record.',
      requiredApprovalsLabel: 'Required approvals',
      submit: 'Create request',
      toast: 'Approval request created.',
    },
  },
  kvkkActions: {
    buttons: {
      verifyIdentity: 'Verify identity',
      assignOwner: 'Assign owner',
      addEvidence: 'Add evidence',
      moveStatus: 'Move status',
      respondClose: 'Respond & close',
    },
    identityDialog: {
      toast: 'Identity verified.',
      title: (ref: string) => `Verify identity — ${ref}`,
      subtitle: "Confirms the data subject's identity and moves the request into progress.",
      labelledBy: (ref: string) => `Verify identity ${ref}`,
      methodLabel: 'Verification method',
      methodPlaceholder: 'e.g. video call, ID document, portal login',
    },
    ownerDialog: {
      toast: 'Owner assigned.',
      title: (ref: string) => `Assign owner — ${ref}`,
      subtitle: 'The owner must already be a staff account.',
      labelledBy: (ref: string) => `Assign owner ${ref}`,
      ownerEmailLabel: 'Owner email',
    },
    evidenceDialog: {
      toast: 'Evidence added.',
      title: (ref: string) => `Add evidence — ${ref}`,
      subtitle: 'The location is stored with the evidence record only — it never appears in the event trail.',
      labelledBy: (ref: string) => `Add evidence ${ref}`,
      labelLabel: 'Label',
      labelPlaceholder: 'e.g. CRM export, mailbox search',
      locationLabel: 'Location',
      locationPlaceholder: 'e.g. /evidence/kvkk-2026-0001/crm-export.csv',
    },
    statusDialog: {
      toast: (status: string) => `Status moved to ${status}.`,
      title: (ref: string) => `Move status — ${ref}`,
      subtitle: 'Only the statuses reachable from the current one are offered.',
      labelledBy: (ref: string) => `Move status ${ref}`,
      targetLabel: 'Target status',
    },
    completeDialog: {
      toast: 'Request closed.',
      title: (ref: string) => `Respond & close — ${ref}`,
      subtitle: 'Closes the request. This cannot be reopened.',
      labelledBy: (ref: string) => `Respond and close ${ref}`,
      summaryLabel: 'Response summary',
    },
    newRequest: {
      button: 'New KVKK request',
      dialogTitle: 'New KVKK request',
      subtitle: 'Opens a statutory data-subject request record.',
      referenceLabel: 'Reference',
      subjectEmailLabel: 'Subject email',
      typeLabel: 'Request type',
      typeOptions: { access: 'Access', erasure: 'Erasure', correction: 'Correction', portability: 'Portability' },
      orgIdLabel: 'Org id',
      orgIdHelp: 'Org id — leave blank if the subject is not tied to a customer.',
      receivedOnLabel: 'Received on',
      receivedOnHelp: 'The statutory 30-day clock starts from this date.',
      receivedViaLabel: 'Received via',
      receivedViaPlaceholder: 'e.g. email, portal, mail',
      submit: 'Create request',
      toast: 'KVKK request created.',
    },
  },
  staffFlagActions: {
    request: {
      toast: 'Request opened — decide it from Security → Approvals.',
      button: 'Request staff change',
      dialogTitle: 'Request staff change',
      subtitle: 'Opens a decision-ledger entry. Nothing is granted or revoked until it is approved and executed.',
      emailLabel: 'Target email',
      actionLabel: 'Action',
      actionOptions: { grant: 'Grant staff access', revoke: 'Revoke staff access' },
      submit: 'Create request',
    },
    execute: {
      grantToast: 'Staff access granted.',
      revokeToast: 'Staff access revoked.',
      button: 'Execute',
      grantTitle: (targetId: string) => `Grant staff access — ${targetId}`,
      revokeTitle: (targetId: string) => `Revoke staff access — ${targetId}`,
      subtitle: 'Executes the approved request. It can only be spent once.',
      labelledBy: (targetId: string) => `Execute staff change ${targetId}`,
      grantSubmit: 'Grant access',
      revokeSubmit: 'Revoke access',
    },
  },
  accessLog: {
    summaryAria: 'Access log summary',
    contextAria: 'Access context',
    summary: {
      sensitiveReads: { label: 'Sensitive reads', support: 'Loaded audit window' },
      readsToday: { label: 'Reads today', support: 'Since local midnight' },
      activeStaff: { label: 'Active staff', support: 'Distinct staff identities' },
      customersViewed: {
        label: 'Customers viewed',
        support: (n: number) => `${n} review ${n === 1 ? 'signal' : 'signals'}`,
      },
    },
    context: {
      immutableLedger: { label: 'Immutable ledger', value: 'Read-only audit trail' },
      mostReadScope: {
        label: 'Most read scope',
        emptyValue: 'No reads yet',
        support: (n: number) => `${n} events in the loaded window`,
        emptySupport: 'Waiting for the first event',
      },
      mostViewedCustomer: {
        label: 'Most viewed customer',
        emptyValue: 'No customer yet',
        support: (n: number) => `${n} sensitive reads`,
        emptySupport: 'Waiting for the first event',
      },
    },
    ledger: {
      title: 'Sensitive read ledger',
      resultsBadge: (n: number) => `${n} results`,
      subtitle: 'Review who opened customer data, what they viewed and when it happened.',
      reset: 'Reset',
      exportCsv: 'Export CSV',
      focusAria: 'Review focus',
      allReads: 'All reads',
      reviewSignals: 'Review signals',
      routineReads: 'Routine reads',
      searchLabel: 'Search audit trail',
      searchPlaceholder: 'Staff, customer, target or IP',
      periodLabel: 'Period',
      periodOptions: { today: 'Today', d7: 'Last 7 days', d30: 'Last 30 days', all: 'Loaded history' },
      scopeLabel: 'Scope',
      allScopes: 'All scopes',
      customerLabel: 'Customer',
      allCustomers: 'All customers',
      staffLabel: 'Staff',
      allStaff: 'All staff',
      sortLabel: 'Sort by',
      sortOptions: { newest: 'Newest first', oldest: 'Oldest first', customer: 'Customer', staff: 'Staff member' },
      emptyNoRows: 'No sensitive reads have been recorded yet.',
      emptyNoMatch: 'No access event matches these filters.',
      tableHeaders: {
        when: 'When',
        staffMember: 'Staff member',
        customer: 'Customer',
        scope: 'Scope',
        target: 'Target',
        reviewSignal: 'Review signal',
        actions: 'Actions',
      },
      footerShowing: (visible: number, total: number) => `Showing ${visible} of ${total} loaded events`,
      footerAppendOnly: 'Append-only audit data',
      viewEventFor: (org: string) => `View access event for ${org}`,
      viewEvent: 'View event',
      openFor: (org: string) => `Open ${org}`,
      openCustomer: 'Open customer',
      viewEventAria: 'View access event',
      target: 'Target',
    },
    detail: {
      title: 'Sensitive read event',
      subtitle: 'Immutable staff access record',
      labelledBy: 'Sensitive read event details',
      readOnlyHeading: 'Read-only evidence.',
      readOnlyBody: 'This record cannot be edited or deleted from the control plane.',
      fields: {
        eventId: 'Event ID',
        timestampUtc: 'Timestamp (UTC)',
        staffMember: 'Staff member',
        customer: 'Customer',
        scope: 'Scope',
        targetId: 'Target ID',
        ipAddress: 'IP address',
        client: 'Client',
      },
      notSingleRecordRead: 'Not a single-record read',
      reviewSignalNote: 'A review signal is a workload heuristic, not a confirmed security incident.',
      rawUserAgent: 'Raw user agent',
      openCustomer: 'Open customer',
      close: 'Close',
    },
    wholeScope: 'Whole scope',
    time: {
      justNow: 'Just now',
      minutesAgo: (m: number) => `${m}m ago`,
      hoursAgo: (h: number) => `${h}h ago`,
      yesterday: 'Yesterday',
      daysAgo: (d: number) => `${d}d ago`,
    },
    csvHeaders: {
      eventId: 'Event ID',
      timestampUtc: 'Timestamp UTC',
      staff: 'Staff',
      customer: 'Customer',
      scope: 'Scope',
      target: 'Target',
      ip: 'IP',
      client: 'Client',
      reviewSignal: 'Review signal',
    },
  },
  actionLog: {
    focusOptions: { all: 'All changes', entitlement: 'Entitlements', billing: 'Billing' },
    summaryAria: 'Admin action summary',
    contextAria: 'Action log context',
    summary: {
      recordedWrites: { label: 'Recorded writes', support: 'Loaded immutable window' },
      writesToday: { label: 'Writes today', support: 'Since local midnight' },
      activeStaff: { label: 'Active staff', support: 'Distinct staff identities' },
      customersChanged: { label: 'Customers changed', support: 'Distinct root workspaces' },
    },
    context: {
      immutableLedger: { eyebrow: 'Immutable ledger', title: 'Staff writes only' },
      mostCommonAction: {
        eyebrow: 'Most common action',
        emptyTitle: 'No actions yet',
        support: 'Across the loaded audit window',
        emptySupport: 'Awaiting the first staff write',
      },
      mostChangedCustomer: {
        eyebrow: 'Most changed customer',
        emptyTitle: 'No customer yet',
        support: 'Highest write count in this window',
        emptySupport: 'No customer changes recorded',
      },
    },
    ledger: {
      title: 'Admin action ledger',
      resultsBadge: (n: number) => `${n} ${n === 1 ? 'result' : 'results'}`,
      subtitle: 'Every support write carries an actor, customer, reason and before/after snapshot.',
      resetFilters: 'Reset filters',
      exportCsv: 'Export CSV',
      categoryAria: 'Action category',
      searchLabel: 'Search ledger',
      searchPlaceholder: 'Staff, customer, action, target or reason',
      periodLabel: 'Recorded period',
      periodOptions: { today: 'Today', d7: 'Last 7 days', d30: 'Last 30 days', all: 'All loaded' },
      sortLabel: 'Sort by',
      sortOptions: { newest: 'Newest first', oldest: 'Oldest first', customer: 'Customer name', staff: 'Staff identity' },
      emptyNoRows: 'No staff writes have been recorded yet.',
      emptyNoMatch: 'No action matches these filters.',
      tableHeaders: { recorded: 'Recorded', staff: 'Staff', customer: 'Customer', action: 'Action', reason: 'Reason', actionsAria: 'Actions' },
      reasonRequired: 'Reason required',
      viewChange: 'View change',
      changedBy: 'Changed by',
      recorded: 'Recorded',
      viewChangeFor: (org: string) => `View change for ${org}`,
      openFor: (org: string) => `Open ${org}`,
    },
    detail: {
      subtitle: 'Immutable staff write with the stored before and after snapshots.',
      labelledBy: (id: string) => `Admin action ${id}`,
      fields: { recorded: 'Recorded', staff: 'Staff', customer: 'Customer', targetId: 'Target ID' },
      organizationFallback: 'Organization',
      recordedReason: 'Recorded reason',
      changedFields: 'Changed fields',
      differences: (n: number) => `${n} differences`,
      noDifferences: 'The stored snapshots contain no top-level field difference.',
      ipAddress: 'IP address',
      client: 'Client',
      actionKey: 'Action key',
      showRawSnapshots: 'Show raw snapshots',
      before: 'Before',
      after: 'After',
      close: 'Close',
      openCustomerDetail: 'Open customer detail',
    },
    change: { field: 'Field', previous: 'Previous', newValue: 'New value' },
    customerWorkspace: 'Customer workspace',
    time: { recently: 'Recently', minutesAgo: (m: number) => `${m}m ago`, hoursAgo: (h: number) => `${h}h ago`, daysAgo: (d: number) => `${d}d ago` },
    client: { notRecorded: 'Not recorded', other: 'Other client' },
    csvHeaders: {
      eventId: 'Event ID',
      recorded: 'Recorded',
      staff: 'Staff',
      customer: 'Customer',
      action: 'Action',
      targetId: 'Target ID',
      changedFields: 'Changed fields',
      reason: 'Reason',
      ip: 'IP',
      client: 'Client',
    },
  },
} as const;

const tr: Mirror<typeof en> = {
  shared: {
    previewBadge: 'Önizleme verisi',
    closePreview: 'Önizlemeyi kapat',
    fields: { customer: 'Müşteri' },
    readOnlyLedgerNote: 'Düzenleme veya silme kontrolü sunulmaz.',
  },
  overview: {
    previewNotice: {
      title: 'Önizleme kontrol düzlemi',
      body: 'Bu rotadaki onay ve KVKK kayıtları temsili sabit verilerdir. Üretim yalnız bağlı, yetkili kaynakları okur.',
    },
    kpis: {
      controlReadiness: {
        label: 'Kontrol hazırlığı',
        support: (connected: number, total: number) => `${connected}/${total} alan bağlı`,
      },
      sensitiveReads: { label: 'Hassas okumalar', support: (n: number) => `bugün ${n} kayıt` },
      privilegedWrites: { label: 'Yetkili yazmalar', support: (n: number) => `bugün ${n} kayıt` },
      reviewQueue: { label: 'İnceleme kuyruğu', support: 'Kritik kararlar ve gecikmiş işler' },
    },
    controlMap: {
      title: 'Governance kontrol haritası',
      support:
        'Kimin girebildiğinin, ne okuduğunun, neyi değiştirdiğinin ve hangi iş akışlarının hâlâ kalıcılık gerektirdiğinin kaynağa duyarlı tek görünümü.',
      connectedBadge: (n: number) => `${n} bağlı`,
      connected: 'Bağlı',
      sourceGap: 'Kaynak eksik',
    },
    posture: {
      title: 'Kontrol duruşu',
      support: 'Kapsam — bir güvenlik sertifikası puanı değil.',
      sourceCoverage: 'kaynak kapsamı',
      staffIdentities: 'Personel kimlikleri',
      seenValue: (a: number, b: number) => `${a}/${b} görüldü`,
      readReviewSignals: 'Okuma inceleme sinyalleri',
      criticalApprovals: 'Kritik onaylar',
      overdueKvkk: 'Gecikmiş KVKK',
    },
    activity: {
      title: 'Son governance etkinliği',
      support: 'Yüklü kaynaklar genelinde en yeni okumalar, yazmalar, kararlar ve veri hakları işleri.',
      openAuditLog: 'Denetim günlüğünü aç',
      empty: {
        title: 'Yüklü governance etkinliği yok',
        body: 'Bağlı denetim kaynakları mevcut, ancak güncel pencerede hiç kayıt yok.',
      },
    },
    queue: {
      title: 'Açık kontrol işi',
      support: 'Dikkat gereken kanıt veya politika yüzeyine doğrudan git.',
      approvalDecisions: 'Onay kararları',
      pendingValue: (n: number) => `${n} beklemede`,
      kvkkEvidence: 'KVKK kanıtı',
      openValue: (n: number) => `${n} açık`,
      sensitiveReads: 'Hassas okumalar',
      signalsValue: (n: number) => `${n} sinyal`,
      privilegedWrites: 'Yetkili yazmalar',
      recordsValue: (n: number) => `${n} kayıt`,
    },
    gapsNotice: {
      title: 'İki governance kaynağı henüz kalıcı değil',
      body:
        'Onay kararları ve KVKK talebi yaşam döngüsü kayıtları özel şemalar, değişmez etkinlikler ve sahiplik kuralları gerektirir. Genel bakış üretim telemetrisi uydurmak yerine bu boşlukları işaretler.',
    },
  },
  staffRoles: {
    kpis: {
      staffAccounts: { label: 'Personel hesapları', support: 'isStaff arkasındaki hesaplar' },
      recordedLogin: { label: 'Kayıtlı giriş', support: 'En az bir giriş olayı' },
      persistedRoles: { label: 'Kalıcı roller', value: '1', support: 'Tek personel geçidi' },
      awaitingExecution: { label: 'İcra bekleyen', support: 'Onaylandı, henüz icra edilmedi' },
    },
    directory: {
      title: 'Personel dizini',
      support: 'Kontrol düzlemine şu anda izinli hesapların salt okunur görünümü.',
      addedPrefix: 'Eklendi',
      staffBadge: 'Personel',
      empty: { title: 'Personel hesabı yok', body: 'Şu anda hiçbir hesapta personel geçidi etkin değil.' },
    },
    accessModel: {
      title: 'Güncel erişim modeli',
      support: 'Veritabanında tek bir personel bayrağı var, ayrıntılı rol atamaları yok.',
      steps: {
        authenticate: { title: 'Kimlik doğrula', body: 'Normal bir Mailmyra hesabı giriş yapar.' },
        staffGate: { title: 'Personel geçidi', body: 'isStaff kontrol düzlemi kabuğuna izin verir.' },
        audit: { title: 'Denetim', body: 'Hassas okumalar ve desteklenen yazmalar değişmez kayıtlar oluşturur.' },
      },
    },
    changeRequests: {
      title: 'Personel değişiklik talepleri',
      support:
        'Verme ve kaldırma önce Güvenlik → Onaylar\'dan geçer; icra ayrı, bilinçli bir adımdır ve yalnız bir kez harcanabilir.',
      grantBadge: 'Ver',
      revokeBadge: 'Kaldır',
      executedSuffix: ' · icra edildi',
      empty: {
        title: 'Personel değişiklik talebi yok',
        previewBody: 'Verme ve kaldırma talepleri açıldığında burada görünür.',
        liveBody: 'Personel geçidini vermek veya kaldırmak için yukarıdaki Personel değişikliği talep et\'i kullan.',
      },
    },
    capabilityBoundary: {
      title: 'Yetenek sınırı',
      support: 'Personelin bugün yapabildikleri, var olmayan bir rol motoru ima etmeden.',
      sensitiveReads: { title: 'Hassas müşteri okumaları', body: 'Organizasyon ve hedef kapsamına göre kaydedilir.' },
      invoiceOps: { title: 'Fatura işlemleri', body: 'Yetkili fatura kayıtlarını düzenle, kapat ve iptal et.' },
      entitlementUpdates: { title: 'Tahsis güncellemeleri', body: 'Koltukları, durumu ve deneme tarihlerini bir sebeple değiştir.' },
      staffProvisioning: {
        title: 'Personel provizyonu',
        body: 'Onaylı, tek kullanımlık bir talep üzerinden personel geçidini ver veya kaldır.',
      },
    },
    singleFlagNotice: {
      title: 'Tek bayrak, rol motoru değil',
      body:
        'Verme ve kaldırma, onaylı, tek kullanımlık bir talep üzerinden tek bir isStaff bayrağını değiştirir. Hâlâ ayrıntılı özellik-bazlı bir rol modeli yok.',
    },
  },
  approvalsView: {
    empty: {
      title: 'Onay iş akışı bir kaynak gerektiriyor',
      body:
        'Güncel şemada bir onay modeli yok. Bu çalışma masası operasyonel hale gelmeden önce onay talepleri, onaylayanlar, kararlar ve değişmez karar etkinlikleri ekle.',
    },
    noSimulatedNotice: {
      title: 'Üretimde simüle onay yok',
      body: 'Gezinme hazır kalır, ancak bu ekran uydurma kuyruklar veya çalışan onayla/reddet kontrolleri sunmaz.',
    },
    previewNotice: { body: 'Bu kayıtlar yalnız gelecekteki onay çalışma masası yerleşimini doğrulamak için var.' },
    columns: { awaitingDecision: 'Karar bekliyor', approved: 'Onaylandı', rejected: 'Reddedildi' },
    kpis: {
      pending: { label: 'Beklemede', support: 'Karar bekliyor' },
      critical: { label: 'Kritik', support: 'En yüksek riskli talepler' },
      decided: { label: 'Karara bağlandı', support: 'Onaylandı veya reddedildi' },
      policy: {
        label: 'Politika',
        previewValue: '2 kişi',
        liveValue: 'Talep başına',
        previewSupport: 'Yalnız önizleme hedefi',
        liveSupport: 'Kendi kendini onaylamaya izin verilir',
      },
    },
    detail: {
      title: 'Onay talebi',
      previewSubtitle: 'Yalnız önizleme talep bağlamı.',
      subtitle: 'Talep detayı.',
      fields: { request: 'Talep', domain: 'Alan', requester: 'Talep eden', decisionProgress: 'Karar ilerlemesi' },
      platformFallback: 'Platform',
    },
  },
  dataRequestsView: {
    previewNotice: { body: 'Bu talepler örnektir ve müşteri kaydı değildir.' },
    empty: {
      title: 'KVKK talep kaydı bir kaynak gerektiriyor',
      body:
        'Güncel şemada veri sahibi talep kaydı, sahiplik, kimlik kontrolü kanıtı veya vade iş akışı yok. Operasyonel kontroller açılmadan önce bu kayıtları ekle.',
    },
    evidenceNotice: {
      title: 'Erişim kanıtı ayrıca mevcut',
      body: 'Mevcut personel erişim ve admin işlem günlükleri soruşturmaları destekler, ancak resmi bir KVKK talep kaydının yerini tutmaz.',
    },
    kpis: {
      openRequests: { label: 'Açık talepler', support: 'Aktif yasal iş' },
      dueIn5Days: { label: '5 gün içinde vadesi dolan', support: 'SLA sınırına yaklaşıyor' },
      overdue: { label: 'Gecikmiş', support: 'Acil eskalasyon' },
      completed: { label: 'Tamamlandı', support: 'Kanıtla kapatıldı' },
    },
    register: { title: 'Talep kaydı', support: 'Kimlik ve kanıt bağlamıyla önce-SLA iş kuyruğu.' },
    remaining: {
      closed: 'Kapandı',
      overdue: (n: number) => `${n} gün gecikti`,
      left: (n: number) => `${n} gün kaldı`,
    },
    evidenceSuffix: (n: number) => `${n} kanıt`,
    workflow: {
      title: 'Yasal iş akışı',
      support: 'Kabulden kapanışa görünür bir kanıt zinciri.',
      steps: {
        intake: { title: 'Kabul', body: 'Kapsamı ve yasal saati kaydet.' },
        identityCheck: { title: 'Kimlik kontrolü', body: 'Veri sahibini güvenle doğrula.' },
        collectEvidence: { title: 'Kanıt topla', body: 'Veriyi ve erişim geçmişini bul.' },
        legalReview: { title: 'Hukuki inceleme', body: 'İstisnaları ve yanıtı doğrula.' },
        respondClose: { title: 'Yanıtla ve kapat', body: 'Güvenle teslim et ve kanıtı sakla.' },
      },
    },
    detail: {
      previewSubtitle: 'Yalnız önizleme talep detayı.',
      subtitle: 'Talep detayı.',
      fields: { subject: 'İlgili kişi', owner: 'Sahip', requestType: 'Talep türü', received: 'Alındı', due: 'Vade' },
    },
  },
  approvalActions: {
    buttons: { approve: 'Onayla', reject: 'Reddet', cancel: 'Vazgeç' },
    decisionDialog: {
      approveTitle: (title: string) => `Onayla — ${title}`,
      rejectTitle: (title: string) => `Reddet — ${title}`,
      approveLabelledBy: (title: string) => `${title} onayla`,
      rejectLabelledBy: (title: string) => `${title} reddet`,
      approveSubtitle: (approvals: number, required: number) => `Bu karar kaydedildiğinde ${approvals}/${required} onay.`,
      rejectSubtitle: 'Tek bir ret talebi kapatır.',
      pendingToast: 'Karar kaydedildi — hâlâ beklemede.',
      approvedToast: 'Talep onaylandı.',
      rejectedToast: 'Talep reddedildi.',
      approveSubmit: 'Onayla',
      rejectSubmit: 'Reddet',
    },
    cancelDialog: {
      title: (title: string) => `Vazgeç — ${title}`,
      subtitle: 'Talep defterde kalır; yalnız aktif kuyruktan düşer.',
      labelledBy: (title: string) => `${title} vazgeç`,
      submit: 'Talebi vazgeç',
      toast: 'Talep vazgeçildi.',
    },
    newApproval: {
      button: 'Yeni onay talebi',
      dialogTitle: 'Yeni onay talebi',
      subtitle: 'Bir karar defteri kaydı açar — hiçbir şey otomatik uygulanmaz.',
      titleLabel: 'Başlık',
      domainLabel: 'Alan',
      domainOptions: { entitlement: 'Tahsis', billing: 'Faturalama', security: 'Güvenlik', platform: 'Platform' },
      riskLabel: 'Risk düzeyi',
      riskOptions: { medium: 'Orta', high: 'Yüksek', critical: 'Kritik' },
      orgIdLabel: 'Organizasyon id',
      orgIdHelp: 'Organizasyon id — platform geneli bir kayıt için boş bırak.',
      requiredApprovalsLabel: 'Gereken onay sayısı',
      submit: 'Talep oluştur',
      toast: 'Onay talebi oluşturuldu.',
    },
  },
  kvkkActions: {
    buttons: {
      verifyIdentity: 'Kimliği doğrula',
      assignOwner: 'Sahip ata',
      addEvidence: 'Kanıt ekle',
      moveStatus: 'Durumu taşı',
      respondClose: 'Yanıtla ve kapat',
    },
    identityDialog: {
      toast: 'Kimlik doğrulandı.',
      title: (ref: string) => `Kimliği doğrula — ${ref}`,
      subtitle: 'İlgili kişinin kimliğini onaylar ve talebi işleme alır.',
      labelledBy: (ref: string) => `${ref} kimliğini doğrula`,
      methodLabel: 'Doğrulama yöntemi',
      methodPlaceholder: 'ör. görüntülü görüşme, kimlik belgesi, portal girişi',
    },
    ownerDialog: {
      toast: 'Sahip atandı.',
      title: (ref: string) => `Sahip ata — ${ref}`,
      subtitle: 'Sahip zaten bir personel hesabı olmalı.',
      labelledBy: (ref: string) => `${ref} için sahip ata`,
      ownerEmailLabel: 'Sahip e-postası',
    },
    evidenceDialog: {
      toast: 'Kanıt eklendi.',
      title: (ref: string) => `Kanıt ekle — ${ref}`,
      subtitle: 'Konum yalnız kanıt kaydıyla saklanır — etkinlik izinde asla görünmez.',
      labelledBy: (ref: string) => `${ref} için kanıt ekle`,
      labelLabel: 'Etiket',
      labelPlaceholder: 'ör. CRM dışa aktarımı, posta kutusu araması',
      locationLabel: 'Konum',
      locationPlaceholder: 'ör. /evidence/kvkk-2026-0001/crm-export.csv',
    },
    statusDialog: {
      toast: (status: string) => `Durum ${status} olarak taşındı.`,
      title: (ref: string) => `Durumu taşı — ${ref}`,
      subtitle: 'Yalnız güncel durumdan ulaşılabilen durumlar sunulur.',
      labelledBy: (ref: string) => `${ref} durumunu taşı`,
      targetLabel: 'Hedef durum',
    },
    completeDialog: {
      toast: 'Talep kapatıldı.',
      title: (ref: string) => `Yanıtla ve kapat — ${ref}`,
      subtitle: 'Talebi kapatır. Bu yeniden açılamaz.',
      labelledBy: (ref: string) => `${ref} yanıtla ve kapat`,
      summaryLabel: 'Yanıt özeti',
    },
    newRequest: {
      button: 'Yeni KVKK talebi',
      dialogTitle: 'Yeni KVKK talebi',
      subtitle: 'Yasal bir veri sahibi talep kaydı açar.',
      referenceLabel: 'Referans',
      subjectEmailLabel: 'İlgili kişi e-postası',
      typeLabel: 'Talep türü',
      typeOptions: { access: 'Erişim', erasure: 'Silme', correction: 'Düzeltme', portability: 'Taşınabilirlik' },
      orgIdLabel: 'Organizasyon id',
      orgIdHelp: 'Organizasyon id — ilgili kişi bir müşteriye bağlı değilse boş bırak.',
      receivedOnLabel: 'Alındığı tarih',
      receivedOnHelp: 'Yasal 30 günlük süre bu tarihten başlar.',
      receivedViaLabel: 'Alınma yolu',
      receivedViaPlaceholder: 'ör. e-posta, portal, posta',
      submit: 'Talep oluştur',
      toast: 'KVKK talebi oluşturuldu.',
    },
  },
  staffFlagActions: {
    request: {
      toast: 'Talep açıldı — Güvenlik → Onaylar\'dan karara bağla.',
      button: 'Personel değişikliği talep et',
      dialogTitle: 'Personel değişikliği talep et',
      subtitle: 'Bir karar defteri kaydı açar. Onaylanıp icra edilene kadar hiçbir şey verilmez veya kaldırılmaz.',
      emailLabel: 'Hedef e-posta',
      actionLabel: 'Eylem',
      actionOptions: { grant: 'Personel erişimi ver', revoke: 'Personel erişimini kaldır' },
      submit: 'Talep oluştur',
    },
    execute: {
      grantToast: 'Personel erişimi verildi.',
      revokeToast: 'Personel erişimi kaldırıldı.',
      button: 'İcra et',
      grantTitle: (targetId: string) => `Personel erişimi ver — ${targetId}`,
      revokeTitle: (targetId: string) => `Personel erişimini kaldır — ${targetId}`,
      subtitle: 'Onaylı talebi icra eder. Yalnız bir kez harcanabilir.',
      labelledBy: (targetId: string) => `${targetId} personel değişikliğini icra et`,
      grantSubmit: 'Erişim ver',
      revokeSubmit: 'Erişimi kaldır',
    },
  },
  accessLog: {
    summaryAria: 'Erişim günlüğü özeti',
    contextAria: 'Erişim bağlamı',
    summary: {
      sensitiveReads: { label: 'Hassas okumalar', support: 'Yüklü denetim penceresi' },
      readsToday: { label: 'Bugünkü okumalar', support: 'Yerel gece yarısından beri' },
      activeStaff: { label: 'Aktif personel', support: 'Farklı personel kimlikleri' },
      customersViewed: {
        label: 'Görüntülenen müşteriler',
        support: (n: number) => `${n} inceleme sinyali`,
      },
    },
    context: {
      immutableLedger: { label: 'Değişmez defter', value: 'Salt okunur denetim izi' },
      mostReadScope: {
        label: 'En çok okunan kapsam',
        emptyValue: 'Henüz okuma yok',
        support: (n: number) => `yüklü pencerede ${n} etkinlik`,
        emptySupport: 'İlk etkinlik bekleniyor',
      },
      mostViewedCustomer: {
        label: 'En çok görüntülenen müşteri',
        emptyValue: 'Henüz müşteri yok',
        support: (n: number) => `${n} hassas okuma`,
        emptySupport: 'İlk etkinlik bekleniyor',
      },
    },
    ledger: {
      title: 'Hassas okuma defteri',
      resultsBadge: (n: number) => `${n} sonuç`,
      subtitle: 'Kimin müşteri verisini açtığını, ne gördüğünü ve ne zaman olduğunu incele.',
      reset: 'Sıfırla',
      exportCsv: 'CSV dışa aktar',
      focusAria: 'İnceleme odağı',
      allReads: 'Tüm okumalar',
      reviewSignals: 'İnceleme sinyalleri',
      routineReads: 'Rutin okumalar',
      searchLabel: 'Denetim izinde ara',
      searchPlaceholder: 'Personel, müşteri, hedef veya IP',
      periodLabel: 'Dönem',
      periodOptions: { today: 'Bugün', d7: 'Son 7 gün', d30: 'Son 30 gün', all: 'Yüklü geçmiş' },
      scopeLabel: 'Kapsam',
      allScopes: 'Tüm kapsamlar',
      customerLabel: 'Müşteri',
      allCustomers: 'Tüm müşteriler',
      staffLabel: 'Personel',
      allStaff: 'Tüm personel',
      sortLabel: 'Sırala',
      sortOptions: { newest: 'Önce en yeni', oldest: 'Önce en eski', customer: 'Müşteri', staff: 'Personel üyesi' },
      emptyNoRows: 'Henüz hassas okuma kaydedilmedi.',
      emptyNoMatch: 'Bu filtrelerle eşleşen erişim etkinliği yok.',
      tableHeaders: {
        when: 'Ne zaman',
        staffMember: 'Personel üyesi',
        customer: 'Müşteri',
        scope: 'Kapsam',
        target: 'Hedef',
        reviewSignal: 'İnceleme sinyali',
        actions: 'Eylemler',
      },
      footerShowing: (visible: number, total: number) => `${total} yüklü etkinlikten ${visible} tanesi gösteriliyor`,
      footerAppendOnly: 'Yalnız-ekleme denetim verisi',
      viewEventFor: (org: string) => `${org} için erişim etkinliğini görüntüle`,
      viewEvent: 'Etkinliği görüntüle',
      openFor: (org: string) => `${org} aç`,
      openCustomer: 'Müşteriyi aç',
      viewEventAria: 'Erişim etkinliğini görüntüle',
      target: 'Hedef',
    },
    detail: {
      title: 'Hassas okuma etkinliği',
      subtitle: 'Değişmez personel erişim kaydı',
      labelledBy: 'Hassas okuma etkinliği detayları',
      readOnlyHeading: 'Salt okunur kanıt.',
      readOnlyBody: 'Bu kayıt kontrol düzleminden düzenlenemez veya silinemez.',
      fields: {
        eventId: 'Etkinlik kimliği',
        timestampUtc: 'Zaman damgası (UTC)',
        staffMember: 'Personel üyesi',
        customer: 'Müşteri',
        scope: 'Kapsam',
        targetId: 'Hedef kimliği',
        ipAddress: 'IP adresi',
        client: 'İstemci',
      },
      notSingleRecordRead: 'Tek kayıtlı bir okuma değil',
      reviewSignalNote: 'İnceleme sinyali bir iş yükü sezgiseldir, doğrulanmış bir güvenlik olayı değildir.',
      rawUserAgent: 'Ham user agent',
      openCustomer: 'Müşteriyi aç',
      close: 'Kapat',
    },
    wholeScope: 'Tüm kapsam',
    time: {
      justNow: 'Az önce',
      minutesAgo: (m: number) => `${m} dk önce`,
      hoursAgo: (h: number) => `${h} sa önce`,
      yesterday: 'Dün',
      daysAgo: (d: number) => `${d} gün önce`,
    },
    csvHeaders: {
      eventId: 'Etkinlik kimliği',
      timestampUtc: 'Zaman damgası UTC',
      staff: 'Personel',
      customer: 'Müşteri',
      scope: 'Kapsam',
      target: 'Hedef',
      ip: 'IP',
      client: 'İstemci',
      reviewSignal: 'İnceleme sinyali',
    },
  },
  actionLog: {
    focusOptions: { all: 'Tüm değişiklikler', entitlement: 'Tahsisler', billing: 'Faturalama' },
    summaryAria: 'Admin işlem özeti',
    contextAria: 'İşlem günlüğü bağlamı',
    summary: {
      recordedWrites: { label: 'Kayıtlı yazmalar', support: 'Yüklü değişmez pencere' },
      writesToday: { label: 'Bugünkü yazmalar', support: 'Yerel gece yarısından beri' },
      activeStaff: { label: 'Aktif personel', support: 'Farklı personel kimlikleri' },
      customersChanged: { label: 'Değişen müşteriler', support: 'Farklı kök çalışma alanları' },
    },
    context: {
      immutableLedger: { eyebrow: 'Değişmez defter', title: 'Yalnız personel yazmaları' },
      mostCommonAction: {
        eyebrow: 'En yaygın işlem',
        emptyTitle: 'Henüz işlem yok',
        support: 'Yüklü denetim penceresi genelinde',
        emptySupport: 'İlk personel yazması bekleniyor',
      },
      mostChangedCustomer: {
        eyebrow: 'En çok değişen müşteri',
        emptyTitle: 'Henüz müşteri yok',
        support: 'Bu penceredeki en yüksek yazma sayısı',
        emptySupport: 'Kayıtlı müşteri değişikliği yok',
      },
    },
    ledger: {
      title: 'Admin işlem defteri',
      resultsBadge: (n: number) => `${n} sonuç`,
      subtitle: 'Her personel yazması bir eylemi yapan, müşteri, sebep ve öncesi/sonrası anlık görüntüsü taşır.',
      resetFilters: 'Filtreleri sıfırla',
      exportCsv: 'CSV dışa aktar',
      categoryAria: 'İşlem kategorisi',
      searchLabel: 'Defterde ara',
      searchPlaceholder: 'Personel, müşteri, işlem, hedef veya sebep',
      periodLabel: 'Kayıt dönemi',
      periodOptions: { today: 'Bugün', d7: 'Son 7 gün', d30: 'Son 30 gün', all: 'Tüm yüklü' },
      sortLabel: 'Sırala',
      sortOptions: { newest: 'Önce en yeni', oldest: 'Önce en eski', customer: 'Müşteri adı', staff: 'Personel kimliği' },
      emptyNoRows: 'Henüz personel yazması kaydedilmedi.',
      emptyNoMatch: 'Bu filtrelerle eşleşen işlem yok.',
      tableHeaders: { recorded: 'Kaydedildi', staff: 'Personel', customer: 'Müşteri', action: 'İşlem', reason: 'Sebep', actionsAria: 'Eylemler' },
      reasonRequired: 'Sebep zorunlu',
      viewChange: 'Değişikliği görüntüle',
      changedBy: 'Değiştiren',
      recorded: 'Kaydedildi',
      viewChangeFor: (org: string) => `${org} için değişikliği görüntüle`,
      openFor: (org: string) => `${org} aç`,
    },
    detail: {
      subtitle: 'Saklanan öncesi ve sonrası anlık görüntüleriyle değişmez personel yazması.',
      labelledBy: (id: string) => `${id} admin işlemi`,
      fields: { recorded: 'Kaydedildi', staff: 'Personel', customer: 'Müşteri', targetId: 'Hedef kimliği' },
      organizationFallback: 'Organizasyon',
      recordedReason: 'Kaydedilen sebep',
      changedFields: 'Değişen alanlar',
      differences: (n: number) => `${n} fark`,
      noDifferences: 'Saklanan anlık görüntülerde üst düzey alan farkı yok.',
      ipAddress: 'IP adresi',
      client: 'İstemci',
      actionKey: 'İşlem anahtarı',
      showRawSnapshots: 'Ham anlık görüntüleri göster',
      before: 'Önce',
      after: 'Sonra',
      close: 'Kapat',
      openCustomerDetail: 'Müşteri detayını aç',
    },
    change: { field: 'Alan', previous: 'Önceki', newValue: 'Yeni değer' },
    customerWorkspace: 'Müşteri çalışma alanı',
    time: { recently: 'Yakın zamanda', minutesAgo: (m: number) => `${m} dk önce`, hoursAgo: (h: number) => `${h} sa önce`, daysAgo: (d: number) => `${d} gün önce` },
    client: { notRecorded: 'Kayıt yok', other: 'Diğer istemci' },
    csvHeaders: {
      eventId: 'Etkinlik kimliği',
      recorded: 'Kaydedildi',
      staff: 'Personel',
      customer: 'Müşteri',
      action: 'İşlem',
      targetId: 'Hedef kimliği',
      changedFields: 'Değişen alanlar',
      reason: 'Sebep',
      ip: 'IP',
      client: 'İstemci',
    },
  },
};

export const adminSecurity = { en, tr } as const;

export type AdminSecurityDict = Mirror<typeof en>;
