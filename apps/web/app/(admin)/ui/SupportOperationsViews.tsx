'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import {
  onboardingFacts,
  onboardingRows,
  slaState,
  sortSupportQueue,
  SUPPORT_PLAYBOOKS,
  supportCaseFacts,
  type SupportCaseRow,
  type SupportCaseStatus,
} from '../support-operations-model';
import type { ProductAnalyticsSnapshot } from '../product-analytics-model';
import {
  formatCompactDate,
  InitialAvatar,
  OperationsKpi,
  OperationsKpiStrip,
  OperationsSectionHeader,
  SourceNotice,
} from './OperationsShared';
import { SupportActionButtons, SupportActionDialog, type SupportAction } from './SupportActions';
import { StaffDialog } from './StaffDialog';
import { useLang } from '../../../lib/i18n/LangProvider';
import { adminCommon } from '../../../lib/i18n/dict/admin-common';
import { common } from '../../../lib/i18n/dict/common';
import { adminSupport, type AdminSupportDict } from '../../../lib/i18n/dict/admin-support';
import type { Lang } from '../../../lib/i18n/types';

/**
 * İkon/ton dil-bağımsız veri (admin-product `TEMPLATE_LOOKS` emsali) —
 * insan-okur etiket `adminSupport`'un `statusMeta`'sından gelir, ayrı
 * çeviriye ihtiyaç duyan `statusDisplay()` yardımcısıyla birleştirilir.
 * `PRIORITY_TONE`/`CATEGORY_ICON` hiç etiket TAŞIMADIĞI için (yalnız ton/
 * ikon) bölünmedi, dil-bağımsız kaldı — bkz. admin-support.ts dosya başı
 * notu.
 */
const STATUS_LOOKS: Record<SupportCaseStatus, { tone: string; icon: string }> = {
  open: { tone: 'primary', icon: 'tabler-mail-opened' },
  waiting_customer: { tone: 'warning', icon: 'tabler-hourglass' },
  escalated: { tone: 'danger', icon: 'tabler-arrow-badge-up' },
  resolved: { tone: 'success', icon: 'tabler-circle-check' },
};

function statusDisplay(t: AdminSupportDict, status: SupportCaseStatus) {
  return { label: t.statusMeta[status], ...STATUS_LOOKS[status] };
}

const PRIORITY_TONE = { urgent: 'danger', high: 'warning', normal: 'info', low: 'secondary' } as const;
const CATEGORY_ICON = { billing: 'tabler-receipt-dollar', builder: 'tabler-pencil-code', export: 'tabler-file-export', access: 'tabler-key', account: 'tabler-user-cog' } as const;

function PreviewBadge({ preview, t }: { preview?: boolean; t: AdminSupportDict }) {
  return preview ? <span className="badge bg-label-warning"><i className="icon-base ti tabler-flask me-1" />{t.shared.previewBadge}</span> : null;
}

function SupportSource({ preview, body, t }: { preview?: boolean; body: string; t: AdminSupportDict }) {
  return <SourceNotice title={preview ? t.shared.source.demonstrationTitle : t.shared.source.boundaryTitle} body={preview ? `${t.shared.source.previewPrefix}${body}` : body} tone="warning" icon={preview ? 'tabler-flask' : 'tabler-plug-off'} />;
}

function formatSlaTime(ms: number, t: AdminSupportDict) {
  const hours = Math.max(1, Math.ceil(Math.abs(ms) / 3_600_000));
  return ms < 0 ? t.queueView.slaTime.overdue(hours) : t.queueView.slaTime.left(hours);
}

