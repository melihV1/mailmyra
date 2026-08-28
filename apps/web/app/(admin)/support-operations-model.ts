import type { Lang, Mirror } from '../../lib/i18n/types';
import type { ProductAnalyticsSnapshot } from './product-analytics-model';

const DAY = 86_400_000;

export type SupportCaseStatus = 'open' | 'waiting_customer' | 'escalated' | 'resolved';
export type SupportCasePriority = 'urgent' | 'high' | 'normal' | 'low';

export type SupportCaseRow = {
  id: string;
  reference: string;
  subject: string;
  customer: string;
  requester: string;
  channel: 'email' | 'form' | 'staff';
  category: 'billing' | 'builder' | 'export' | 'access' | 'account';
  priority: SupportCasePriority;
  status: SupportCaseStatus;
  owner: string | null;
  createdAt: string;
  updatedAt: string;
  slaDueAt: string;
  summary: string;
};

export type OnboardingRow = {
  id: string;
  name: string;
  ageDays: number;
  stage: 'workspace' | 'identity' | 'design' | 'publish' | 'export';
  stageIndex: number;
  progress: number;
  tone: 'secondary' | 'primary' | 'info' | 'warning' | 'success';
  nextStep: string;
  ownerSignal: string;
};

export type SupportPlaybook = {
  id: string;
  title: string;
  category: 'Incident' | 'Billing' | 'Onboarding' | 'Account';
  trigger: string;
  outcome: string;
  steps: readonly string[];
  tone: 'primary' | 'info' | 'warning' | 'success';
  icon: string;
};

/**
 * `SUPPORT_PLAYBOOKS` KASITLI olarak dile göre çevrilmedi (dalga-sonu cila,
 * `slaState()`/`onboardingRows()` fixinin YANINDA — bkz. altındaki bu iki
 * fonksiyon; onlar artık `lang`e göre çeviriyor). Bu içerik personelin takip
 * ettiği KÜRATÖRLÜ süreç metni — tetikleyici/sonuç/adım cümleleri UI kopyası
 * değil, `reporting-model.ts`teki `REPORT_LIBRARY[].name` ve task-9'un
 * öncelik/kategori ham değerleri emsali gibi bilinçli olarak İngilizce
 * kalan operasyonel içerik. Panel personeli zaten iki dilli çalışıyor
 * (staff hesapları), playbook adım metni müşteriye hiç gösterilmiyor —
 * çevirisi CLAUDE.md §YAPILMAYACAKLAR kapsam disiplini gereği bu dalganın
 * işi değil (`guides-content.en.ts`/`.tr.ts` ayrımının aksine: rehberler
 * müşteriye dönük SEO/destek içeriği olduğu için tam çevrildi, playbook'lar
 * iç personel süreç dokümanı olduğu için değil).
 */
export const SUPPORT_PLAYBOOKS: readonly SupportPlaybook[] = [
  { id: 'export-failure', title: 'Export failure triage', category: 'Incident', trigger: 'Customer cannot complete or download an export.', outcome: 'Evidence captured, customer unblocked or engineering handoff prepared.', steps: ['Confirm affected sender and export format', 'Check entitlement and active-seat state', 'Capture timestamp and reproducible path', 'Escalate without requesting customer signature content'], tone: 'warning', icon: 'tabler-file-alert' },
  { id: 'invoice-dispute', title: 'Invoice dispute review', category: 'Billing', trigger: 'Customer disputes seats, amount or payment state.', outcome: 'Authoritative invoice and entitlement records reconciled.', steps: ['Open the billing root organization', 'Compare invoice snapshot with active seats', 'Record the customer-provided payment reference', 'Route any adjustment through the approval log'], tone: 'primary', icon: 'tabler-receipt-refund' },
  { id: 'first-export', title: 'First export assisted setup', category: 'Onboarding', trigger: 'Workspace has a design but no export evidence.', outcome: 'A client-safe export is produced without staff editing customer content.', steps: ['Confirm a signature and sender assignment exist', 'Review preview and compatibility guidance', 'Ask the customer to trigger their own export', 'Confirm evidence event and share install guide'], tone: 'success', icon: 'tabler-rocket' },
  { id: 'account-recovery', title: 'Account recovery safeguard', category: 'Account', trigger: 'A user cannot access the workspace or requests an identity change.', outcome: 'Identity verified and access restored through an auditable path.', steps: ['Verify requester against existing workspace identity', 'Never request passwords or session tokens', 'Use the supported recovery flow', 'Record staff access and the final outcome'], tone: 'info', icon: 'tabler-user-shield' },
];

export function supportCaseFacts(rows: SupportCaseRow[], now: number) {
  const active = rows.filter((row) => row.status !== 'resolved');
  const breached = active.filter((row) => new Date(row.slaDueAt).getTime() < now);
  const dueSoon = active.filter((row) => {
    const remaining = new Date(row.slaDueAt).getTime() - now;
    return remaining >= 0 && remaining <= 4 * 3_600_000;
  });
  return {
    active: active.length,
    breached: breached.length,
    dueSoon: dueSoon.length,
    unassigned: active.filter((row) => !row.owner).length,
    waiting: active.filter((row) => row.status === 'waiting_customer').length,
  };
}

