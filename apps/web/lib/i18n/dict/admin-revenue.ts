import type { Mirror } from '../types';

/**
 * Gelir sözlüğü (Task 7) — beş çağrı yeri: `currencyControl`/`receivables`/
 * `seatLedger`/`revenueOverview`/`pricingVersions` → RevenueOperationsViews.tsx
 * (dört görünüm + paylaşılan para birimi seçici), `invoiceWorkbench` →
 * InvoiceWorkbenchView.tsx (ana fatura defteri ızgarası + önizleme diyaloğu),
 * `invoiceCreateDialog` → orgs/[id]/InvoiceCreateDialog.tsx, `invoiceRowActions`
 * → orgs/[id]/InvoiceRowActions.tsx, `paymentMethod` → ikisi ARASINDA paylaşılan
 * küçük bir tablo (ödeme yöntemi seçenekleri hem kesme formunda hem önizleme
 * salt-okunur alanında görünür), `invoicesPage` → admin/invoices/page.tsx'in
 * AdminPageHeader PROP'ları DIŞINDAKİ (Task 12 kapsamı) tek satırlık kroması.
 *
 * `currencyControl.ariaLabel` ("Currency ledger") InvoiceWorkbenchView'in
 * kendi para birimi düğme grubunda da BİREBİR aynı metin — orada yeniden
 * yazılmaz, aynı üst-seviye anahtar doğrudan kullanılır.
 *
 * Para tutarları (`formatMoney`) ve fatura/organizasyon/ödeme referansı gibi
 * VERİ hiçbir zaman buraya girmez — repo kuralı: para her zaman 'en'.
 *
 * Durum KODLARI (`row.status` due/paid/void, `entitlementState`,
 * `priceVersion`) `AdminStatusBadge`/ham `.replace(/_/g,' ')` ile OLDUĞU GİBİ
 * basılır — VERİ, sözlüğe girmez (Task 5 emsali, CustomerTable/TrialsEntitlements
 * View ile tutarlı). Yalnız İNSAN-OKUR sentez etiketler (ör. hesaplanan
 * "overdue" rozeti, "Current"/"Grandfathered" atama rozetleri) çevrilir —
 * bunlar ham veri değil, bu görünümün kendi ürettiği metindir.
 *
 * `invoiceWorkbench.datum` küçük paylaşılan bir etiket tablosu: "Amount"/
 * "Seats" tablo başlığı ile mobil/önizleme `PreviewDatum` etiketleri
 * bayt-bayt aynı İngilizce kaynağa sahip olduğu için (karşılaştırıldı) TEK
 * anahtardan okunur — kasıtlı tekrar kullanım, yeni bir anahtar İCAT
 * edilmedi. `distribution.current`/`distribution.grandfathered` da aynı
 * gerekçeyle `PricingVersionsView` içindeki dört rozet/KPI-etiket
 * konumunun hepsinde paylaşılır.
 *
 * Sözlük bildiriminde `Record<string, …>` cast'i YOK: `receivables.aging.
 * buckets` (gün-aralığı anahtarları '1-7'/'8-30'/'31+') dinamik anahtarla
 * `RevenueOperationsViews.tsx`'te okunur ama cast SADECE çağrı yerinde
 * yaşar (admin-product `templateMeta` emsali) — `Mirror<T>` burada da
 * en/tr anahtar paritesini derlemede zorunlu kılar.
 */

