import { notFound } from 'next/navigation';

import { AdminShell } from '../../../(admin)/AdminShell';
import type { StaffAccessLogRow } from '../../../(admin)/access-log-model';
import { AdminPageHeader } from '../../../(admin)/ui/AdminPageHeader';
import { StaffAccessLogView } from '../../../(admin)/ui/StaffAccessLogView';
import '../../../(app)/panel-overrides.css';

export default function StaffAccessPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const now = Date.UTC(2026, 7, 20, 8, 30);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const iso = (time: number) => new Date(time).toISOString();
  const chrome = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/139.0.0.0 Safari/537.36';
  const safari = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.6 Safari/605.1.15';

  const rows: StaffAccessLogRow[] = [
    { id: 'access-001', staffEmail: 'support@voldi.net', orgId: 'org-1', orgName: 'Bristol Metalworks', scope: 'signature', targetId: 'sig_01J5V9QJ6H4R8AM2', ip: '192.0.2.14', userAgent: chrome, createdAt: iso(now - 2 * minute) },
    { id: 'access-002', staffEmail: 'support@voldi.net', orgId: 'org-1', orgName: 'Bristol Metalworks', scope: 'signatures', targetId: null, ip: '192.0.2.14', userAgent: chrome, createdAt: iso(now - 4 * minute) },
    { id: 'access-003', staffEmail: 'support@voldi.net', orgId: 'org-1', orgName: 'Bristol Metalworks', scope: 'senders', targetId: null, ip: '192.0.2.14', userAgent: chrome, createdAt: iso(now - 6 * minute) },
    { id: 'access-004', staffEmail: 'support@voldi.net', orgId: 'org-1', orgName: 'Bristol Metalworks', scope: 'signature', targetId: 'sig_01J5V9QK8P1F3TK7', ip: '192.0.2.14', userAgent: chrome, createdAt: iso(now - 8 * minute) },
    { id: 'access-005', staffEmail: 'support@voldi.net', orgId: 'org-1', orgName: 'Bristol Metalworks', scope: 'org', targetId: 'org-1', ip: '192.0.2.14', userAgent: chrome, createdAt: iso(now - 10 * minute) },
    { id: 'access-006', staffEmail: 'billing@voldi.net', orgId: 'org-2', orgName: 'Harbor & Lane Agency', scope: 'org', targetId: 'org-2', ip: '198.51.100.8', userAgent: safari, createdAt: iso(now - 47 * minute) },
    { id: 'access-007', staffEmail: 'melih@voldi.net', orgId: 'org-3', orgName: 'Northwind Studio', scope: 'signatures', targetId: null, ip: '203.0.113.5', userAgent: chrome, createdAt: iso(now - 3 * hour) },
    { id: 'access-008', staffEmail: 'support@voldi.net', orgId: 'org-4', orgName: 'Quiet Coast Consulting', scope: 'senders', targetId: null, ip: '192.0.2.14', userAgent: chrome, createdAt: iso(now - day) },
    { id: 'access-009', staffEmail: 'melih@voldi.net', orgId: 'org-5', orgName: 'Atlas Field Services', scope: 'signature', targetId: 'sig_01J5W20M3T9J7R5A', ip: '203.0.113.5', userAgent: chrome, createdAt: iso(now - 4 * day) },
    { id: 'access-010', staffEmail: 'support@voldi.net', orgId: 'org-6', orgName: 'Fieldnote Publishing', scope: 'org', targetId: 'org-6', ip: null, userAgent: null, createdAt: iso(now - 16 * day) },
  ];

  return (
    <>
      <link rel="stylesheet" href="/vuexy/core.css" />
      <link rel="stylesheet" href="/vuexy/icons.css" />
      <link rel="stylesheet" href="/vuexy/layout.css" />
      <AdminShell email="staff@voldi.net">
        <section>
          <AdminPageHeader
            crumb="Security & governance / Staff access log"
            title="Staff access log"
            support="Trace every sensitive customer read without changing the immutable audit record."
          />
          <StaffAccessLogView rows={rows} now={now} />
        </section>
      </AdminShell>
    </>
  );
}
