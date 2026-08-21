'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useDropdown } from '../(app)/navbar/useDropdown';

const CREATE_ACTIONS = [
  {
    href: '/admin/invoices?new=1',
    label: 'Create invoice',
    detail: 'Start a governed billing record',
    icon: 'tabler-file-dollar',
    tone: 'success',
  },
  {
    href: '/admin/support/cases?new=1',
    label: 'Open support case',
    detail: 'Create an owned customer follow-up',
    icon: 'tabler-headset',
    tone: 'info',
  },
  {
    href: '/admin/growth/content/pages?new=1',
    label: 'New content draft',
    detail: 'Begin a reviewed publishing flow',
    icon: 'tabler-file-pencil',
    tone: 'warning',
  },
  {
    href: '/admin/security/data-requests?new=1',
    label: 'Open data request',
    detail: 'Track a KVKK or GDPR workflow',
    icon: 'tabler-shield-search',
    tone: 'danger',
  },
] as const;

const SOURCE_STATUS = [
  { label: 'Core database', state: 'Live', tone: 'success' },
  { label: 'Billing ledger', state: 'Live', tone: 'success' },
  { label: 'Product events', state: 'Setup', tone: 'warning' },
  { label: 'Platform monitoring', state: 'Connect', tone: 'secondary' },
  { label: 'Growth analytics', state: 'Connect', tone: 'secondary' },
] as const;

export function QuickCreateMenu() {
  const { open, setOpen, ref } = useDropdown<HTMLLIElement>();

  return (
    <li className="nav-item navbar-dropdown dropdown me-1 me-xl-2" ref={ref}>
      <button
        type="button"
        className="nav-link btn btn-primary btn-sm d-flex align-items-center gap-2 px-2 px-xl-3 mm-admin-quick-create"
        aria-label="Quick create"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <i className="icon-base ti tabler-plus icon-md" aria-hidden="true" />
        <span className="d-none d-xxl-inline">Quick create</span>
      </button>
      <div className={`dropdown-menu dropdown-menu-end p-0${open ? ' show' : ''}`} style={{ width: 350 }}>
        <div className="dropdown-header border-bottom py-3">
          <h6 className="mb-1">Create</h6>
          <small className="text-body-secondary">Safe entry points to governed workflows</small>
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
                <span className="d-block fw-medium text-heading">{action.label}</span>
                <small className="text-body-secondary">{action.detail}</small>
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
  const { open, setOpen, ref } = useDropdown<HTMLLIElement>();

  return (
    <li className="nav-item navbar-dropdown dropdown d-none d-md-block me-1 me-xl-2" ref={ref}>
      <button
        type="button"
        className="nav-link btn btn-text-secondary d-flex align-items-center gap-2 mm-admin-snapshot"
        aria-label="Open data snapshot"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <i className="icon-base ti tabler-database-check icon-md text-success" aria-hidden="true" />
        <span className="d-none d-xxl-inline small">Current snapshot</span>
        <i className="icon-base ti tabler-chevron-down icon-14px d-none d-xxl-inline" aria-hidden="true" />
      </button>
      <div className={`dropdown-menu dropdown-menu-end p-0${open ? ' show' : ''}`} style={{ width: 330 }}>
        <div className="dropdown-header border-bottom py-3">
          <div className="d-flex align-items-center justify-content-between gap-3">
            <div>
              <h6 className="mb-1">Data snapshot</h6>
              <small className="text-body-secondary">Current authoritative records</small>
            </div>
            <span className="badge bg-label-success">Live</span>
          </div>
        </div>
        <div className="p-3">
          {SOURCE_STATUS.map((source) => (
            <div key={source.label} className="d-flex align-items-center justify-content-between gap-3 py-2">
              <span className="small text-heading">{source.label}</span>
              <span className={`badge bg-label-${source.tone}`}>{source.state}</span>
            </div>
          ))}
          <div className="alert alert-primary py-2 px-3 small mt-3 mb-0">
            Historical comparison unlocks after the event and rollup layers are connected.
          </div>
        </div>
      </div>
    </li>
  );
}

export function AdminNotifications() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <li className="nav-item me-1 me-xl-2">
        <button
          type="button"
          className="nav-link btn btn-text-secondary rounded-pill btn-icon position-relative"
          aria-label="Open operations inbox"
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
            aria-label="Close operations inbox"
            onClick={() => setOpen(false)}
          />
          <aside
            className="position-fixed top-0 end-0 h-100 bg-body shadow-lg d-flex flex-column"
            style={{ zIndex: 1089, width: 'min(430px, 100vw)' }}
            aria-label="Operations inbox"
          >
            <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
              <div>
                <h5 className="mb-1">Operations inbox</h5>
                <small className="text-body-secondary">Alerts, approvals and source readiness</small>
              </div>
              <button type="button" className="btn btn-icon btn-text-secondary rounded-pill" aria-label="Close" onClick={() => setOpen(false)}>
                <i className="icon-base ti tabler-x" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-grow-1 overflow-auto p-4">
              <div className="alert alert-warning d-flex gap-3 align-items-start">
                <i className="icon-base ti tabler-plug-connected-x mt-1" aria-hidden="true" />
                <div>
                  <strong className="d-block">Observability is not connected</strong>
                  <span className="small">Platform incidents and job failures cannot alert staff yet.</span>
                </div>
              </div>
              <h6 className="text-uppercase text-body-secondary small mt-5 mb-3">Source readiness</h6>
              <div className="list-group list-group-flush">
                {SOURCE_STATUS.map((source) => (
                  <div key={source.label} className="list-group-item px-0 d-flex align-items-center gap-3">
                    <span className={`avatar avatar-sm bg-label-${source.tone} rounded`}>
                      <span className="avatar-initial rounded">
                        <i className="icon-base ti tabler-database" aria-hidden="true" />
                      </span>
                    </span>
                    <span className="flex-grow-1 fw-medium text-heading">{source.label}</span>
                    <span className={`badge bg-label-${source.tone}`}>{source.state}</span>
                  </div>
                ))}
              </div>

              <h6 className="text-uppercase text-body-secondary small mt-5 mb-3">Control shortcuts</h6>
              <div className="d-grid gap-2">
                <Link href="/admin/security/approvals" className="btn btn-label-warning text-start" onClick={() => setOpen(false)}>
                  <i className="icon-base ti tabler-checklist me-2" aria-hidden="true" />Pending approvals
                </Link>
                <Link href="/admin/platform/overview" className="btn btn-label-info text-start" onClick={() => setOpen(false)}>
                  <i className="icon-base ti tabler-server-cog me-2" aria-hidden="true" />Platform health
                </Link>
                <Link href="/admin/reports/definitions" className="btn btn-label-primary text-start" onClick={() => setOpen(false)}>
                  <i className="icon-base ti tabler-chart-dots me-2" aria-hidden="true" />Measurement plan
                </Link>
              </div>
            </div>

            <div className="p-4 border-top bg-lighter">
              <small className="text-body-secondary">No inferred uptime and no fabricated alert counts.</small>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
