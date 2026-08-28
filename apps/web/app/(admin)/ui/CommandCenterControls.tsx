'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { BarsChart } from '../../(app)/charts/BarsChart';
import { DonutChart } from '../../(app)/charts/DonutChart';
import { fmtMoney } from '../format';
import type { CommandCustomerStates, CommandFinancials } from './CommandCenterView';
import { useLang } from '../../../lib/i18n/LangProvider';
import { adminCommand } from '../../../lib/i18n/dict/admin-command';
import { adminCommon } from '../../../lib/i18n/dict/admin-common';
import { adminNav } from '../../../lib/i18n/dict/admin-nav';
import type { Lang } from '../../../lib/i18n/types';

type CockpitTab = 'business' | 'product' | 'revenue' | 'growth' | 'reliability';

const COCKPIT_TAB_VALUES: readonly CockpitTab[] = ['business', 'product', 'revenue', 'growth', 'reliability'];
const COCKPIT_TAB_ICONS: Record<CockpitTab, string> = {
  business: 'tabler-building-bank',
  product: 'tabler-activity-heartbeat',
  revenue: 'tabler-file-dollar',
  growth: 'tabler-speakerphone',
  reliability: 'tabler-server-cog',
};

type SystemSourceState = 'live' | 'noMonitor' | 'setup';

const SYSTEM_SOURCES = [
  { key: 'coreDatabase', state: 'live', tone: 'success' },
  { key: 'billingLedger', state: 'live', tone: 'success' },
  { key: 'webApplication', state: 'noMonitor', tone: 'secondary' },
  { key: 'smtp', state: 'noMonitor', tone: 'secondary' },
  { key: 'rendererExport', state: 'setup', tone: 'warning' },
  { key: 'backgroundJobs', state: 'setup', tone: 'warning' },
] as const;

function systemSourceStateLabel(lang: Lang, state: SystemSourceState): string {
  if (state === 'live') return adminCommon[lang].live;
  if (state === 'setup') return adminCommon[lang].setup;
  return adminCommand[lang].controls.cockpit.reliability.noMonitor;
}