export function SupportQueueView({ rows, now, preview }: { rows: SupportCaseRow[]; now: number; preview?: boolean }) {
  const lang = useLang();
  const t = adminSupport[lang];
  const queue = useMemo(() => sortSupportQueue(rows), [rows]);
  const [selectedId, setSelectedId] = useState(queue[0]?.id ?? '');
  // ApprovalsView/ErrorsView emsali: eylem diyaloğu kardeş olarak açılır.
  // `selected` burada bir kopya değil, `queue`dan (kendisi `rows` prop'undan
  // türer) `.find` ile hesaplanıyor — router.refresh() sonrası bayatlamaz.
  const [action, setAction] = useState<SupportAction | null>(null);
  const selected = queue.find((row) => row.id === selectedId) ?? queue[0];
  const facts = supportCaseFacts(rows, now);

  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <OperationsKpiStrip>
      <OperationsKpi label={t.queueView.kpis.activeQueue.label} value={String(facts.active)} support={t.queueView.kpis.activeQueue.support} icon="tabler-inbox" tone="primary" />
      <OperationsKpi label={t.queueView.kpis.slaBreached.label} value={String(facts.breached)} support={t.queueView.kpis.slaBreached.support} icon="tabler-alarm" tone="danger" />
      <OperationsKpi label={t.queueView.kpis.dueWithin4h.label} value={String(facts.dueSoon)} support={t.queueView.kpis.dueWithin4h.support} icon="tabler-clock-hour-4" tone="warning" />
      <OperationsKpi label={adminCommon[lang].unassigned} value={String(facts.unassigned)} support={t.queueView.kpis.unassignedSupport} icon="tabler-user-question" tone="info" last />
    </OperationsKpiStrip>
    {selected ? <div className="card mb-6 mm-support-console">
      <div className="mm-support-inbox">
        <div className="p-4 border-bottom"><OperationsSectionHeader title={t.queueView.inbox.title} support={t.queueView.inbox.support} /><div className="input-group input-group-merge"><span className="input-group-text"><i className="icon-base ti tabler-search" /></span><input className="form-control" placeholder={t.queueView.inbox.searchPlaceholder} /></div></div>
        <div className="mm-support-inbox__list">{queue.map((row) => { const sla = slaState(row, now, lang); const status = statusDisplay(t, row.status); return <button className={`mm-support-inbox__item${selected.id === row.id ? ' is-active' : ''}`} type="button" onClick={() => setSelectedId(row.id)} key={row.id}><div className="d-flex align-items-start gap-3"><InitialAvatar label={row.customer} tone={sla.tone} /><span className="flex-grow-1 min-w-0 text-start"><span className="d-flex align-items-center justify-content-between gap-2"><strong className="text-heading text-truncate">{row.customer}</strong><small className={`text-${sla.tone} flex-shrink-0`}>{formatSlaTime(sla.remaining, t)}</small></span><span className="d-block text-body-secondary text-truncate mt-1">{row.subject}</span><span className="d-flex align-items-center gap-2 mt-2"><span className={`badge bg-label-${PRIORITY_TONE[row.priority]}`}>{row.priority}</span><small className="text-body-secondary"><i className={`icon-base ti ${status.icon} me-1`} />{status.label}</small></span></span></div><div className="progress mt-3"><span className={`progress-bar bg-${sla.tone}`} style={{ width: `${sla.progress}%` }} /></div></button>; })}</div>
      </div>
      <div className="mm-support-conversation">
        <header className="mm-support-conversation__header"><div className="d-flex align-items-center gap-3 min-w-0"><InitialAvatar label={selected.customer} tone={PRIORITY_TONE[selected.priority]} /><span className="min-w-0"><small className="text-body-secondary">{selected.reference} · {selected.channel}</small><h5 className="mb-0 text-truncate">{selected.subject}</h5></span></div><div className="d-flex gap-2">{!preview && <SupportActionButtons row={selected} onPick={setAction} />}</div></header>
        <div className="mm-support-conversation__body">
          <div className="row g-4 mb-5"><div className="col-md-8"><div className="mm-support-message"><div className="d-flex align-items-center gap-3 mb-4"><InitialAvatar label={selected.requester} tone="secondary" /><span><strong className="d-block text-heading">{selected.requester}</strong><small className="text-body-secondary">{t.queueView.customerMessage} · {formatCompactDate(selected.createdAt, lang)}</small></span></div><p className="mb-0">{selected.summary}</p></div>{!preview && <SupportThread caseId={selected.id} requesterName={selected.requester} t={t} lang={lang} />}</div><div className="col-md-4"><SupportSlaCard row={selected} now={now} t={t} lang={lang} /></div></div>
          <OperationsSectionHeader title={t.queueView.caseContext.title} support={t.queueView.caseContext.support} />
          <div className="mm-support-context-grid">{[
            [t.fields.customer, selected.customer, 'tabler-building'],
            [t.fields.category, selected.category, CATEGORY_ICON[selected.category]],
            [t.fields.owner, selected.owner ?? adminCommon[lang].unassigned, 'tabler-user-circle'],
            [t.fields.lastUpdate, formatCompactDate(selected.updatedAt, lang), 'tabler-history'],
          ].map(([label, value, icon]) => <div className="mm-support-context-item" key={label}><i className={`icon-base ti ${icon}`} /><span><small>{label}</small><strong>{value}</strong></span></div>)}</div>
        </div>
      </div>
    </div> : <SupportConnectionEmpty kind="queue" t={t} />}
    <SupportSource preview={preview} t={t} body={preview ? t.queueView.source.previewBody : t.queueView.source.liveBody} />
    {selected && action && <SupportActionDialog row={selected} action={action} onClose={() => setAction(null)} onDone={() => setAction(null)} />}
  </>;
}

