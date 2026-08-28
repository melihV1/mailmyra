'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useDropdown } from '../(app)/navbar/useDropdown';
import { useLang } from '../../lib/i18n/LangProvider';
import { adminCommon } from '../../lib/i18n/dict/admin-common';
import { adminNav } from '../../lib/i18n/dict/admin-nav';
import { common } from '../../lib/i18n/dict/common';
import type { Lang } from '../../lib/i18n/types';

const CREATE_ACTIONS = [
  {
    href: '/admin/orgs',
    key: 'invoice',
    icon: 'tabler-file-dollar',
    tone: 'success',
  },
  {
    href: '/admin/support/cases?new=1',
    key: 'supportCase',
    icon: 'tabler-headset',
    tone: 'info',
  },
  {
    href: '/admin/security/data-requests?new=1',
    key: 'dataRequest',
    icon: 'tabler-shield-search',
    tone: 'danger',
  },
] as const;

const SOURCE_STATUS = [
  { key: 'coreDatabase', state: 'live', tone: 'success' },
  { key: 'billingLedger', state: 'live', tone: 'success' },
  { key: 'productEvents', state: 'setup', tone: 'warning' },
  { key: 'platformMonitoring', state: 'connect', tone: 'secondary' },
  { key: 'growthAnalytics', state: 'connect', tone: 'secondary' },
] as const;