export function CommandAnalyticsCockpit({
  customerStates,
  financials,
  activeSeats,
  entitledSeats,
  workspaceCount,
  customerCount,
  seatMix,
}: {
  customerStates: CommandCustomerStates;
  financials: CommandFinancials;
  activeSeats: number;
  entitledSeats: number;
  workspaceCount: number;
  customerCount: number;
  seatMix: { categories: string[]; data: number[] };
}) {
  const lang = useLang();
  const t = adminCommand[lang].controls.cockpit;
  const [tab, setTab] = useState<CockpitTab>('business');
  const collectionPct = financials.billedCents
    ? Math.min(100, (financials.collectedCents / financials.billedCents) * 100)
    : 0;
  const seatPct = entitledSeats ? Math.min(100, (activeSeats / entitledSeats) * 100) : 0;

  return (
    <div className="card h-100">
      <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
          <h5 className="card-title mb-1">{t.title}</h5>
          <p className="card-subtitle mb-0">{t.subtitle}</p>
        </div>
        <span className="badge bg-label-primary">{adminNav[lang].snapshot.label}</span>
      </div>
      <div className="card-body pt-1">
        <ul className="nav nav-pills flex-nowrap overflow-x-auto mb-5" role="tablist">
          {COCKPIT_TAB_VALUES.map((value) => (
            <li className="nav-item" key={value}>
              <button
                type="button"
                className={`nav-link d-flex align-items-center gap-2${tab === value ? ' active' : ''}`}
                aria-selected={tab === value}
                onClick={() => setTab(value)}
              >
                <i className={`icon-base ti ${COCKPIT_TAB_ICONS[value]}`} aria-hidden="true" />
                {t.tabs[value]}
              </button>
            </li>
          ))}
        </ul>

        {tab === 'business' && (
          <div className="row g-5 align-items-center">
            <div className="col-lg-7">
              <div className="d-flex align-items-start justify-content-between mb-2">
                <div>
                  <h6 className="mb-1">{t.business.chartTitle}</h6>
                  <small className="text-body-secondary">{t.business.chartSubtitle}</small>
                </div>
                <span className="badge bg-label-success">{adminCommon[lang].live}</span>
              </div>
              {seatMix.data.length ? (
                <BarsChart categories={seatMix.categories} data={seatMix.data} seriesName={t.business.seriesName} color="#7367f0" height={250} />
              ) : (
                <SetupPanel icon="tabler-users" title={t.business.noData.title} text={t.business.noData.text} />
              )}
            </div>
            <div className="col-lg-5">
              <DonutChart
                labels={t.business.donutLabels as string[]}
                series={[customerStates.active, customerStates.trial, customerStates.pastDue, customerStates.cancelled]}
                colors={['#28c76f', '#00bad1', '#ff9f43', '#808390']}
                centerLabel={t.business.donutCenter}
                height={220}
              />
              <div className="row g-3 mt-1">
                <MiniFact label={t.business.billingRoots} value={String(customerCount)} />
                <MiniFact label={t.business.workspaces} value={String(workspaceCount)} />
                <MiniFact label={t.business.seatUtilization} value={`${Math.round(seatPct)}%`} />
              </div>
            </div>
          </div>
        )}

        {tab === 'product' && (
          <SetupWorkspace
            lang={lang}
            icon="tabler-route"
            eyebrow={t.product.eyebrow}
            title={t.product.title}
            support={t.product.support}
            steps={t.product.steps as string[]}
            href="/admin/product/activation"
          />
        )}

        {tab === 'revenue' && (
          <div className="row g-5 align-items-center">
            <div className="col-lg-5">
              <DonutChart
                labels={t.revenue.donutLabels as string[]}
                series={[financials.paidCount, financials.dueCount, financials.voidCount]}
                colors={['#28c76f', '#ff9f43', '#808390']}
                centerLabel={t.revenue.donutCenter}
                height={230}
              />
            </div>
            <div className="col-lg-7">
              <div className="d-flex justify-content-between align-items-end mb-2">
                <div>
                  <small className="text-body-secondary">{t.revenue.collectionProgress}</small>
                  <h3 className="mb-0">{Math.round(collectionPct)}%</h3>
                </div>
                <span className="badge bg-label-success">{t.revenue.billingLive}</span>
              </div>
              <div className="progress mb-5" style={{ height: 10 }}>
                <div className="progress-bar bg-success" style={{ width: `${collectionPct}%` }} />
                <div className="progress-bar bg-warning" style={{ width: `${100 - collectionPct}%` }} />
              </div>
              <LedgerLine label={t.revenue.billed} value={fmtMoney(financials.billedCents, financials.currency)} tone="primary" />
              <LedgerLine label={t.revenue.collected} value={fmtMoney(financials.collectedCents, financials.currency)} tone="success" />
              <LedgerLine label={t.revenue.outstanding} value={fmtMoney(financials.outstandingCents, financials.currency)} tone="warning" />
              <Link href="/admin/invoices" className="btn btn-label-primary w-100 mt-3">{t.revenue.action}</Link>
            </div>
          </div>
        )}

        {tab === 'growth' && (
          <SetupWorkspace
            lang={lang}
            icon="tabler-chart-funnel"
            eyebrow={t.growth.eyebrow}
            title={t.growth.title}
            support={t.growth.support}
            steps={t.growth.steps as string[]}
            href="/admin/growth/acquisition"
          />
        )}

        {tab === 'reliability' && (
          <div className="row g-3">
            {SYSTEM_SOURCES.map((source) => (
              <div className="col-md-6" key={source.key}>
                <div className="d-flex align-items-center gap-3 p-3 rounded bg-lighter h-100">
                  <span className={`avatar avatar-sm bg-label-${source.tone} rounded`}>
                    <span className="avatar-initial rounded"><i className="icon-base ti tabler-server" aria-hidden="true" /></span>
                  </span>
                  <span className="flex-grow-1">
                    <span className="d-block fw-medium text-heading">{t.reliability.sources[source.key].label}</span>
                    <small className="text-body-secondary">{t.reliability.sources[source.key].detail}</small>
                  </span>
                  <span className={`badge bg-label-${source.tone}`}>{systemSourceStateLabel(lang, source.state)}</span>
                </div>
              </div>
            ))}
            <div className="col-12">
              <Link href="/admin/platform/overview" className="btn btn-label-primary w-100 mt-2">{t.reliability.action}</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const PREF_KEY = 'mm-admin-command-preferences-v1';
const SECTIONS = [
  { id: 'quick-actions' },
  { id: 'overview' },
  { id: 'analysis' },
  { id: 'operations' },
  { id: 'audit' },
  { id: 'customers' },
] as const;

interface Preferences {
  density: 'comfortable' | 'compact';
  hidden: string[];
}

const DEFAULT_PREFS: Preferences = { density: 'comfortable', hidden: [] };

export function DashboardCustomizer() {
  const lang = useLang();
  const t = adminCommand[lang].controls;
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);
  /* Gerçek diyalog erişilebilirliği (devir notu #1): panel .mm-panel köküne
     PORTALLANIR (tema değişkenleri kapsamda kalsın) ve açıkken kardeş
     `.layout-wrapper` inert yapılır — arka plan hem tıklamaya hem odağa
     kapanır. Kapanınca odak tetikleyen düğmeye döner. */
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setPortalRoot(document.querySelector<HTMLElement>('.mm-panel'));
  }, []);

  useEffect(() => {
    if (!open) return;
    const wrapper = document.querySelector<HTMLElement>('.mm-panel .layout-wrapper');
    if (wrapper) wrapper.inert = true;
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => {
      if (wrapper) wrapper.inert = false;
      window.clearTimeout(t);
      triggerRef.current?.focus();
    };
  }, [open]);

  /* Odak tuzağı: Tab panelin içinde döner; Escape kapatır. */
  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false);
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const focusables = panelRef.current.querySelectorAll<HTMLElement>(
      'button, input, [href], select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(PREF_KEY);
    if (saved) {
      try {
        setPrefs({ ...DEFAULT_PREFS, ...(JSON.parse(saved) as Partial<Preferences>) });
      } catch {
        localStorage.removeItem(PREF_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    const dashboard = document.getElementById('admin-command-center');
    if (!dashboard) return;
    dashboard.dataset.dashboardDensity = prefs.density;
    dashboard.querySelectorAll<HTMLElement>('[data-dashboard-section]').forEach((section) => {
      section.hidden = prefs.hidden.includes(section.dataset.dashboardSection ?? '');
    });
  }, [hydrated, prefs]);

  const visibleCount = useMemo(() => SECTIONS.length - prefs.hidden.length, [prefs.hidden.length]);

  const toggleSection = (id: string) => {
    setPrefs((current) => ({
      ...current,
      hidden: current.hidden.includes(id)
        ? current.hidden.filter((section) => section !== id)
        : [...current.hidden, id],
    }));
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="btn btn-label-secondary"
        onClick={() => setOpen(true)}
      >
        <i className="icon-base ti tabler-adjustments-horizontal me-2" aria-hidden="true" />
        {t.customizer.trigger}
      </button>
      {open &&
        portalRoot &&
        createPortal(
          <>
          <button type="button" className="position-fixed top-0 start-0 w-100 h-100 border-0 bg-black opacity-25" style={{ zIndex: 1088 }} aria-label={t.customizer.closeSettingsAria} onClick={() => setOpen(false)} />
          <aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboardCustomizeTitle"
            className="position-fixed top-0 end-0 h-100 bg-body shadow-lg d-flex flex-column"
            style={{ zIndex: 1089, width: 'min(420px, 100vw)' }}
            onKeyDown={onPanelKeyDown}
          >
            <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
              <div><h5 className="mb-1" id="dashboardCustomizeTitle">{t.customizer.title}</h5><small className="text-body-secondary">{t.customizer.sectionsVisible(visibleCount, SECTIONS.length)}</small></div>
              <button ref={closeRef} type="button" className="btn btn-icon btn-text-secondary rounded-pill" aria-label={t.customizer.closeAria} onClick={() => setOpen(false)}><i className="icon-base ti tabler-x" aria-hidden="true" /></button>
            </div>
            <div className="flex-grow-1 overflow-auto p-4">
              <h6 className="text-uppercase text-body-secondary small mb-3">{t.customizer.density}</h6>
              <div className="btn-group w-100 mb-5" role="group" aria-label={t.customizer.densityGroupAria}>
                {(['comfortable', 'compact'] as const).map((density) => (
                  <button key={density} type="button" className={`btn ${prefs.density === density ? 'btn-primary' : 'btn-label-secondary'}`} onClick={() => setPrefs((current) => ({ ...current, density }))}>{density === 'comfortable' ? t.customizer.comfortable : t.customizer.compact}</button>
                ))}
              </div>
              <h6 className="text-uppercase text-body-secondary small mb-3">{t.customizer.visibleSections}</h6>
              <div className="list-group list-group-flush">
                {SECTIONS.map((section) => {
                  const visible = !prefs.hidden.includes(section.id);
                  return (
                    <label key={section.id} className="list-group-item px-0 d-flex align-items-center justify-content-between gap-3">
                      <span className="fw-medium text-heading">{t.customizer.sections[section.id]}</span>
                      <input className="form-check-input m-0" type="checkbox" checked={visible} onChange={() => toggleSection(section.id)} />
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-top d-flex gap-2">
              <button type="button" className="btn btn-label-secondary flex-grow-1" onClick={() => setPrefs(DEFAULT_PREFS)}>{t.customizer.reset}</button>
              <button type="button" className="btn btn-primary flex-grow-1" onClick={() => setOpen(false)}>{t.customizer.done}</button>
            </div>
          </aside>
          </>,
          portalRoot,
        )}
    </>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return <div className="col-4 text-center"><h6 className="mb-0">{value}</h6><small className="text-body-secondary">{label}</small></div>;
}

function LedgerLine({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="d-flex align-items-center justify-content-between gap-3 py-3 border-bottom"><span className="d-flex align-items-center gap-2"><span className={`rounded-circle bg-${tone}`} style={{ width: 8, height: 8 }} />{label}</span><strong className="text-heading">{value}</strong></div>;
}

function SetupPanel({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <div className="text-center py-6"><span className="avatar avatar-lg bg-label-secondary rounded mb-3"><span className="avatar-initial rounded"><i className={`icon-base ti ${icon} icon-28px`} aria-hidden="true" /></span></span><h6>{title}</h6><p className="text-body-secondary mb-0">{text}</p></div>;
}

function SetupWorkspace({ lang, icon, eyebrow, title, support, steps, href }: { lang: Lang; icon: string; eyebrow: string; title: string; support: string; steps: string[]; href: string }) {
  const t = adminCommand[lang].controls;
  return (
    <div className="row g-5 align-items-center py-2">
      <div className="col-lg-4 text-center text-lg-start">
        <span className="avatar avatar-xl bg-label-warning rounded mb-4"><span className="avatar-initial rounded"><i className={`icon-base ti ${icon} icon-32px`} aria-hidden="true" /></span></span>
        <small className="d-block fw-medium text-warning mb-2">{eyebrow}</small>
        <h4>{title}</h4>
        <p className="text-body-secondary">{support}</p>
        <Link href={href} className="btn btn-label-warning">{t.setupWorkspaceAction}</Link>
      </div>
      <div className="col-lg-8">
        <div className="d-flex flex-column gap-3">
          {steps.map((step, index) => (
            <div key={step} className="d-flex align-items-center gap-3 p-3 rounded bg-lighter">
              <span className="avatar avatar-sm bg-label-secondary rounded-circle"><span className="avatar-initial rounded-circle">{String(index + 1).padStart(2, '0')}</span></span>
              <span className="flex-grow-1 fw-medium text-heading">{step}</span>
              <span className="badge bg-label-secondary">{t.instrumentBadge}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