function SupportSlaCard({ row, now, t, lang }: { row: SupportCaseRow; now: number; t: AdminSupportDict; lang: Lang }) {
  const sla = slaState(row, now, lang);
  return <div className={`mm-support-sla bg-label-${sla.tone}`}><span className={`avatar mb-4`}><span className={`avatar-initial rounded bg-${sla.tone} text-white`}><i className="icon-base ti tabler-alarm" /></span></span><small className="d-block text-uppercase">{t.queueView.slaCard.responseTarget}</small><h4 className={`text-${sla.tone} mt-1 mb-2`}>{sla.label}</h4><div className="progress"><span className={`progress-bar bg-${sla.tone}`} style={{ width: `${sla.progress}%` }} /></div><small className="d-block mt-3">{t.queueView.slaCard.priorityPrefix} <strong>{row.priority}</strong></small></div>;
}

type SupportThreadMessage = {
  id: string;
  authorType: 'customer' | 'staff';
  authorEmail: string;
  body: string;
  createdAt: string;
};

/**
 * Gerçek yazışma ipliği + inline Reply composer (spec §6 personel).
 * StaffDialog DEĞİL — konuşma bölmesinin doğal, hep-açık bir parçası; açılış
 * balonu (`summary`) burada tekrar EDİLMEZ, yalnız ondan sonraki satırlar
 * (`listSupportMessages` de aynı sözleşmeyi taşır).
 *
 * Vaka seçilince tembel yüklenir; vaka hızla değiştirilirse (veya cevap
 * gönderiminden sonra kendi tazelemesi) yarışan cevaplar `requestIdRef` ile
 * elenir — yalnız SON dispatch edilen istek state'e yazar, daha eski bir
 * cevap `caseId` aynı kalsa bile daha yeni birinin üzerine asla yazmaz.
 */
