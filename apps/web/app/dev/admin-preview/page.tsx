import { notFound } from 'next/navigation';

import { AdminShell } from '../../(admin)/AdminShell';
import { buildQueueRows } from '../../(admin)/queue-model';
import { CommandCenterView } from '../../(admin)/ui/CommandCenterView';
import type { CustomerRow } from '../../(admin)/ui/CustomerTable';
import { LangProvider } from '../../../lib/i18n/LangProvider';
import { getLang } from '../../../lib/i18n/lang.server';
import '../../(app)/panel-overrides.css';

/**
 * Komuta merkezinin DB'siz görsel provası — yalnız geliştirmede
 * (`/dev/render` emsali; üretimde 404). Redesign brief §12 ekran görüntüsü
 * karşılaştırması ister; personel oturumu ve canlı DB olmadan bakılabilen
 * tek yer burası. Örnek veri TEMSİLİDİR ve buradan öteye gitmez — üretim
 * sayfası aynı `CommandCenterView`ı gerçek repo verisiyle çizer.
 */
export default async function AdminPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  const lang = await getLang();

  const now = Date.UTC(2026, 7, 19, 9, 0);
  const DAY = 24 * 60 * 60 * 1000;

  const org = (over: Partial<Parameters<typeof buildQueueRows>[0][number]>) => ({
    id: 'o',
    name: 'Org',
    createdAt: new Date(now - 30 * DAY),
    priceVersion: '2026-08-07-usd-1-year',
    entitlementState: 'active',
    entitledSeats: 5,
    activeSeats: 3,
    trialEndsAt: null as Date | null,
    memberCount: 2,
    childCount: 0,
    lastActivityAt: new Date(now - 2 * DAY),
    ...over,
  });

  const orgs = [
    org({ id: 'a1', name: 'Northwind Studio', entitlementState: 'active', activeSeats: 12, entitledSeats: 15, memberCount: 4, lastActivityAt: new Date(now - 1 * DAY) }),
    org({ id: 'a2', name: 'Harbor & Lane Agency', entitlementState: 'active', activeSeats: 34, entitledSeats: 30, childCount: 6, memberCount: 3 }),
    org({ id: 'a3', name: 'Bristol Metalworks', entitlementState: 'trial', activeSeats: 2, entitledSeats: 5, trialEndsAt: new Date(now + 3 * DAY), memberCount: 1 }),
    org({ id: 'a4', name: 'Quiet Coast Consulting', entitlementState: 'trial', activeSeats: 0, entitledSeats: 5, trialEndsAt: new Date(now - 2 * DAY), createdAt: new Date(now - 12 * DAY), memberCount: 1, lastActivityAt: null }),
    org({ id: 'a5', name: 'Fieldnote Publishing', entitlementState: 'active', activeSeats: 7, entitledSeats: 10, memberCount: 2 }),
  ];

  const queues = {
    trialsEnding: [orgs[2]!],
    overEntitlement: [orgs[1]!],
    expiredTrials: [orgs[3]!],
    overdueInvoices: [
      {
        id: 'i1',
        number: 'MM-2026-0007',
        orgId: 'a5',
        orgName: 'Fieldnote Publishing',
        amountCents: 1000,
        currency: 'USD',
        dueAt: new Date(now - 9 * DAY),
        overdueDays: 9,
      },
    ],
  };

  const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
  const tableRows: CustomerRow[] = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    entitlementState: o.entitlementState,
    activeSeats: o.activeSeats,
    entitledSeats: o.entitledSeats,
    trialEndsAt: fmt(o.trialEndsAt),
    memberCount: o.memberCount,
    childCount: o.childCount,
    lastActivityAt: fmt(o.lastActivityAt),
    createdAt: fmt(o.createdAt)!,
  }));

  const activeSeats = orgs.reduce((s, o) => s + o.activeSeats, 0);
  const entitledSeats = orgs.reduce((s, o) => s + o.entitledSeats, 0);

  return (
    <>
      <link rel="stylesheet" href="/vuexy/core.css" />
      <link rel="stylesheet" href="/vuexy/icons.css" />
      <link rel="stylesheet" href="/vuexy/layout.css" />
      <LangProvider lang={lang}>
      <AdminShell email="staff@voldi.net">
        <CommandCenterView
          customerCount={orgs.length}
          queueRows={buildQueueRows(orgs, queues, now)}
          tableRows={tableRows}
          totals={{
            activeSeats,
            entitledSeats,
            seatPct: Math.min(100, (activeSeats / entitledSeats) * 100),
            listPriceCents: activeSeats * 100,
            workspaceCount: orgs.reduce((sum, o) => sum + 1 + o.childCount, 0),
            activityCoverage: orgs.filter((o) => o.lastActivityAt !== null).length,
            activityCoveragePct:
              (orgs.filter((o) => o.lastActivityAt !== null).length / orgs.length) * 100,
          }}
          customerStates={{ active: 3, trial: 2, pastDue: 0, cancelled: 0 }}
          financials={{
            currency: 'USD',
            billedCents: 9200,
            collectedCents: 7000,
            outstandingCents: 2200,
            invoiceCount: 8,
            paidCount: 6,
            dueCount: 2,
            voidCount: 1,
            excludedCurrencyRows: 0,
          }}
          audit={{
            reads24h: 7,
            writes24h: 2,
            events: [
              {
                id: 'ev1',
                kind: 'read',
                staffEmail: 'staff@voldi.net',
                orgName: 'Harbor & Lane Agency',
                label: 'Viewed Signatures',
                detail: 'customer data',
                createdAt: now - 18 * 60 * 1000,
              },
              {
                id: 'ev2',
                kind: 'write',
                staffEmail: 'billing@voldi.net',
                orgName: 'Fieldnote Publishing',
                label: 'Invoice Marked Paid',
                detail: 'Bank transfer reconciled',
                createdAt: now - 72 * 60 * 1000,
              },
              {
                id: 'ev3',
                kind: 'read',
                staffEmail: 'support@voldi.net',
                orgName: 'Northwind Studio',
                label: 'Viewed Senders',
                detail: 'customer data',
                createdAt: now - 3 * 60 * 60 * 1000,
              },
            ],
          }}
          trialsEndingCount={1}
          overdueCount={1}
          nextTrialEnd={fmt(queues.trialsEnding[0]!.trialEndsAt)}
          now={now}
        />
      </AdminShell>
      </LangProvider>
    </>
  );
}
