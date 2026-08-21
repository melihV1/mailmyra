'use client';

import Link from 'next/link';
import { useState } from 'react';

import { filterQueue, QUEUE_SEGMENTS, type QueueRow, type QueueSegment } from '../queue-model';
import { AdminEmptyState } from './AdminEmptyState';

/**
 * TEK kuyruk yüzeyi (redesign brief §5.3): dört ayrı kart yerine önem +
 * vade sıralı tek liste, üstte temanın nav-pills segment kontrolü.
 * Sıralama/segment kuralı `queue-model.ts`te — burada yalnız görünüm.
 */
const SEVERITY_DOT: Record<QueueRow['severity'], string> = {
  3: 'bg-danger',
  2: 'bg-warning',
  1: 'bg-info',
};

const EMPTY_TEXT: Record<QueueSegment, string> = {
  all: 'Nothing needs action right now.',
  trial: 'No trial needs attention.',
  entitlement: 'Nobody is over their seats.',
  billing: 'Nothing overdue.',
  activation: 'No customer is stuck onboarding.',
};

export function AdminQueue({ rows }: { rows: QueueRow[] }) {
  const [segment, setSegment] = useState<QueueSegment>('all');
  const visible = filterQueue(rows, segment);

  const countFor = (s: QueueSegment) => filterQueue(rows, s).length;

  return (
    <div className="card">
      <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <h5 className="card-title mb-0">Action queue</h5>
          <p className="card-subtitle text-body-secondary mt-1 mb-0">
            Sorted by severity and deadline.
          </p>
        </div>
        <ul className="nav nav-pills flex-nowrap overflow-x-auto" role="tablist">
          {QUEUE_SEGMENTS.map((s) => (
            <li className="nav-item" key={s.value}>
              <button
                type="button"
                role="tab"
                aria-selected={segment === s.value}
                className={`nav-link${segment === s.value ? ' active' : ''}`}
                onClick={() => setSegment(s.value)}
              >
                {s.label}
                {countFor(s.value) > 0 && (
                  <span className="badge bg-label-secondary rounded-pill ms-1">
                    {countFor(s.value)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {visible.length === 0 ? (
        <AdminEmptyState icon="tabler-circle-check" text={EMPTY_TEXT[segment]} />
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <tbody>
              {visible.map((row) => (
                <tr key={row.key}>
                  <td style={{ width: '1%' }}>
                    <span
                      className={`d-inline-block rounded-circle ${SEVERITY_DOT[row.severity]}`}
                      style={{ width: 8, height: 8 }}
                      aria-label={`severity ${row.severity}`}
                    />
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div className="avatar avatar-xs">
                        <span className="avatar-initial rounded-circle bg-label-secondary small">
                          {row.orgName.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="fw-medium text-heading d-block">{row.orgName}</span>
                        <small className="text-body-secondary d-md-none">{row.reason}</small>
                      </div>
                    </div>
                  </td>
                  <td className="text-body-secondary d-none d-md-table-cell">{row.reason}</td>
                  <td className="text-body-secondary text-nowrap small d-none d-sm-table-cell">
                    {row.when}
                  </td>
                  <td className="text-end" style={{ width: '1%' }}>
                    <Link
                      href={`/admin/orgs/${row.orgId}`}
                      className="btn btn-icon btn-text-secondary rounded-pill btn-sm"
                      aria-label={`Open ${row.orgName}`}
                    >
                      <i className="icon-base ti tabler-chevron-right" aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