function SupportThread({ caseId, requesterName, t, lang }: { caseId: string; requesterName: string; t: AdminSupportDict; lang: Lang }) {
  const router = useRouter();
  const [thread, setThread] = useState<SupportThreadMessage[] | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setThreadLoading(true);
    setThreadError(null);
    // Vaka değişince taslak cevap da sıfırlanır — yanlış vakaya yapışmış
    // metin kalmaz.
    setBody('');
    setSendError(null);
    fetch(`/api/admin/support/${caseId}/messages`)
      .then(async (res) => {
        if (!res.ok) throw new Error('failed');
        const data = (await res.json()) as { messages: SupportThreadMessage[] };
        if (requestIdRef.current === requestId) setThread(data.messages);
      })
      .catch(() => {
        if (requestIdRef.current === requestId) setThreadError(t.thread.loadError);
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setThreadLoading(false);
      });
  }, [caseId, refreshNonce, t]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) {
      setSendError(t.thread.emptyBodyError);
      return;
    }
    setBusy(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/admin/support/${caseId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        setSendError(payload.error ?? t.thread.sendError);
        return;
      }
      setBody('');
      // İplik tazelenir + durum rozeti `waiting_customer`a döner (router.refresh
      // sayfa seviyesindeki liste satırını yeniden okur).
      setRefreshNonce((n) => n + 1);
      router.refresh();
    } catch {
      setSendError(t.thread.sendError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mm-support-thread mt-4">
      {threadLoading && <p className="text-body-secondary small mb-0">{t.thread.loading}</p>}
      {!threadLoading && threadError && <div className="alert alert-danger mb-0" role="alert">{threadError}</div>}
      {!threadLoading && !threadError && thread && thread.length === 0 && (
        <p className="text-body-secondary small mb-0">{t.thread.empty}</p>
      )}
      {!threadLoading && !threadError && thread && thread.length > 0 && (
        <div className="d-flex flex-column gap-3">
          {thread.map((m) => {
            const isStaff = m.authorType === 'staff';
            return (
              <div key={m.id} className={`d-flex ${isStaff ? 'justify-content-end' : 'justify-content-start'}`}>
                <div className={`rounded-3 p-3 ${isStaff ? 'bg-label-primary' : 'bg-label-secondary'}`} style={{ maxWidth: '80%' }}>
                  <div className={`d-flex align-items-center gap-2 mb-1${isStaff ? ' justify-content-end' : ''}`}>
                    <strong className="text-heading">{isStaff ? m.authorEmail : requesterName}</strong>
                    <small className="text-body-secondary">{formatCompactDate(m.createdAt, lang)}</small>
                  </div>
                  <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{m.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form className="mt-4" onSubmit={submit}>
        <label className="form-label" htmlFor="supportReplyBody">{t.thread.replyLabel}</label>
        <textarea
          id="supportReplyBody"
          className="form-control"
          rows={3}
          maxLength={2000}
          placeholder={t.thread.replyPlaceholder}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={busy}
        />
        {sendError && <div className="alert alert-danger mt-2 mb-0" role="alert">{sendError}</div>}
        <div className="d-flex justify-content-end mt-2">
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />}
            {t.thread.send}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Boş liste görünümü — `SupportCase` gerçek, yazılabilir bir kayıt
 * (Task 5). Bu kart artık "kaynak bağlı değil" demiyor: sıfır satır ya
 * hiç vaka açılmamış ya da hepsi çözülmüş demek — sayfa başlığındaki
 * "New case" düğmesi zaten görünür durumda.
 */
function SupportConnectionEmpty({ kind, t }: { kind: 'queue' | 'cases'; t: AdminSupportDict }) {
  const copy = kind === 'queue' ? t.queueView.empty : t.casesView.empty;
  return <div className="card mb-6"><div className="card-body py-10 text-center"><span className="avatar avatar-xl mb-4"><span className="avatar-initial rounded bg-label-primary"><i className={`icon-base ti ${kind === 'queue' ? 'tabler-inbox-off' : 'tabler-folders-off'} icon-32px`} /></span></span><h4>{copy.title}</h4><p className="text-body-secondary mx-auto mb-0" style={{ maxWidth: '42rem' }}>{copy.body}</p></div></div>;
}

export function SupportCasesView({ rows, now, preview }: { rows: SupportCaseRow[]; now: number; preview?: boolean }) {
  const lang = useLang();
  const t = adminSupport[lang];
  const [status, setStatus] = useState<'all' | SupportCaseStatus>('all');
  const [query, setQuery] = useState('');
  // ApprovalsView/DataRequestsView emsali: kart ızgarasında "detay" modalı
  // yok, bu yüzden "..." düğmesi bir StaffDialog açar; eylem diyaloğu onun
  // YERİNE (kardeş) render edilir.
  const [selected, setSelected] = useState<SupportCaseRow | null>(null);
  const [action, setAction] = useState<SupportAction | null>(null);
  const facts = supportCaseFacts(rows, now);
  const visible = useMemo(() => rows.filter((row) => (status === 'all' || row.status === status) && `${row.reference} ${row.customer} ${row.subject}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [query, rows, status]);
  const resolved = rows.filter((row) => row.status === 'resolved').length;
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <OperationsKpiStrip><OperationsKpi label={t.casesView.kpis.allCases.label} value={String(rows.length)} support={t.casesView.kpis.allCases.support} icon="tabler-folders" tone="primary" /><OperationsKpi label={t.casesView.kpis.openAttention.label} value={String(facts.active)} support={t.casesView.kpis.openAttention.support} icon="tabler-folder-open" tone="warning" /><OperationsKpi label={t.statusMeta.resolved} value={String(resolved)} support={t.casesView.kpis.resolvedSupportPct(rows.length ? Math.round((resolved / rows.length) * 100) : 0)} icon="tabler-circle-check" tone="success" /><OperationsKpi label={t.statusMeta.waiting_customer} value={String(facts.waiting)} support={t.casesView.kpis.waitingSupport} icon="tabler-hourglass" tone="info" last /></OperationsKpiStrip>
    {rows.length ? <div className="card mb-6"><div className="card-body border-bottom"><OperationsSectionHeader title={t.casesView.portfolio.title} support={t.casesView.portfolio.support} /><div className="row g-3"><div className="col-lg-8"><div className="input-group input-group-merge"><span className="input-group-text"><i className="icon-base ti tabler-search" /></span><input className="form-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.casesView.portfolio.searchPlaceholder} /></div></div><div className="col-lg-4"><select className="form-select" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">{t.casesView.portfolio.allStatuses}</option>{Object.entries(t.statusMeta).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div></div></div><div className="card-body"><div className="mm-support-case-grid">{visible.map((row) => { const state = statusDisplay(t, row.status); const sla = slaState(row, now, lang); return <article className={`mm-support-case mm-support-case--${sla.tone}`} key={row.id}><div className="d-flex align-items-start justify-content-between gap-3 mb-4"><span className={`avatar`}><span className={`avatar-initial rounded bg-label-${state.tone} text-${state.tone}`}><i className={`icon-base ti ${CATEGORY_ICON[row.category]}`} /></span></span><button className="btn btn-sm btn-icon btn-text-secondary rounded-pill" type="button" aria-label={t.casesView.actionsAria(row.reference)} onClick={() => setSelected(row)}><i className="icon-base ti tabler-dots-vertical" /></button></div><small className="text-body-secondary">{row.reference}</small><h6 className="mt-1 mb-2 text-truncate">{row.subject}</h6><p className="small text-body-secondary text-truncate mb-4">{row.customer} · {row.requester}</p><div className="d-flex flex-wrap gap-2 mb-4"><span className={`badge bg-label-${state.tone}`}>{state.label}</span><span className={`badge bg-label-${PRIORITY_TONE[row.priority]}`}>{row.priority}</span></div><div className="progress mb-2"><span className={`progress-bar bg-${sla.tone}`} style={{ width: `${sla.progress}%` }} /></div><div className="d-flex justify-content-between align-items-center"><small className={`text-${sla.tone}`}>{sla.label}</small><InitialAvatar label={row.owner ?? adminCommon[lang].unassigned} tone={row.owner ? 'primary' : 'secondary'} /></div></article>; })}</div></div></div> : <SupportConnectionEmpty kind="cases" t={t} />}
    <SupportSource preview={preview} t={t} body={preview ? t.casesView.source.previewBody : t.casesView.source.liveBody} />
    {selected && action && <SupportActionDialog row={selected} action={action} onClose={() => setAction(null)} onDone={() => setSelected(null)} />}
    {selected && !action && <StaffDialog title={selected.reference} subtitle={preview ? t.casesView.detail.previewSubtitle : t.casesView.detail.subtitle} labelledBy={selected.reference} busy={false} onClose={() => setSelected(null)}>
      <div className="list-group mb-6">
        <CaseRow label={t.fields.subject} value={selected.subject} />
        <CaseRow label={t.fields.customer} value={selected.customer} />
        <CaseRow label={t.fields.status} value={statusDisplay(t, selected.status).label} />
        <CaseRow label={t.fields.priority} value={selected.priority} />
        <CaseRow label={t.fields.owner} value={selected.owner ?? adminCommon[lang].unassigned} />
        <CaseRow label={t.fields.slaDue} value={formatCompactDate(selected.slaDueAt, lang)} />
      </div>
      {!preview && <div className="d-flex flex-wrap gap-2 mb-6"><SupportActionButtons row={selected} onPick={setAction} /></div>}
      <button type="button" className="btn btn-label-secondary w-100" onClick={() => setSelected(null)}>{preview ? t.casesView.detail.closePreview : common[lang].close}</button>
    </StaffDialog>}
  </>;
}

function CaseRow({ label, value }: { label: string; value: string }) {
  return <div className="list-group-item d-flex justify-content-between gap-4"><span className="text-body-secondary">{label}</span><strong className="text-heading text-end">{value}</strong></div>;
}

export function SupportOnboardingView({ source, now, preview }: { source: ProductAnalyticsSnapshot; now: number; preview?: boolean }) {
  const lang = useLang();
  const t = adminSupport[lang];
  const rows = onboardingRows(source, now, lang);
  const facts = onboardingFacts(rows);
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <OperationsKpiStrip><OperationsKpi label={t.onboardingView.kpis.workspaces.label} value={String(facts.total)} support={t.onboardingView.kpis.workspaces.support} icon="tabler-building-community" tone="primary" /><OperationsKpi label={t.onboardingView.kpis.averageProgress.label} value={`${facts.average}%`} support={t.onboardingView.kpis.averageProgress.support} icon="tabler-chart-arcs" tone="info" /><OperationsKpi label={t.onboardingView.kpis.needsAssistance.label} value={String(facts.assisted)} support={t.onboardingView.kpis.needsAssistance.support} icon="tabler-lifebuoy" tone="warning" /><OperationsKpi label={t.onboardingView.kpis.completed.label} value={String(facts.complete)} support={t.onboardingView.kpis.completed.support} icon="tabler-rosette-discount-check" tone="success" last /></OperationsKpiStrip>
    <div className="row g-6 mb-6"><div className="col-xl-4"><div className="card h-100 mm-onboarding-desk"><div className="card-body"><span className="avatar avatar-lg mb-4"><span className="avatar-initial rounded bg-label-primary"><i className="icon-base ti tabler-route icon-28px" /></span></span><h4>{t.onboardingView.desk.title}</h4><p className="text-body-secondary">{t.onboardingView.desk.body}</p><div className="mm-onboarding-legend">{t.milestones.map((label, index) => <span key={label}><i>{index + 1}</i>{label}</span>)}</div><div className="alert alert-warning mt-5 mb-0"><strong>{t.onboardingView.desk.stalled(facts.atRisk)}</strong><br /><small>{t.onboardingView.desk.stalledNote}</small></div></div></div></div><div className="col-xl-8"><div className="card h-100"><div className="card-body"><OperationsSectionHeader title={t.onboardingView.coverage.title} support={t.onboardingView.coverage.support} /><div className="mm-onboarding-coverage">{['workspace', 'identity', 'design', 'publish', 'export'].map((stage, index) => { const reached = rows.filter((row) => row.stageIndex >= index).length; const rate = rows.length ? Math.round((reached / rows.length) * 100) : 0; return <div key={stage}><div className="d-flex justify-content-between mb-2"><span className="text-heading fw-medium">{t.milestones[index]}</span><strong>{reached}</strong></div><div className="progress"><span className={`progress-bar bg-${index === 4 ? 'success' : 'primary'}`} style={{ width: `${rate}%` }} /></div><small className="text-body-secondary">{t.onboardingView.coverage.coveragePct(rate)}</small></div>; })}</div></div></div></div></div>
    <div className="card mb-6"><div className="card-body"><OperationsSectionHeader title={t.onboardingView.board.title} support={t.onboardingView.board.support} /><div className="mm-onboarding-grid">{rows.map((row) => <Link href={`/admin/orgs/${row.id}`} className={`mm-onboarding-card mm-onboarding-card--${row.tone}`} key={row.id}><div className="d-flex align-items-center gap-3 mb-4"><InitialAvatar label={row.name} tone={row.tone} /><span className="flex-grow-1 min-w-0"><strong className="d-block text-heading text-truncate">{row.name}</strong><small className="text-body-secondary">{row.ownerSignal} · {t.onboardingView.board.dayLabel(row.ageDays)}</small></span><strong className={`text-${row.tone}`}>{row.progress}%</strong></div><div className="mm-onboarding-steps">{[0, 1, 2, 3, 4].map((step) => <span className={row.stageIndex >= step ? `is-complete bg-${row.tone}` : ''} key={step} />)}</div><div className="d-flex align-items-center justify-content-between gap-3 mt-4"><span><small className="d-block text-body-secondary">{t.onboardingView.board.nextMilestone}</small><strong className="text-heading">{row.nextStep}</strong></span><i className="icon-base ti tabler-arrow-up-right" /></div></Link>)}</div></div></div>
    <SourceNotice title={t.onboardingView.source.title} body={t.onboardingView.source.body} tone="info" icon="tabler-database-check" />
  </>;
}

export function SupportPlaybooksView({ preview }: { preview?: boolean }) {
  const lang = useLang();
  const t = adminSupport[lang];
  const categories = [...new Set(SUPPORT_PLAYBOOKS.map((row) => row.category))];
  return <>
    <div className="d-flex justify-content-end mb-4"><PreviewBadge preview={preview} t={t} /></div>
    <OperationsKpiStrip><OperationsKpi label={t.playbooksView.kpis.published.label} value={String(SUPPORT_PLAYBOOKS.length)} support={t.playbooksView.kpis.published.support} icon="tabler-books" tone="primary" /><OperationsKpi label={t.playbooksView.kpis.coverageAreas.label} value={String(categories.length)} support={categories.join(' · ')} icon="tabler-category" tone="info" /><OperationsKpi label={t.playbooksView.kpis.customerDataEdits.label} value="0" support={t.playbooksView.kpis.customerDataEdits.support} icon="tabler-shield-lock" tone="success" /><OperationsKpi label={t.playbooksView.kpis.approvalWorkflow.label} value={t.playbooksView.kpis.approvalWorkflow.value} support={t.playbooksView.kpis.approvalWorkflow.support} icon="tabler-git-pull-request" tone="warning" last /></OperationsKpiStrip>
    <div className="row g-6 mb-6"><div className="col-xl-4"><div className="card h-100 mm-playbook-index"><div className="card-body"><span className="badge bg-label-primary mb-4">{t.playbooksView.index.badge}</span><h3>{t.playbooksView.index.headline1}<br />{t.playbooksView.index.headline2}</h3><p className="text-body-secondary">{t.playbooksView.index.body}</p><div className="d-grid gap-2 mt-5">{categories.map((category) => <a href={`#playbook-${category.toLowerCase()}`} className="mm-playbook-category" key={category}><span>{category}</span><span className="badge bg-label-secondary">{SUPPORT_PLAYBOOKS.filter((row) => row.category === category).length}</span></a>)}</div></div></div></div><div className="col-xl-8"><div className="mm-playbook-grid">{SUPPORT_PLAYBOOKS.map((playbook, index) => <details className={`mm-playbook-card mm-playbook-card--${playbook.tone}`} id={`playbook-${playbook.category.toLowerCase()}`} open={index === 0} key={playbook.id}><summary><span className={`avatar avatar-lg`}><span className={`avatar-initial rounded bg-label-${playbook.tone} text-${playbook.tone}`}><i className={`icon-base ti ${playbook.icon} icon-26px`} /></span></span><span className="flex-grow-1 min-w-0"><small className={`text-${playbook.tone}`}>{playbook.category}</small><h5 className="mb-0">{playbook.title}</h5></span><i className="icon-base ti tabler-chevron-down mm-playbook-card__chevron" /></summary><div className="mm-playbook-card__content"><div className="row g-4 mb-4"><div className="col-md-6"><small className="text-uppercase text-body-secondary">{t.playbooksView.card.trigger}</small><p className="text-heading mt-1 mb-0">{playbook.trigger}</p></div><div className="col-md-6"><small className="text-uppercase text-body-secondary">{t.playbooksView.card.outcome}</small><p className="text-heading mt-1 mb-0">{playbook.outcome}</p></div></div><ol className="mm-playbook-steps">{playbook.steps.map((step, stepIndex) => <li key={step}><span className={`bg-label-${playbook.tone} text-${playbook.tone}`}>{String(stepIndex + 1).padStart(2, '0')}</span><strong>{step}</strong></li>)}</ol></div></details>)}</div></div></div>
    <SourceNotice title={t.playbooksView.source.title} body={t.playbooksView.source.body} tone="info" icon="tabler-book-2" />
  </>;
}
