import type { StaffAccessLogRow } from '../../(admin)/access-log-model';
import type { AdminActionLogRow } from '../../(admin)/action-log-model';

import { previewNow } from './operations-fixtures';

const minute = 60 * 1000;
const hour = 60 * minute;
const day = 24 * hour;
const iso = (value: number) => new Date(value).toISOString();

export const previewGovernanceAccess: StaffAccessLogRow[] = [
  { id: 'ga-1', staffEmail: 'support@mailmyra.com', orgId: 'o1', orgName: 'Bristol Metalworks', scope: 'signature', targetId: 'sig-1', ip: '192.0.2.14', userAgent: 'Chrome', createdAt: iso(previewNow - 2 * minute) },
  { id: 'ga-2', staffEmail: 'support@mailmyra.com', orgId: 'o1', orgName: 'Bristol Metalworks', scope: 'signatures', targetId: null, ip: '192.0.2.14', userAgent: 'Chrome', createdAt: iso(previewNow - 4 * minute) },
  { id: 'ga-3', staffEmail: 'support@mailmyra.com', orgId: 'o1', orgName: 'Bristol Metalworks', scope: 'senders', targetId: null, ip: '192.0.2.14', userAgent: 'Chrome', createdAt: iso(previewNow - 6 * minute) },
  { id: 'ga-4', staffEmail: 'support@mailmyra.com', orgId: 'o1', orgName: 'Bristol Metalworks', scope: 'members', targetId: null, ip: '192.0.2.14', userAgent: 'Chrome', createdAt: iso(previewNow - 8 * minute) },
  { id: 'ga-5', staffEmail: 'support@mailmyra.com', orgId: 'o1', orgName: 'Bristol Metalworks', scope: 'org', targetId: 'o1', ip: '192.0.2.14', userAgent: 'Chrome', createdAt: iso(previewNow - 10 * minute) },
  { id: 'ga-6', staffEmail: 'billing@mailmyra.com', orgId: 'o2', orgName: 'Harbor & Lane Agency', scope: 'org', targetId: 'o2', ip: '198.51.100.8', userAgent: 'Safari', createdAt: iso(previewNow - 2 * hour) },
  { id: 'ga-7', staffEmail: 'security@mailmyra.com', orgId: 'o3', orgName: 'Northwind Studio', scope: 'signatures', targetId: null, ip: '203.0.113.5', userAgent: 'Chrome', createdAt: iso(previewNow - day) },
];

export const previewGovernanceActions: AdminActionLogRow[] = [
  { id: 'gw-1', staffEmail: 'support@mailmyra.com', orgId: 'o1', orgName: 'Bristol Metalworks', action: 'entitlement.set', targetId: null, before: { entitledSeats: 40 }, after: { entitledSeats: 55 }, reason: 'Approved annual plan.', ip: '192.0.2.18', userAgent: 'Chrome', createdAt: iso(previewNow - 18 * minute) },
  { id: 'gw-2', staffEmail: 'billing@mailmyra.com', orgId: 'o2', orgName: 'Harbor & Lane Agency', action: 'invoice.created', targetId: 'invoice-0142', before: {}, after: { amountCents: 12000 }, reason: 'Issued confirmed annual invoice.', ip: '192.0.2.22', userAgent: 'Chrome', createdAt: iso(previewNow - 73 * minute) },
  { id: 'gw-3', staffEmail: 'billing@mailmyra.com', orgId: 'o3', orgName: 'Northwind Studio', action: 'invoice.status_set', targetId: 'invoice-0139', before: { status: 'due' }, after: { status: 'paid' }, reason: 'Matched bank transfer.', ip: '192.0.2.22', userAgent: 'Chrome', createdAt: iso(previewNow - 4 * hour) },
];
