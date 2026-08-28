'use client';

import Link from 'next/link';
import { useState } from 'react';

import { filterQueue, QUEUE_SEGMENTS, type QueueRow, type QueueSegment } from '../queue-model';
import { AdminEmptyState } from './AdminEmptyState';
import { useLang } from '../../../lib/i18n/LangProvider';
import { adminNav } from '../../../lib/i18n/dict/admin-nav';
import type { Lang } from '../../../lib/i18n/types';

/**
 * TEK kuyruk yüzeyi (redesign brief §5.3): dört ayrı kart yerine önem +
 * vade sıralı tek liste, üstte temanın nav-pills segment kontrolü.
 * Sıralama/segment kuralı `queue-model.ts`te — burada yalnız görünüm.
 * `QUEUE_SEGMENTS`in kendi `label`'ları `queue-model.ts`te kalır (Task 3
 * kapsamı bu dosyanın DIŞI — o dosya başka bir süpürme görevinin işi).
 */
const SEVERITY_DOT: Record<QueueRow['severity'], string> = {
  3: 'bg-danger',
  2: 'bg-warning',
  1: 'bg-info',
};

/** Wave B `notification-looks.ts` emsali: dil-anahtarlı, Mirror'lı, dosyada yaşar. */
const EMPTY_TEXT: Record<Lang, Record<QueueSegment, string>> = {
  en: {
    all: 'Nothing needs action right now.',
    trial: 'No trial needs attention.',
    entitlement: 'Nobody is over their seats.',
    billing: 'Nothing overdue.',
    activation: 'No customer is stuck onboarding.',
  },
  tr: {
    all: 'Şu anda eylem gerektiren bir şey yok.',
    trial: 'Dikkat gereken bir deneme yok.',
    entitlement: 'Koltuğunu aşan kimse yok.',
    billing: 'Gecikmiş bir şey yok.',
    activation: "Onboarding'de takılan bir müşteri yok.",
  },
};

export function AdminQueue({ rows }: { rows: QueueRow[] }) {
  const lang = useLang();
  const t = adminNav[lang].queue;
  const [segment, setSegment] = useState<QueueSegment>('all');
  const visible = filterQueue(rows, segment);

  const countFor = (s: QueueSegment) => filterQueue(rows, s).length;

  return (
    <div className="card">
      <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <h5 className="card-title mb-0">{t.title}</h5>
          <p className="card-subtitle text-body-secondary mt-1 mb-0">
            {t.subtitle}
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
        <AdminEmptyState icon="tabler-circle-check" text={EMPTY_TEXT[lang][segment]} />
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
                      aria-label={t.severityAria(row.severity)}
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
                      aria-label={t.openOrgAria(row.orgName)}
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
