'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

interface Result {
  orgs: Array<{ id: string; name: string; entitlementState: string }>;
  invoices: Array<{ id: string; number: string; orgId: string; orgName: string; status: string }>;
  users: Array<{ email: string; orgs: Array<{ id: string; name: string; role: string }> }>;
}

/**
 * Global arama — org adı (parça), fatura no (parça), üye e-postası (birebir;
 * parça araması bilinçli yok, gerekçe repo'da). Sonuç satırları org
 * detayına götürür; kişisel veri günlüğü orada devreye girer.
 */
export function AdminSearch() {
  const [q, setQ] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResult(null);
      return;
    }
    timer.current = window.setTimeout(() => {
      void fetch(`/api/admin/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: Result | null) => {
          setResult(data);
          setOpen(true);
        });
    }, 250);
    return () => window.clearTimeout(timer.current);
  }, [q]);

  const total = result ? result.orgs.length + result.invoices.length + result.users.length : 0;

  return (
    <div className="navbar-nav align-items-center me-auto position-relative" style={{ minWidth: 280 }}>
      <div className="input-group input-group-merge">
        <span className="input-group-text">
          <i className="icon-base ti tabler-search" aria-hidden="true" />
        </span>
        <input
          type="search"
          className="form-control"
          placeholder="Org name · invoice # · exact e-mail"
          aria-label="Search customers"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => result && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        />
      </div>

      {open && result && (
        <div
          className="card position-absolute shadow-lg w-100"
          style={{ top: '110%', zIndex: 1080, maxHeight: 420, overflowY: 'auto' }}
        >
          <div className="list-group list-group-flush">
            {result.orgs.map((o) => (
              <Link
                key={o.id}
                href={`/admin/orgs/${o.id}`}
                className="list-group-item list-group-item-action d-flex justify-content-between"
              >
                <span>
                  <i className="icon-base ti tabler-building me-2" aria-hidden="true" />
                  {o.name}
                </span>
                <span className="badge bg-label-secondary">{o.entitlementState}</span>
              </Link>
            ))}
            {result.invoices.map((i) => (
              <Link
                key={i.id}
                href={`/admin/orgs/${i.orgId}`}
                className="list-group-item list-group-item-action d-flex justify-content-between"
              >
                <span>
                  <i className="icon-base ti tabler-file-invoice me-2" aria-hidden="true" />
                  {i.number} · {i.orgName}
                </span>
                <span className="badge bg-label-secondary">{i.status}</span>
              </Link>
            ))}
            {result.users.flatMap((u) =>
              u.orgs.map((o) => (
                <Link
                  key={`${u.email}:${o.id}`}
                  href={`/admin/orgs/${o.id}`}
                  className="list-group-item list-group-item-action d-flex justify-content-between"
                >
                  <span>
                    <i className="icon-base ti tabler-user me-2" aria-hidden="true" />
                    {u.email}
                  </span>
                  <span className="badge bg-label-secondary">
                    {o.name} · {o.role}
                  </span>
                </Link>
              )),
            )}
            {total === 0 && (
              <div className="list-group-item text-body-secondary small">No matches.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