export function QuickCreateMenu() {
  const lang = useLang();
  const t = adminNav[lang];
  const { open, setOpen, ref } = useDropdown<HTMLLIElement>();

  return (
    <li className="nav-item navbar-dropdown dropdown me-1 me-xl-2" ref={ref}>
      <button
        type="button"
        className="nav-link btn btn-primary btn-sm d-flex align-items-center gap-2 px-2 px-xl-3 mm-admin-quick-create"
        aria-label={t.quickCreate.ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <i className="icon-base ti tabler-plus icon-md" aria-hidden="true" />
        <span className="d-none d-xxl-inline">{t.quickCreate.label}</span>
      </button>
      <div className={`dropdown-menu dropdown-menu-end p-0${open ? ' show' : ''}`} style={{ width: 350 }}>
        <div className="dropdown-header border-bottom py-3">
          <h6 className="mb-1">{t.quickCreate.header}</h6>
          <small className="text-body-secondary">{t.quickCreate.subheader}</small>
        </div>
        <div className="list-group list-group-flush">
          {CREATE_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3"
              onClick={() => setOpen(false)}
            >
              <span className={`avatar avatar-sm bg-label-${action.tone} rounded`}>
                <span className="avatar-initial rounded">
                  <i className={`icon-base ti ${action.icon}`} aria-hidden="true" />
                </span>
              </span>
              <span className="flex-grow-1">
                <span className="d-block fw-medium text-heading">
                  {t.quickCreate.actions[action.key].label}
                </span>
                <small className="text-body-secondary">{t.quickCreate.actions[action.key].detail}</small>
              </span>
              <i className="icon-base ti tabler-chevron-right text-body-secondary" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </li>
  );
}

export function SnapshotMenu() {
  const lang = useLang();
  const t = adminNav[lang];
  const { open, setOpen, ref } = useDropdown<HTMLLIElement>();

  return (
    <li className="nav-item navbar-dropdown dropdown d-none d-md-block me-1 me-xl-2" ref={ref}>
      <button
        type="button"
        className="nav-link btn btn-text-secondary d-flex align-items-center gap-2 mm-admin-snapshot"
        aria-label={t.snapshot.ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <i className="icon-base ti tabler-database-check icon-md text-success" aria-hidden="true" />
        <span className="d-none d-xxl-inline small">{t.snapshot.label}</span>
        <i className="icon-base ti tabler-chevron-down icon-14px d-none d-xxl-inline" aria-hidden="true" />
      </button>
      <div className={`dropdown-menu dropdown-menu-end p-0${open ? ' show' : ''}`} style={{ width: 330 }}>
        <div className="dropdown-header border-bottom py-3">
          <div className="d-flex align-items-center justify-content-between gap-3">
            <div>
              <h6 className="mb-1">{t.snapshot.header}</h6>
              <small className="text-body-secondary">{t.snapshot.subheader}</small>
            </div>
            <span className="badge bg-label-success">{adminCommon[lang].live}</span>
          </div>
        </div>
        <div className="p-3">
          {SOURCE_STATUS.map((source) => (
            <div key={source.key} className="d-flex align-items-center justify-content-between gap-3 py-2">
              <span className="small text-heading">{t.sourceStatus[source.key]}</span>
              <span className={`badge bg-label-${source.tone}`}>{sourceStateLabel(lang, source.state)}</span>
            </div>
          ))}
          <div className="alert alert-primary py-2 px-3 small mt-3 mb-0">
            {t.snapshot.comparisonNote}
          </div>
        </div>
      </div>
    </li>
  );
}

export function AdminNotifications() {
  const lang = useLang();
  const t = adminNav[lang];
  const [open, setOpen] = useState(false);

  return (
    <>
      <li className="nav-item me-1 me-xl-2">
        <button
          type="button"
          className="nav-link btn btn-text-secondary rounded-pill btn-icon position-relative"
          aria-label={t.operationsInbox.openAria}
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <i className="icon-base ti tabler-bell icon-md" aria-hidden="true" />
          <span className="badge-dot bg-warning position-absolute top-0 end-0 mt-1 me-1" />
        </button>
      </li>

      {open && (
        <>
          <button
            type="button"
            className="position-fixed top-0 start-0 w-100 h-100 border-0 bg-black opacity-25"
            style={{ zIndex: 1088 }}
            aria-label={t.operationsInbox.closeAria}
            onClick={() => setOpen(false)}
          />
          <aside
            className="position-fixed top-0 end-0 h-100 bg-body shadow-lg d-flex flex-column"
            style={{ zIndex: 1089, width: 'min(430px, 100vw)' }}
            aria-label={t.operationsInbox.dialogAria}
          >
            <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
              <div>
                <h5 className="mb-1">{t.operationsInbox.header}</h5>
                <small className="text-body-secondary">{t.operationsInbox.subheader}</small>
              </div>
              <button type="button" className="btn btn-icon btn-text-secondary rounded-pill" aria-label={common[lang].close} onClick={() => setOpen(false)}>
                <i className="icon-base ti tabler-x" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-grow-1 overflow-auto p-4">
              <div className="alert alert-warning d-flex gap-3 align-items-start">
                <i className="icon-base ti tabler-plug-connected-x mt-1" aria-hidden="true" />
                <div>
                  <strong className="d-block">{t.operationsInbox.observabilityTitle}</strong>
                  <span className="small">{t.operationsInbox.observabilityBody}</span>
                </div>
              </div>
              <h6 className="text-uppercase text-body-secondary small mt-5 mb-3">{t.operationsInbox.sourceReadiness}</h6>
              <div className="list-group list-group-flush">
                {SOURCE_STATUS.map((source) => (
                  <div key={source.key} className="list-group-item px-0 d-flex align-items-center gap-3">
                    <span className={`avatar avatar-sm bg-label-${source.tone} rounded`}>
                      <span className="avatar-initial rounded">
                        <i className="icon-base ti tabler-database" aria-hidden="true" />
                      </span>
                    </span>
                    <span className="flex-grow-1 fw-medium text-heading">{t.sourceStatus[source.key]}</span>
                    <span className={`badge bg-label-${source.tone}`}>{sourceStateLabel(lang, source.state)}</span>
                  </div>
                ))}
              </div>

              <h6 className="text-uppercase text-body-secondary small mt-5 mb-3">{t.operationsInbox.controlShortcuts}</h6>
              <div className="d-grid gap-2">
                <Link href="/admin/security/approvals" className="btn btn-label-warning text-start" onClick={() => setOpen(false)}>
                  <i className="icon-base ti tabler-checklist me-2" aria-hidden="true" />{t.operationsInbox.pendingApprovals}
                </Link>
                <Link href="/admin/platform/overview" className="btn btn-label-info text-start" onClick={() => setOpen(false)}>
                  <i className="icon-base ti tabler-server-cog me-2" aria-hidden="true" />{t.operationsInbox.platformHealth}
                </Link>
                <Link href="/admin/reports/definitions" className="btn btn-label-primary text-start" onClick={() => setOpen(false)}>
                  <i className="icon-base ti tabler-chart-dots me-2" aria-hidden="true" />{t.operationsInbox.measurementPlan}
                </Link>
              </div>
            </div>

            <div className="p-4 border-top bg-lighter">
              <small className="text-body-secondary">{t.operationsInbox.footerNote}</small>
            </div>
          </aside>
        </>
      )}
    </>
  );
}

/** `live`/`setup` `admin-common`dan, `connect` `admin-nav`den — kaynak durumu ikisine bölünmüş. */
function sourceStateLabel(lang: Lang, state: 'live' | 'setup' | 'connect'): string {
  return state === 'connect' ? adminNav[lang].sourceState.connect : adminCommon[lang][state];
}