const en = {
  currencyControl: {
    ariaLabel: 'Currency ledger',
    singleLedger: (currency: string) => `${currency} ledger`,
  },
  receivables: {
    kpis: {
      outstanding: { label: 'Outstanding', support: (n: number) => `${n} open invoices` },
      overdue: { label: 'Overdue', support: (n: number) => `${n} need follow-up` },
      dueSoon: { label: 'Due within 7 days', support: 'Upcoming collection window' },
      collectionRate: {
        label: 'Collection rate',
        pct: (n: number) => `${n}%`,
        support: (money: string) => `${money} collected`,
      },
    },
    aging: {
      title: 'Aging exposure',
      support: 'Open balance grouped by days past due.',
      buckets: { current: 'Current', '1-7': '1–7 days', '8-30': '8–30 days', '31+': '31+ days' },
    },
    collectionDesk: {
      title: 'Collection desk',
      support: 'Prioritized by overdue age, then balance.',
      linkLabel: 'Invoice ledger',
      daysOverdue: (n: number) => `${n}d overdue`,
      dueToday: 'Due today',
      dueIn: (n: number | null) => `Due in ${n}d`,
      emptyTitle: 'Collection queue clear',
      emptyBody: (currency: string) => `No open ${currency} invoices require collection work.`,
    },
    notice: {
      title: 'Authoritative balance',
      body: 'Amounts come from invoice records. Currencies stay in separate ledgers and are never summed across USD and EUR.',
    },
  },
  seatLedger: {
    kpis: {
      activeSeats: { label: 'Active seats', support: 'Current billing footprint' },
      entitledSeats: { label: 'Entitled seats', support: 'Contracted capacity' },
      overage: { label: 'Overage', support: (n: number) => `${n} customer exceptions` },
      utilization: { label: 'Utilization', pct: (n: number) => `${n}%`, support: 'Across root billing orgs' },
    },
    capacity: {
      title: 'Capacity distribution',
      support: 'Customer count by current utilization.',
      donutLabels: ['Over capacity', '80–100%', 'Below 80%'] as readonly string[],
      donutCenter: 'Customers',
    },
    utilizationCard: {
      title: 'Seat utilization',
      support: 'Highest utilization first; overages stay visible at the top.',
      activeOfEntitled: (active: number, entitled: number) => `${active} active / ${entitled} entitled`,
      over: (n: number) => `${n} over`,
      available: (n: number) => `${n} available`,
    },
    notice: {
      title: 'Snapshot, not history',
      body: 'The current schema stores active and entitled seats, but not an append-only seat movement ledger. This screen reports the current authoritative position without inventing historical movements.',
    },
  },
  revenueOverview: {
    kpis: {
      billed: { label: 'Billed', support: (n: number) => `${n} billing customers` },
      collected: { label: 'Collected', support: (pct: number) => `${pct}% realization` },
      outstanding: { label: 'Outstanding', support: (n: number) => `${n} open records` },
      overdue: { label: 'Overdue', support: (n: number) => `${n} collection risks` },
    },
    movement: {
      title: 'Six-month billing movement',
      support: 'Issued versus collected invoice value by issue month.',
      seriesName: 'Billed',
      legendBilled: 'Billed',
      collectedTotal: (money: string) => `Collected total: ${money}`,
    },
    mix: {
      title: 'Invoice mix',
      support: 'Record status in the selected ledger.',
      donutLabels: ['Paid', 'Due', 'Void'] as readonly string[],
      donutCenter: 'Invoices',
    },
    relationships: {
      title: 'Largest billing relationships',
      support: 'Billed value by root organization in the selected currency.',
      openInvoices: 'Open invoices',
      activeSeats: (n: number) => `${n} active seats`,
    },
    notice: {
      title: 'Ledger-scoped overview',
      body: 'This overview uses recorded invoices only. It does not infer MRR, ARR or forecast revenue from seats, and each currency remains isolated.',
    },
  },
  pricingVersions: {
    preview: {
      title: 'Preview data',
      body: 'Representative version assignments are shown for layout review only.',
    },
    kpis: {
      currentCoverage: {
        label: 'Current coverage',
        pct: (n: number) => `${n}%`,
        support: (current: number, total: number) => `${current} of ${total} customers`,
      },
      grandfathered: { support: (n: number) => `${n} entitled seats` },
      storedVersions: { label: 'Stored versions', support: 'Distinct assignment keys' },
      liveListPrice: { label: 'Live list price', support: 'Per active sender / year' },
    },
    policyCard: {
      badge: 'LIVE POLICY',
      title: 'Annual sender pricing',
      body: 'The policy applied to newly created customer workspaces.',
      perSenderYear: 'per active sender / year',
      minimum: 'Minimum',
      minimumValue: (n: number) => `${n} sender`,
      trial: 'Trial',
      trialValue: (days: number, seats: number) => `${days} days · ${seats} seats`,
      cardRequired: 'Card required',
      yes: 'Yes',
      no: 'No',
      freePlan: 'Free plan',
      available: 'Available',
      notOffered: 'Not offered',
      versionKey: 'VERSION KEY',
    },
    distribution: {
      title: 'Version distribution',
      support: 'Customer and entitlement exposure by the stored organization version.',
      current: 'Current',
      grandfathered: 'Grandfathered',
      donutCenter: 'Customers',
      entitledActive: (entitled: number, active: number) => `${entitled} entitled · ${active} active`,
      activeAccounts: (n: number) => `${n} active accounts`,
      customersWord: 'customers',
      currentPolicy: 'Current policy',
    },
    assignments: {
      title: 'Customer assignments',
      support: 'Grandfathered records are placed first so pricing exceptions remain reviewable.',
      needsContext: (n: number) => `${n} need policy context`,
      headers: {
        customer: 'Customer',
        versionAssignment: 'Version assignment',
        entitlement: 'Entitlement',
        state: 'State',
        customerSince: 'Customer since',
        open: 'Open',
      },
      assignmentIndex: (n: string) => `Assignment ${n}`,
      activeEntitled: 'active / entitled',
      activeEntitledCap: 'Active / entitled',
      storedVersion: 'Stored version',
      customerSincePrefix: (date: string) => `Customer since ${date}`,
      openAria: (name: string) => `Open ${name}`,
    },
    notices: {
      legacyTitle: 'Legacy price amounts are not inferred',
      legacyBody:
        'A stored version key proves which list a customer belongs to, but the current schema does not encode historical unit prices. Invoice amounts remain the financial source of truth.',
      boundaryTitle: 'Change boundary',
      boundaryBody:
        'Changing the live PRICING constant affects new assignments. Existing organizations remain on their stored version until an audited entitlement workflow updates them.',
    },
  },
  invoiceWorkbench: {
    focusOptions: {
      all: 'All invoices',
      due: 'Outstanding',
      overdue: 'Overdue',
      paid: 'Paid',
      void: 'Void',
    },
    summary: {
      billed: { label: 'Billed', support: (n: number) => `${n} recorded invoices` },
      collected: { label: 'Collected', support: (pct: number) => `${pct}% of billed amount` },
      outstanding: { label: 'Outstanding', support: (n: number) => `${n} billing customers` },
      overdue: { label: 'Overdue', support: (n: number) => `${n} need attention` },
    },
    header: {
      summaryAria: 'Invoice summary',
      title: 'Invoice ledger',
      results: (n: number) => `${n} ${n === 1 ? 'result' : 'results'}`,
      subtitle: 'Authoritative amounts only. Currency ledgers are never added together.',
      resetFilters: 'Reset filters',
      focusAria: 'Invoice focus',
    },
    search: {
      label: 'Search ledger',
      placeholder: 'Invoice #, customer or payment reference',
    },
    period: {
      label: 'Issued period',
      allTime: 'All time',
      last30: 'Last 30 days',
      last90: 'Last 90 days',
      thisYear: 'This year',
    },
    sortBy: {
      label: 'Sort by',
      attention: 'Attention first',
      newestIssued: 'Newest issued',
      dueDate: 'Due date',
      highestAmount: 'Highest amount',
    },
    empty: {
      noInvoices: 'No invoices have been issued yet.',
      noMatches: 'No invoice matches these filters.',
    },
    table: {
      headers: { invoice: 'Invoice', customer: 'Customer', billingWindow: 'Billing window', status: 'Status', actions: 'Actions' },
      issued: (date: string) => `Issued ${date}`,
      billingOrg: 'Billing organization',
      balance: (money: string) => `${money} balance`,
      noBalance: 'No balance',
      notSet: 'Not set',
    },
    datum: {
      amount: 'Amount',
      seats: 'Seats',
      activeSeatsSmall: 'active seats',
      issued: 'Issued',
      due: 'Due',
      activeSeats: 'Active seats',
      currency: 'Currency',
    },
    mobile: {
      previewInvoice: 'Preview invoice',
    },
    timeline: {
      voided: 'Voided record · no active collection window',
      noDueDate: 'No due date',
      paid: (date: string) => `Paid ${date}`,
      overdueDays: (n: number) => `${n}d overdue`,
      remainingDays: (n: number) => `${n}d remaining`,
      due: (date: string) => `Due ${date}`,
      windowAria: (number: string) => `${number} billing window`,
    },
    status: {
      overdue: 'overdue',
    },
    actions: {
      previewAria: (number: string) => `Preview ${number}`,
      openAria: (orgName: string) => `Open ${orgName}`,
    },
    preview: {
      titlePrefix: (number: string) => `Invoice ${number}`,
      subtitle: 'Read-only commercial record. The stored amount remains the source of truth.',
      labelledBy: (number: string) => `Invoice preview for ${number}`,
      recordTitle: 'Mailmyra invoice record',
      recordSubtitle: 'Annual active-sender billing',
      authoritativeTotal: 'Authoritative total',
      billTo: 'Bill to',
      openCustomerRecord: 'Open customer record',
      tableHeaders: { billingItem: 'Billing item', quantity: 'Quantity', recordedTotal: 'Recorded total' },
      lineItem: 'Active sender entitlement',
      lineItemDetail: 'Annual Mailmyra workspace billing',
      amountDue: 'Amount due',
      internalNote: 'Internal note',
      paymentMethodLabel: 'Payment method',
      referenceLabel: 'Reference',
      openCustomerDetail: 'Open customer detail',
    },
  },
  invoiceCreateDialog: {
    newInvoice: 'New invoice',
    dialogTitle: 'Issue invoice',
    subtitle: 'The amount is authoritative — the seat suggestion is only a starting point.',
    fields: {
      number: 'Number',
      dueDate: 'Due date',
      seats: 'Seats',
      amountLabel: 'Amount (USD)',
      suggestedPrefix: (suggested: string) => `— suggested ${suggested}`,
      note: 'Note on the invoice',
      notePlaceholder: 'Billing period, bank details…',
      reasonPlaceholder: 'Internal — action log only',
    },
    toastIssued: (number: string) => `Invoice ${number} issued.`,
  },
  invoiceRowActions: {
    actionsAria: (number: string) => `Actions for ${number}`,
    menu: {
      recordPayment: 'Record payment',
      voidInvoice: 'Void invoice',
      reopenAsDue: 'Reopen as due',
    },
    paidDialog: {
      titlePrefix: (number: string) => `Record payment — ${number}`,
      subtitle: 'This is a bookkeeping entry: when, how, and under which reference.',
      labelledBy: (number: string) => `Record payment for ${number}`,
      fields: {
        paidOn: 'Paid on',
        method: 'Method',
        reference: 'Bank / payment reference',
        reasonPlaceholder: 'e.g. transfer received, receipt attached to email',
      },
      toast: (number: string) => `${number} marked paid.`,
    },
    statusDialog: {
      voidTitle: (number: string) => `Void ${number}?`,
      reopenTitle: (number: string) => `Reopen ${number}?`,
      voidSubtitle: 'The invoice is kept, never deleted. Any payment record on it is cleared.',
      reopenSubtitle: 'The invoice returns to due; its payment record is cleared.',
      voidLabelledBy: (number: string) => `Void ${number}`,
      reopenLabelledBy: (number: string) => `Reopen ${number}`,
      reopenSubmit: 'Reopen',
      voidToast: (number: string) => `${number} voided.`,
      reopenToast: (number: string) => `${number} reopened as due.`,
    },
  },
  paymentMethod: {
    bankTransfer: 'Bank transfer',
    cash: 'Cash',
    other: 'Other',
  },
  /**
   * Task 12 — beş sayfanın (`revenue/{overview,receivables,seats,pricing-
   * versions}/page.tsx` + `invoices/page.tsx`) `AdminPageHeader` prop'ları +
   * sekme başlıkları. `title` her beşinde de `adminNav[lang].menu.
   * revenueOverview/revenueInvoices/revenueReceivables/revenueSeatLedger/
   * revenuePricingVersions` ile bayt-bayt AYNI — burada tekrar yazılmaz.
   * Eski `invoicesPage` (Task 7'nin tek satırlık kroması) bu bloğa
   * TAŞINDI — tek çağrı yeri (`invoices/page.tsx`) güncellendi, ayrı
   * anahtar tutmanın gerekçesi kalmadı.
   */
  pages: {
    overview: {
      crumbLeaf: 'Overview',
      support: 'Read recorded billing performance by currency, customer and invoice status.',
    },
    invoices: {
      issueFromCustomer: 'Issue from customer',
      support: 'Track authoritative billing records, collection windows and overdue balances by currency.',
    },
    receivables: {
      support: 'Prioritize open balances by due date and aging without mixing currency ledgers.',
    },
    seatLedger: {
      support: 'Compare authoritative active seats with the entitlement assigned to each billing organization.',
    },
    pricingVersions: {
      support: 'Review the live sender policy, grandfathered customers and the exact version stored on every billing organization.',
    },
  },
} as const;

