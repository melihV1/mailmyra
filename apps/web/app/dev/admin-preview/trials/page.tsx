import { notFound } from 'next/navigation';

import { AdminShell } from '../../../(admin)/AdminShell';
import type { TrialEntitlementRow } from '../../../(admin)/trials-model';
import { AdminPageHeader } from '../../../(admin)/ui/AdminPageHeader';
import { TrialsEntitlementsView } from '../../../(admin)/ui/TrialsEntitlementsView';
import '../../../(app)/panel-overrides.css';

export default function TrialsPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const now = Date.UTC(2026, 7, 20, 9, 0);
  const day = 24 * 60 * 60 * 1000;
  const iso = (time: number) => new Date(time).toISOString();
  const rows: TrialEntitlementRow[] = [
    {
      id: 'trial-1',
      name: 'Bristol Metalworks',
      entitlementState: 'trial',
      activeSeats: 2,
      entitledSeats: 5,
      trialEndsAt: iso(now + 3 * day),
      memberCount: 2,
      childCount: 0,
      lastActivityAt: iso(now - day),
      createdAt: iso(now - 4 * day),
    },
    {
      id: 'trial-2',
      name: 'Quiet Coast Consulting',
      entitlementState: 'trial',
      activeSeats: 0,
      entitledSeats: 3,
      trialEndsAt: iso(now - 2 * day),
      memberCount: 1,
      childCount: 0,
      lastActivityAt: null,
      createdAt: iso(now - 12 * day),
    },
    {
      id: 'trial-3',
      name: 'Harbor & Lane Agency',
      entitlementState: 'active',
      activeSeats: 34,
      entitledSeats: 30,
      trialEndsAt: null,
      memberCount: 4,
      childCount: 6,
      lastActivityAt: iso(now - 2 * 60 * 60 * 1000),
      createdAt: iso(now - 92 * day),
    },
    {
      id: 'trial-4',
      name: 'Atlas Field Services',
      entitlementState: 'trial',
      activeSeats: 1,
      entitledSeats: 5,
      trialEndsAt: null,
      memberCount: 1,
      childCount: 0,
      lastActivityAt: iso(now - 5 * day),
      createdAt: iso(now - 6 * day),
    },
    {
      id: 'trial-5',
      name: 'Northwind Studio',
      entitlementState: 'active',
      activeSeats: 12,
      entitledSeats: 15,
      trialEndsAt: null,
      memberCount: 5,
      childCount: 0,
      lastActivityAt: iso(now - 30 * 60 * 1000),
      createdAt: iso(now - 180 * day),
    },
    {
      id: 'trial-6',
      name: 'Fieldnote Publishing',
      entitlementState: 'past_due',
      activeSeats: 7,
      entitledSeats: 10,
      trialEndsAt: null,
      memberCount: 3,
      childCount: 0,
      lastActivityAt: iso(now - 4 * day),
      createdAt: iso(now - 210 * day),
    },
  ];

  return (
    <>
      <link rel="stylesheet" href="/vuexy/core.css" />
      <link rel="stylesheet" href="/vuexy/icons.css" />
      <link rel="stylesheet" href="/vuexy/layout.css" />
      <AdminShell email="staff@voldi.net">
        <section>
          <AdminPageHeader
            crumb="Customers / Trials & entitlements"
            title="Trials & entitlements"
            support="Follow trial deadlines and seat exceptions without changing customer data from the list."
          />
          <TrialsEntitlementsView rows={rows} now={now} />
        </section>
      </AdminShell>
    </>
  );
}
