'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export interface AuditEvent {
  id: string;
  kind: 'read' | 'write';
  staffEmail: string;
  orgName: string;
  label: string;
  detail: string;
  createdAt: number;
}

type AuditTab = 'all' | 'read' | 'write';

export function AdminAuditTimeline({ events }: { events: AuditEvent[] }) {
  const [tab, setTab] = useState<AuditTab>('all');
  const visible = useMemo(() => events.filter((event) => tab === 'all' || event.kind === tab).slice(0, 6), [events, tab]);

  return (
    <div className="card h-100">
      <div className="card-header pb-2">
        <div className="d-flex align-items-start justify-content-between gap-3">
          <div><h5 className="card-title mb-1">Staff activity</h5><p className="card-subtitle mb-0">Sensitive reads and controlled writes</p></div>
          <Link href="/admin/access" className="btn btn-icon btn-text-secondary rounded-pill btn-sm" aria-label="Open access log"><i className="icon-base ti tabler-arrow-up-right" aria-hidden="true" /></Link>
        </div>
        <ul className="nav nav-pills nav-fill mt-4" role="tablist">
          {(['all', 'read', 'write'] as const).map((value) => (
            <li className="nav-item" key={value}>
              <button type="button" className={`nav-link${tab === value ? ' active' : ''}`} aria-selected={tab === value} onClick={() => setTab(value)}>{value === 'all' ? 'All' : value === 'read' ? 'Access' : 'Actions'}</button>
            </li>
          ))}
        </ul>
      </div>
      <div className="card-body">
        {visible.length === 0 ? (
          <div className="text-center py-6 text-body-secondary"><i className="icon-base ti tabler-shield-check icon-32px mb-2" aria-hidden="true" /><p className="mb-0">No activity in this view.</p></div>
        ) : (
          <ul className="timeline mb-0">
            {visible.map((event) => (
              <li className="timeline-item timeline-item-transparent" key={event.id}>
                <span className={`timeline-point timeline-point-${event.kind === 'write' ? 'warning' : 'info'}`} />
                <div className="timeline-event">
                  <div className="timeline-header mb-1"><h6 className="mb-0 text-truncate">{event.label}</h6><small className="text-body-secondary text-nowrap">{relativeTime(event.createdAt)}</small></div>
                  <p className="mb-1 small text-body-secondary">{event.orgName} · {event.detail}</p>
                  <small className="text-body-secondary">{event.staffEmail}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function relativeTime(timestamp: number) {
  const deltaMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (deltaMinutes < 1) return 'now';
  if (deltaMinutes < 60) return `${deltaMinutes}m`;
  const hours = Math.floor(deltaMinutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
