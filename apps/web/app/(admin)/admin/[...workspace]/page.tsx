import Link from 'next/link';

import { getLang } from '../../../../lib/i18n/lang.server';
import { adminCommand } from '../../../../lib/i18n/dict/admin-command';
import { adminNav } from '../../../../lib/i18n/dict/admin-nav';
import type { Lang } from '../../../../lib/i18n/types';
import { AdminPageHeader } from '../../ui/AdminPageHeader';

export const dynamic = 'force-dynamic';

/** Task 12 backfill — dinamik segment adı bir sekme başlığı taşıyamaz; brief'in izin verdiği statik aile başlığı. */
export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminCommand[lang].workspaceFoundation.metaTitle} — Mailmyra staff` };
}

type WorkspaceKey =
  | 'customers'
  | 'product'
  | 'revenue'
  | 'growth'
  | 'support'
  | 'platform'
  | 'security'
  | 'reports';

const ICON: Record<WorkspaceKey, string> = {
  customers: 'tabler-building-community',
  product: 'tabler-activity-heartbeat',
  revenue: 'tabler-currency-dollar',
  growth: 'tabler-speakerphone',
  support: 'tabler-headset',
  platform: 'tabler-server-cog',
  security: 'tabler-shield-lock',
  reports: 'tabler-report-analytics',
};

/**
 * `label` sabit (`WORKSPACE` haritası) yerine `adminNav[lang].menu`den
 * gelir — sekiz grup adı nav menüsündeki BÖLÜM adlarıyla bayt-bayt aynı
 * (bkz. admin-command `workspaceFoundation` dosya başı notu). Yalnız
 * `source`/`first`/`guardrail` bu görevde çevrilen YENİ metin.
 */
function workspaceGroup(lang: Lang, key: WorkspaceKey) {
  const nav = adminNav[lang].menu;
  const g = adminCommand[lang].workspaceFoundation.groups[key];
  const LABEL: Record<WorkspaceKey, string> = {
    customers: nav.customers,
    product: nav.product,
    revenue: nav.revenue,
    growth: nav.growth,
    support: nav.support,
    platform: nav.platform,
    security: nav.security,
    reports: nav.reports,
  };
  return { label: LABEL[key], icon: ICON[key], source: g.source, first: g.first, guardrail: g.guardrail };
}

function isWorkspaceKey(v: string): v is WorkspaceKey {
  return v === 'customers' || v === 'product' || v === 'revenue' || v === 'growth' || v === 'support' || v === 'platform' || v === 'security' || v === 'reports';
}

export default async function WorkspaceFoundationPage({
  params,
}: {
  params: Promise<{ workspace: string[] }>;
}) {
  const { workspace } = await params;
  const lang = await getLang();
  const t = adminCommand[lang].workspaceFoundation;
  const key = isWorkspaceKey(workspace[0] ?? '') ? (workspace[0] as WorkspaceKey) : 'reports';
  const group = workspaceGroup(lang, key);
  const pageName = humanize(workspace.at(-1) ?? group.label);

  return (
    <section>
      <AdminPageHeader
        crumb={group.label}
        title={pageName}
        support={t.support}
        right={<span className="badge bg-label-warning">{t.badge}</span>}
      />

      <div className="alert alert-warning d-flex align-items-start gap-3 mb-6" role="status">
        <i className="icon-base ti tabler-database-cog icon-26px mt-1" aria-hidden="true" />
        <div>
          <h6 className="alert-heading mb-1">{t.sourceSetup.title}</h6>
          <p className="mb-0">{t.sourceSetup.body}</p>
        </div>
      </div>

      <div className="row g-6 mb-6">
        <div className="col-lg-7">
          <div className="card h-100">
            <div className="card-body d-flex flex-column flex-md-row align-items-md-center gap-5">
              <span className="avatar avatar-xl flex-shrink-0">
                <span className="avatar-initial rounded bg-label-primary">
                  <i className={`icon-base ti ${group.icon} icon-32px`} aria-hidden="true" />
                </span>
              </span>
              <div>
                <span className="badge bg-label-primary mb-3">{t.workspaceBadge(group.label)}</span>
                <h3 className="mb-2">{t.buildSource.title}</h3>
                <p className="text-body-secondary mb-0">{t.buildSource.body}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-header"><h5 className="card-title mb-0">{t.readiness.title}</h5></div>
            <div className="card-body pt-2">
              <Readiness label={t.readiness.informationArchitecture} state={t.readiness.ready} tone="success" />
              <Readiness label={t.readiness.accessBoundary} state={t.readiness.ready} tone="success" />
              <Readiness label={t.readiness.authoritativeSource} state={t.readiness.required} tone="warning" />
              <Readiness label={t.readiness.historicalCoverage} state={t.readiness.unavailable} tone="secondary" />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-6">
        <FoundationCard number="01" title={t.cards.sourceContract} icon="tabler-database" body={group.source} />
        <FoundationCard number="02" title={t.cards.firstDeliverable} icon="tabler-layout-dashboard" body={group.first} />
        <FoundationCard number="03" title={t.cards.controlBoundary} icon="tabler-shield-check" body={group.guardrail} />
      </div>

      <div className="d-flex justify-content-between align-items-center mt-6">
        <Link href="/admin" className="btn btn-label-secondary">
          <i className="icon-base ti tabler-arrow-left me-2" aria-hidden="true" />
          {adminNav[lang].menu.commandCenter}
        </Link>
        <Link href="/admin/reports/definitions" className="btn btn-primary">
          {adminCommand[lang].view.dataReadiness.action}
          <i className="icon-base ti tabler-arrow-right ms-2" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function Readiness({ label, state, tone }: { label: string; state: string; tone: string }) {
  return <div className="d-flex align-items-center justify-content-between py-2"><span className="text-heading">{label}</span><span className={`badge bg-label-${tone}`}>{state}</span></div>;
}

function FoundationCard({ number, title, icon, body }: { number: string; title: string; icon: string; body: string }) {
  return <div className="col-md-4"><div className="card h-100"><div className="card-body"><div className="d-flex align-items-center justify-content-between mb-5"><span className="badge bg-label-secondary">{number}</span><span className="avatar avatar-sm"><span className="avatar-initial rounded bg-label-primary"><i className={`icon-base ti ${icon}`} aria-hidden="true" /></span></span></div><h5>{title}</h5><p className="text-body-secondary mb-0">{body}</p></div></div></div>;
}

function humanize(value: string) {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