export function sortSupportQueue(rows: SupportCaseRow[]) {
  const priority = { urgent: 0, high: 1, normal: 2, low: 3 } as const;
  return [...rows].filter((row) => row.status !== 'resolved').sort((a, b) => {
    const sla = new Date(a.slaDueAt).getTime() - new Date(b.slaDueAt).getTime();
    return sla || priority[a.priority] - priority[b.priority] || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

/**
 * `label`in iki İngilizce sabiti (ör. "4h overdue"/"4h remaining") dilden
 * bağımsızdı — `operations-model.ts`teki `HEALTH_SIGNAL_LABELS` kalıbıyla
 * (dalga-sonu cila) `Record<Lang, …>` tabloya taşındı. TR karşılığı bu
 * dosyanın kendi görünüm katmanındaki (`SupportOperationsViews.tsx`)
 * `formatSlaTime()`/`admin-support.ts`teki `queueView.slaTime.overdue`/
 * `.left` ile AYNI kurulmuş kelimeleri ("saat gecikti"/"saat kaldı")
 * tekrar kullanır — o ikisi yalnız gelen kutusu satırı içindi, `label` ise
 * SLA kartı ve vaka ızgarasında doğrudan basılıyordu ve TR'de İngilizce
 * kalıyordu (bu görevin bulgusu). `remaining`/`tone` zaten sayısal/dilden
 * bağımsız — yalnız `label` çeviri alıyor.
 */
const slaLabelsEn = {
  overdue: (hours: number) => `${hours}h overdue`,
  remaining: (hours: number) => `${hours}h remaining`,
};

const slaLabelsTr: Mirror<typeof slaLabelsEn> = {
  overdue: (hours) => `${hours} saat gecikti`,
  remaining: (hours) => `${hours} saat kaldı`,
};

const SLA_LABELS: Record<Lang, typeof slaLabelsEn> = { en: slaLabelsEn, tr: slaLabelsTr };

export function slaState(row: SupportCaseRow, now: number, lang: Lang = 'en') {
  const created = new Date(row.createdAt).getTime();
  const due = new Date(row.slaDueAt).getTime();
  const elapsed = now - created;
  const window = Math.max(1, due - created);
  const remaining = due - now;
  const labels = SLA_LABELS[lang];
  return {
    remaining,
    progress: Math.min(100, Math.max(4, Math.round((elapsed / window) * 100))),
    tone: remaining < 0 ? 'danger' : remaining <= 4 * 3_600_000 ? 'warning' : 'success',
    label: remaining < 0 ? labels.overdue(Math.max(1, Math.ceil(Math.abs(remaining) / 3_600_000))) : labels.remaining(Math.max(1, Math.ceil(remaining / 3_600_000))),
  } as const;
}

/**
 * `nextStep` cümleleri ve `ownerSignal` etiketi dilden bağımsızdı —
 * `product-analytics-model.ts`teki `ACTIVATION_STAGE_LABELS` kalıbıyla
 * (dalga-sonu cila) `Record<Lang, …>` tabloya taşındı. `stage`/`stageIndex`
 * zaten dilden bağımsız, stabil anahtar (`signalKeys` dersi burada
 * uygulanacak bir açık yok — hiçbir karşılaştırma bu iki metin alanından
 * türemiyor).
 */
const onboardingLabelsEn = {
  nextStep: ['Invite the first workspace member', 'Create the first signature', 'Publish an active sender', 'Complete the first export', 'Monitor adoption'] as readonly string[],
  ownerSignal: { trial: 'Trial workspace', customer: 'Customer workspace' },
};

const onboardingLabelsTr: Mirror<typeof onboardingLabelsEn> = {
  nextStep: ['İlk çalışma alanı üyesini davet et', 'İlk imzayı oluştur', 'Aktif bir gönderici yayınla', 'İlk dışa aktarımı tamamla', 'Benimsemeyi izle'],
  ownerSignal: { trial: 'Deneme çalışma alanı', customer: 'Müşteri çalışma alanı' },
};

const ONBOARDING_LABELS: Record<Lang, typeof onboardingLabelsEn> = { en: onboardingLabelsEn, tr: onboardingLabelsTr };

export function onboardingRows(source: ProductAnalyticsSnapshot, now: number, lang: Lang = 'en'): OnboardingRow[] {
  const labels = ONBOARDING_LABELS[lang];
  return source.organizations.map((org) => {
    const ageDays = Math.max(0, Math.floor((now - new Date(org.createdAt).getTime()) / DAY));
    const checks = [true, org.memberCount > 0, org.signatureCount > 0, org.activeSenderCount > 0, org.exportedSenderCount > 0];
    const completed = checks.filter(Boolean).length;
    const stageIndex = Math.min(4, completed - 1);
    const stages = ['workspace', 'identity', 'design', 'publish', 'export'] as const;
    const progress = Math.round((completed / checks.length) * 100);
    const tone: OnboardingRow['tone'] = progress === 100 ? 'success' : ageDays >= 14 && progress < 80 ? 'warning' : progress >= 60 ? 'info' : progress >= 40 ? 'primary' : 'secondary';
    return {
      id: org.id,
      name: org.name,
      ageDays,
      stage: stages[stageIndex]!,
      stageIndex,
      progress,
      tone,
      nextStep: labels.nextStep[stageIndex]!,
      ownerSignal: org.entitlementState === 'trial' ? labels.ownerSignal.trial : labels.ownerSignal.customer,
    };
  }).sort((a, b) => (a.progress === 100 ? 1 : 0) - (b.progress === 100 ? 1 : 0) || a.progress - b.progress || b.ageDays - a.ageDays);
}

export function onboardingFacts(rows: OnboardingRow[]) {
  return {
    total: rows.length,
    complete: rows.filter((row) => row.progress === 100).length,
    atRisk: rows.filter((row) => row.tone === 'warning').length,
    assisted: rows.filter((row) => row.progress < 100).length,
    average: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.progress, 0) / rows.length) : 0,
  };
}
