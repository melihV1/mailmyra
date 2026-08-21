'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useDropdown } from '../../(app)/navbar/useDropdown';
import { AdminEmptyState } from './AdminEmptyState';
import { AdminStatusBadge } from './AdminStatusBadge';

/**
 * Müşteri tablosu (redesign brief §5.4) — kabuk temanın
 * `app-ecommerce-customer-all.html` veri tablosu düzeni: üstte süzgeç
 * çubuğu, altta `card-datatable > table border-top`. DataTables JS'i YOK;
 * arama/süzgeç React state. Satırın tamamı tıklanabilir DEĞİL — bağlantı
 * org adında, eylemler üç-nokta menüsünde.
 */

export interface CustomerRow {
  id: string;
  name: string;
  entitlementState: string;
  activeSeats: number;
  entitledSeats: number;
  trialEndsAt: string | null; // ISO gün — Date istemciye seri gelmez
  memberCount: number;
  childCount: number;
  lastActivityAt: string | null;
  createdAt: string;
}

type StateFilter = '' | 'trial' | 'active' | 'past_due' | 'cancelled';

export function CustomerTable({ rows, now }: { rows: CustomerRow[]; now: number }) {
  const [q, setQ] = useState('');
  const [state, setState] = useState<StateFilter>('');
  const [onlyExpiring, setOnlyExpiring] = useState(false);
  const [onlyOver, setOnlyOver] = useState(false);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const in7d = now + 7 * 24 * 60 * 60 * 1000;
    return rows.filter((r) => {
      if (needle && !r.name.toLowerCase().includes(needle)) return false;
      if (state && r.entitlementState !== state) return false;
      if (onlyOver && r.activeSeats <= r.entitledSeats) return false;
      if (onlyExpiring) {
        const t = r.trialEndsAt ? Date.parse(r.trialEndsAt) : null;
        if (t === null || t > in7d || r.entitlementState !== 'trial') return false;
      }
      return true;
    });
  }, [rows, q, state, onlyExpiring, onlyOver, now]);

  return (
    <div className="card">
      <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <h5 className="card-title mb-0">Customers</h5>
          <p className="card-subtitle text-body-secondary mt-1 mb-0">
            Root billing organizations — agency workspaces live inside their root.
          </p>
        </div>
        {/* Süzgeç çubuğu — customer-all'ın filtre başlığı */}
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="input-group input-group-merge" style={{ width: 220 }}>
            <span className="input-group-text">
              <i className="icon-base ti tabler-search icon-sm" aria-hidden="true" />
            </span>
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search customer"
              aria-label="Search customer"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            className="form-select form-select-sm w-auto"
            aria-label="Filter by state"
            value={state}
            onChange={(e) => setState(e.target.value as StateFilter)}
          >
            <option value="">All states</option>
            <option value="trial">trial</option>
            <option value="active">active</option>
            <option value="past_due">past_due</option>
            <option value="cancelled">cancelled</option>
          </select>
          <button
            type="button"
            className={`btn btn-sm ${onlyExpiring ? 'btn-warning' : 'btn-label-secondary'}`}
            aria-pressed={onlyExpiring}
            onClick={() => setOnlyExpiring((v) => !v)}
          >
            Trial ending
          </button>
          <button
            type="button"
            className={`btn btn-sm ${onlyOver ? 'btn-danger' : 'btn-label-secondary'}`}
            aria-pressed={onlyOver}
            onClick={() => setOnlyOver((v) => !v)}
          >
            Over seats
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <AdminEmptyState
          icon="tabler-building"
          text={
            rows.length === 0
              ? 'No customers yet — the first registration shows up here.'
              : 'No customer matches these filters.'
          }
        />
      ) : (
        <div className="card-datatable table-responsive">
          <table className="table border-top">
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                <th>Organization</th>
                <th>State</th>
                <th style={{ minWidth: 120 }}>Seats</th>
                <th>Trial</th>
                <th>Members</th>
                <th>Children</th>
                <th>Last activity</th>
                <th>Created</th>
                <th className="text-end" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <CustomerRowView key={r.id} row={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CustomerRowView({ row }: { row: CustomerRow }) {
  const { open, setOpen, ref } = useDropdown<HTMLDivElement>();
  const pct =
    row.entitledSeats > 0 ? Math.min(100, (row.activeSeats / row.entitledSeats) * 100) : 0;
  const over = row.activeSeats > row.entitledSeats;

  return (
    <tr>
      <td>
        {/* Kimlik hücresi: avatar + ad + kök/ajans bağlamı (customer-all deseni) */}
        <div className="d-flex align-items-center gap-3">
          <div className="avatar avatar-sm">
            <span className="avatar-initial rounded-circle bg-label-primary">
              {row.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <Link href={`/admin/orgs/${row.id}`} className="fw-medium text-heading d-block">
              {row.name}
            </Link>
            <small className="text-body-secondary">
              {row.childCount > 0 ? `Agency root · ${row.childCount} workspaces` : 'Root'}
            </small>
          </div>
        </div>
      </td>
      <td>
        <AdminStatusBadge value={row.entitlementState} />
      </td>
      <td>
        {/* Mikro ilerleme: yalnız "4/5" metni değil (brief §5.4) */}
        <div className="d-flex align-items-center gap-2">
          <div className="progress flex-grow-1" style={{ height: 6, minWidth: 56 }}>
            <div
              className={`progress-bar${over ? ' bg-danger' : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <small className={over ? 'text-danger fw-medium' : 'text-body-secondary'}>
            {row.activeSeats}/{row.entitledSeats}
          </small>
        </div>
      </td>
      <td className="text-body-secondary">{row.trialEndsAt ?? '—'}</td>
      <td>{row.memberCount}</td>
      <td>{row.childCount || '—'}</td>
      <td className="text-body-secondary">{row.lastActivityAt ?? '—'}</td>
      <td className="text-body-secondary">{row.createdAt}</td>
      <td className="text-end">
        <div className="dropdown" ref={ref}>
          <button
            type="button"
            className="btn btn-icon btn-text-secondary rounded-pill dropdown-toggle hide-arrow btn-sm"
            aria-label={`Actions for ${row.name}`}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <i className="icon-base ti tabler-dots-vertical" aria-hidden="true" />
          </button>
          <ul
            className={`dropdown-menu dropdown-menu-end${open ? ' show' : ''}`}
            style={open ? { position: 'absolute', right: 0 } : undefined}
          >
            <li>
              <Link href={`/admin/orgs/${row.id}`} className="dropdown-item">
                <i className="icon-base ti tabler-eye me-2" aria-hidden="true" />
                Open customer
              </Link>
            </li>
          </ul>
        </div>
      </td>
    </tr>
  );
}