const tr: Mirror<typeof en> = {
  currencyControl: {
    ariaLabel: 'Para birimi defteri',
    singleLedger: (currency: string) => `${currency} defteri`,
  },
  receivables: {
    kpis: {
      outstanding: { label: 'Bekleyen bakiye', support: (n: number) => `${n} açık fatura` },
      overdue: { label: 'Gecikmiş', support: (n: number) => `${n} tanesi takip istiyor` },
      dueSoon: { label: '7 gün içinde vadesi dolan', support: 'Yaklaşan tahsilat penceresi' },
      collectionRate: {
        label: 'Tahsilat oranı',
        pct: (n: number) => `%${n}`,
        support: (money: string) => `${money} tahsil edildi`,
      },
    },
    aging: {
      title: 'Yaşlandırma dağılımı',
      support: 'Açık bakiye, vadesi geçen gün sayısına göre gruplanır.',
      buckets: { current: 'Güncel', '1-7': '1–7 gün', '8-30': '8–30 gün', '31+': '31+ gün' },
    },
    collectionDesk: {
      title: 'Tahsilat masası',
      support: 'Önce gecikme süresine, sonra bakiyeye göre sıralanır.',
      linkLabel: 'Fatura defteri',
      daysOverdue: (n: number) => `${n} gün gecikti`,
      dueToday: 'Bugün vadesi doluyor',
      dueIn: (n: number | null) => `${n} gün içinde vadesi doluyor`,
      emptyTitle: 'Tahsilat kuyruğu temiz',
      emptyBody: (currency: string) => `Tahsilat gerektiren açık ${currency} faturası yok.`,
    },
    notice: {
      title: 'Yetkili bakiye',
      body: 'Tutarlar fatura kayıtlarından gelir. Para birimleri ayrı defterlerde kalır ve USD ile EUR asla toplanmaz.',
    },
  },
  seatLedger: {
    kpis: {
      activeSeats: { label: 'Aktif koltuklar', support: 'Güncel faturalama ayak izi' },
      entitledSeats: { label: 'Tahsisli koltuklar', support: 'Sözleşmeli kapasite' },
      overage: { label: 'Aşım', support: (n: number) => `${n} müşteri istisnası` },
      utilization: { label: 'Kullanım', pct: (n: number) => `%${n}`, support: 'Kök faturalama organizasyonları genelinde' },
    },
    capacity: {
      title: 'Kapasite dağılımı',
      support: 'Güncel kullanıma göre müşteri sayısı.',
      donutLabels: ['Kapasite üzeri', '%80–100', '%80 altı'],
      donutCenter: 'Müşteriler',
    },
    utilizationCard: {
      title: 'Koltuk kullanımı',
      support: 'Önce en yüksek kullanım; aşımlar üstte görünür kalır.',
      activeOfEntitled: (active: number, entitled: number) => `${active} aktif / ${entitled} tahsisli`,
      over: (n: number) => `${n} aşım`,
      available: (n: number) => `${n} müsait`,
    },
    notice: {
      title: 'Anlık görüntü, geçmiş değil',
      body: 'Güncel şema aktif ve tahsisli koltukları saklar, ancak yalnız-ekleme koltuk hareket defteri tutmaz. Bu ekran, geçmiş hareketler uydurmadan güncel yetkili konumu bildirir.',
    },
  },
  revenueOverview: {
    kpis: {
      billed: { label: 'Faturalanan', support: (n: number) => `${n} faturalama müşterisi` },
      collected: { label: 'Tahsil edilen', support: (pct: number) => `%${pct} gerçekleşme` },
      outstanding: { label: 'Bekleyen bakiye', support: (n: number) => `${n} açık kayıt` },
      overdue: { label: 'Gecikmiş', support: (n: number) => `${n} tahsilat riski` },
    },
    movement: {
      title: 'Altı aylık faturalama hareketi',
      support: 'Kesim ayına göre kesilen ve tahsil edilen fatura tutarı.',
      seriesName: 'Faturalanan',
      legendBilled: 'Faturalanan',
      collectedTotal: (money: string) => `Toplam tahsilat: ${money}`,
    },
    mix: {
      title: 'Fatura dağılımı',
      support: 'Seçili defterdeki kayıt durumu.',
      donutLabels: ['Ödendi', 'Vadeli', 'İptal'],
      donutCenter: 'Faturalar',
    },
    relationships: {
      title: 'En büyük faturalama ilişkileri',
      support: 'Seçili para biriminde kök organizasyona göre faturalanan tutar.',
      openInvoices: 'Faturaları aç',
      activeSeats: (n: number) => `${n} aktif koltuk`,
    },
    notice: {
      title: 'Deftere özgü görünüm',
      body: 'Bu görünüm yalnız kayıtlı faturaları kullanır. Koltuklardan MRR, ARR çıkarmaz veya gelir tahmini yapmaz; her para birimi izole kalır.',
    },
  },
  pricingVersions: {
    preview: {
      title: 'Önizleme verisi',
      body: 'Yerleşim incelemesi için yalnız temsili sürüm atamaları gösterilir.',
    },
    kpis: {
      currentCoverage: {
        label: 'Güncel kapsam',
        pct: (n: number) => `%${n}`,
        support: (current: number, total: number) => `${total} müşteriden ${current} tanesi`,
      },
      grandfathered: { support: (n: number) => `${n} tahsisli koltuk` },
      storedVersions: { label: 'Kayıtlı sürümler', support: 'Farklı atama anahtarları' },
      liveListPrice: { label: 'Canlı liste fiyatı', support: 'Aktif gönderici başına / yıl' },
    },
    policyCard: {
      badge: 'CANLI POLİTİKA',
      title: 'Yıllık gönderici fiyatlandırması',
      body: 'Yeni oluşturulan müşteri çalışma alanlarına uygulanan politika.',
      perSenderYear: 'aktif gönderici başına / yıl',
      minimum: 'Minimum',
      minimumValue: (n: number) => `${n} gönderici`,
      trial: 'Deneme',
      trialValue: (days: number, seats: number) => `${days} gün · ${seats} koltuk`,
      cardRequired: 'Kart gerekli',
      yes: 'Evet',
      no: 'Hayır',
      freePlan: 'Ücretsiz plan',
      available: 'Var',
      notOffered: 'Yok',
      versionKey: 'SÜRÜM ANAHTARI',
    },
    distribution: {
      title: 'Sürüm dağılımı',
      support: 'Kayıtlı organizasyon sürümüne göre müşteri ve tahsis maruziyeti.',
      current: 'Güncel',
      grandfathered: 'Kazanılmış hak',
      donutCenter: 'Müşteriler',
      entitledActive: (entitled: number, active: number) => `${entitled} tahsisli · ${active} aktif`,
      activeAccounts: (n: number) => `${n} aktif hesap`,
      customersWord: 'müşteri',
      currentPolicy: 'Güncel politika',
    },
    assignments: {
      title: 'Müşteri atamaları',
      support: 'Fiyatlandırma istisnaları incelenebilir kalsın diye kazanılmış hak kayıtları önce gelir.',
      needsContext: (n: number) => `${n} tanesi politika bağlamı istiyor`,
      headers: {
        customer: 'Müşteri',
        versionAssignment: 'Sürüm ataması',
        entitlement: 'Tahsis',
        state: 'Durum',
        customerSince: 'Müşteri olma tarihi',
        open: 'Aç',
      },
      assignmentIndex: (n: string) => `Atama ${n}`,
      activeEntitled: 'aktif / tahsisli',
      activeEntitledCap: 'Aktif / tahsisli',
      storedVersion: 'Kayıtlı sürüm',
      customerSincePrefix: (date: string) => `${date} tarihinden beri müşteri`,
      openAria: (name: string) => `${name} aç`,
    },
    notices: {
      legacyTitle: 'Eski fiyat tutarları çıkarılmaz',
      legacyBody:
        'Kayıtlı bir sürüm anahtarı, müşterinin hangi listeye ait olduğunu kanıtlar; ancak güncel şema geçmiş birim fiyatlarını kodlamaz. Fatura tutarları mali gerçeğin tek kaynağı olmaya devam eder.',
      boundaryTitle: 'Değişiklik sınırı',
      boundaryBody:
        'Canlı PRICING sabitini değiştirmek yeni atamaları etkiler. Var olan organizasyonlar, denetimli bir tahsis iş akışı onları güncelleyene kadar kayıtlı sürümlerinde kalır.',
    },
  },
  invoiceWorkbench: {
    focusOptions: {
      all: 'Tüm faturalar',
      due: 'Bekleyen',
      overdue: 'Gecikmiş',
      paid: 'Ödendi',
      void: 'İptal',
    },
    summary: {
      billed: { label: 'Faturalanan', support: (n: number) => `${n} kayıtlı fatura` },
      collected: { label: 'Tahsil edilen', support: (pct: number) => `Faturalanan tutarın %${pct}'i` },
      outstanding: { label: 'Bekleyen bakiye', support: (n: number) => `${n} faturalama müşterisi` },
      overdue: { label: 'Gecikmiş', support: (n: number) => `${n} tanesi dikkat istiyor` },
    },
    header: {
      summaryAria: 'Fatura özeti',
      title: 'Fatura defteri',
      results: (n: number) => `${n} sonuç`,
      subtitle: 'Yalnız yetkili tutarlar. Para birimi defterleri asla birbirine eklenmez.',
      resetFilters: 'Süzgeçleri sıfırla',
      focusAria: 'Fatura odağı',
    },
    search: {
      label: 'Defterde ara',
      placeholder: 'Fatura no, müşteri veya ödeme referansı',
    },
    period: {
      label: 'Kesim dönemi',
      allTime: 'Tüm zamanlar',
      last30: 'Son 30 gün',
      last90: 'Son 90 gün',
      thisYear: 'Bu yıl',
    },
    sortBy: {
      label: 'Sırala',
      attention: 'Önce dikkat gerekenler',
      newestIssued: 'En yeni kesilen',
      dueDate: 'Vade tarihi',
      highestAmount: 'En yüksek tutar',
    },
    empty: {
      noInvoices: 'Henüz fatura kesilmedi.',
      noMatches: 'Bu süzgeçlere uyan fatura yok.',
    },
    table: {
      headers: { invoice: 'Fatura', customer: 'Müşteri', billingWindow: 'Faturalama penceresi', status: 'Durum', actions: 'Eylemler' },
      issued: (date: string) => `${date} tarihinde kesildi`,
      billingOrg: 'Faturalama organizasyonu',
      balance: (money: string) => `${money} bakiye`,
      noBalance: 'Bakiye yok',
      notSet: 'Ayarlanmadı',
    },
    datum: {
      amount: 'Tutar',
      seats: 'Koltuklar',
      activeSeatsSmall: 'aktif koltuk',
      issued: 'Kesildi',
      due: 'Vade',
      activeSeats: 'Aktif koltuklar',
      currency: 'Para birimi',
    },
    mobile: {
      previewInvoice: 'Faturayı önizle',
    },
    timeline: {
      voided: 'İptal edilmiş kayıt · aktif tahsilat penceresi yok',
      noDueDate: 'Vade tarihi yok',
      paid: (date: string) => `${date} tarihinde ödendi`,
      overdueDays: (n: number) => `${n} gün gecikti`,
      remainingDays: (n: number) => `${n} gün kaldı`,
      due: (date: string) => `Vade ${date}`,
      windowAria: (number: string) => `${number} faturalama penceresi`,
    },
    status: {
      overdue: 'gecikmiş',
    },
    actions: {
      previewAria: (number: string) => `${number} önizle`,
      openAria: (orgName: string) => `${orgName} aç`,
    },
    preview: {
      titlePrefix: (number: string) => `Fatura ${number}`,
      subtitle: 'Salt okunur ticari kayıt. Kayıtlı tutar gerçeğin kaynağı olmaya devam eder.',
      labelledBy: (number: string) => `${number} için fatura önizlemesi`,
      recordTitle: 'Mailmyra fatura kaydı',
      recordSubtitle: 'Yıllık aktif-gönderici faturalaması',
      authoritativeTotal: 'Yetkili toplam',
      billTo: 'Fatura kime kesildi',
      openCustomerRecord: 'Müşteri kaydını aç',
      tableHeaders: { billingItem: 'Faturalama kalemi', quantity: 'Miktar', recordedTotal: 'Kayıtlı toplam' },
      lineItem: 'Aktif gönderici tahsisi',
      lineItemDetail: 'Yıllık Mailmyra çalışma alanı faturalaması',
      amountDue: 'Ödenecek tutar',
      internalNote: 'Dahili not',
      paymentMethodLabel: 'Ödeme yöntemi',
      referenceLabel: 'Referans',
      openCustomerDetail: 'Müşteri detayını aç',
    },
  },
  invoiceCreateDialog: {
    newInvoice: 'Yeni fatura',
    dialogTitle: 'Fatura kes',
    subtitle: 'Tutar yetkilidir — koltuk önerisi yalnız bir başlangıç noktasıdır.',
    fields: {
      number: 'Numara',
      dueDate: 'Vade tarihi',
      seats: 'Koltuklar',
      amountLabel: 'Tutar (USD)',
      suggestedPrefix: (suggested: string) => `— önerilen ${suggested}`,
      note: 'Fatura üzerindeki not',
      notePlaceholder: 'Faturalama dönemi, banka bilgileri…',
      reasonPlaceholder: 'Dahili — yalnız işlem günlüğü',
    },
    toastIssued: (number: string) => `${number} numaralı fatura kesildi.`,
  },
  invoiceRowActions: {
    actionsAria: (number: string) => `${number} için eylemler`,
    menu: {
      recordPayment: 'Ödeme kaydet',
      voidInvoice: 'Faturayı iptal et',
      reopenAsDue: 'Vadeli olarak yeniden aç',
    },
    paidDialog: {
      titlePrefix: (number: string) => `Ödeme kaydet — ${number}`,
      subtitle: 'Bu bir muhasebe kaydıdır: ne zaman, nasıl ve hangi referansla.',
      labelledBy: (number: string) => `${number} için ödeme kaydı`,
      fields: {
        paidOn: 'Ödeme tarihi',
        method: 'Yöntem',
        reference: 'Banka / ödeme referansı',
        reasonPlaceholder: 'ör. havale alındı, dekont e-postaya eklendi',
      },
      toast: (number: string) => `${number} ödendi olarak işaretlendi.`,
    },
    statusDialog: {
      voidTitle: (number: string) => `${number} iptal edilsin mi?`,
      reopenTitle: (number: string) => `${number} yeniden açılsın mı?`,
      voidSubtitle: 'Fatura saklanır, asla silinmez. Üzerindeki ödeme kaydı varsa temizlenir.',
      reopenSubtitle: 'Fatura vadeli durumuna döner; ödeme kaydı temizlenir.',
      voidLabelledBy: (number: string) => `${number} iptal et`,
      reopenLabelledBy: (number: string) => `${number} yeniden aç`,
      reopenSubmit: 'Yeniden aç',
      voidToast: (number: string) => `${number} iptal edildi.`,
      reopenToast: (number: string) => `${number} vadeli olarak yeniden açıldı.`,
    },
  },
  paymentMethod: {
    bankTransfer: 'Banka havalesi',
    cash: 'Nakit',
    other: 'Diğer',
  },
  pages: {
    overview: {
      crumbLeaf: 'Özet',
      support: 'Kayıtlı faturalama performansını para birimi, müşteri ve fatura durumuna göre oku.',
    },
    invoices: {
      issueFromCustomer: 'Müşteriden fatura kes',
      support: 'Yetkili faturalama kayıtlarını, tahsilat pencerelerini ve para birimine göre gecikmiş bakiyeleri takip et.',
    },
    receivables: {
      support: 'Para birimi defterlerini karıştırmadan açık bakiyeleri vade tarihine ve yaşlanmaya göre önceliklendir.',
    },
    seatLedger: {
      support: 'Yetkili aktif koltukları her faturalama organizasyonuna atanan tahsisle karşılaştır.',
    },
    pricingVersions: {
      support: 'Canlı gönderici politikasını, kazanılmış hak sahibi müşterileri ve her faturalama organizasyonunda saklanan tam sürümü incele.',
    },
  },
};

export const adminRevenue = { en, tr } as const;

/** İç iç geçmiş görünüm dosyalarındaki alt bileşenler bu geniş tipi alır — bkz. admin-product.ts `AdminProductDict` emsali. */
export type AdminRevenueDict = Mirror<typeof en>;
