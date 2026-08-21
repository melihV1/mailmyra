import type { InvoiceWorkbenchRow } from '../../(admin)/invoice-workbench-model';
import type { ApprovalQueueRow, CustomerUserRow, DataRequestRow, OperationsOrgRow, StaffAccountRow } from '../../(admin)/operations-model';

export const previewNow = Date.UTC(2026, 7, 20, 9, 0);
const day = 24 * 60 * 60 * 1000;
const iso = (offset: number) => new Date(previewNow + offset * day).toISOString();

export const previewInvoices: InvoiceWorkbenchRow[] = [
  { id: 'i1', number: 'MM-2026-0142', orgId: 'o1', orgName: 'Bristol Metalworks', issuedAt: iso(-37), dueAt: iso(-7), seats: 48, amountCents: 4800, currency: 'USD', status: 'due', paidAt: null, paymentMethod: null, paymentReference: null, note: null },
  { id: 'i2', number: 'MM-2026-0141', orgId: 'o2', orgName: 'Harbor & Lane Agency', issuedAt: iso(-18), dueAt: iso(5), seats: 120, amountCents: 12000, currency: 'USD', status: 'due', paidAt: null, paymentMethod: null, paymentReference: null, note: null },
  { id: 'i3', number: 'MM-2026-0139', orgId: 'o3', orgName: 'Northwind Studio', issuedAt: iso(-46), dueAt: iso(-16), seats: 25, amountCents: 2500, currency: 'USD', status: 'paid', paidAt: iso(-20), paymentMethod: 'bank_transfer', paymentReference: 'TRX-804922', note: null },
  { id: 'i4', number: 'MM-2026-0137', orgId: 'o4', orgName: 'Quiet Coast Consulting', issuedAt: iso(-75), dueAt: iso(-45), seats: 8, amountCents: 800, currency: 'USD', status: 'void', paidAt: null, paymentMethod: null, paymentReference: null, note: null },
  { id: 'i5', number: 'MM-2026-0136', orgId: 'o5', orgName: 'Atlas Field Services', issuedAt: iso(-88), dueAt: null, seats: 60, amountCents: 6000, currency: 'USD', status: 'paid', paidAt: iso(-80), paymentMethod: 'cash', paymentReference: 'CASH-19', note: null },
  { id: 'i6', number: 'MM-EU-2026-003', orgId: 'o6', orgName: 'Fieldnote Publishing', issuedAt: iso(-12), dueAt: iso(18), seats: 40, amountCents: 4000, currency: 'EUR', status: 'due', paidAt: null, paymentMethod: null, paymentReference: null, note: null },
];

export const previewOrganizations: OperationsOrgRow[] = [
  { id: 'o1', name: 'Bristol Metalworks', entitlementState: 'past_due', entitledSeats: 45, activeSeats: 48, trialEndsAt: null, memberCount: 5, childCount: 0, lastActivityAt: iso(-2), createdAt: iso(-250) },
  { id: 'o2', name: 'Harbor & Lane Agency', entitlementState: 'active', entitledSeats: 125, activeSeats: 120, trialEndsAt: null, memberCount: 9, childCount: 6, lastActivityAt: iso(-1), createdAt: iso(-310) },
  { id: 'o3', name: 'Northwind Studio', entitlementState: 'active', entitledSeats: 30, activeSeats: 25, trialEndsAt: null, memberCount: 4, childCount: 0, lastActivityAt: iso(-18), createdAt: iso(-170) },
  { id: 'o4', name: 'Quiet Coast Consulting', entitlementState: 'trial', entitledSeats: 10, activeSeats: 3, trialEndsAt: iso(4), memberCount: 2, childCount: 0, lastActivityAt: null, createdAt: iso(-8) },
  { id: 'o5', name: 'Atlas Field Services', entitlementState: 'active', entitledSeats: 75, activeSeats: 60, trialEndsAt: null, memberCount: 7, childCount: 0, lastActivityAt: iso(-3), createdAt: iso(-430) },
  { id: 'o6', name: 'Fieldnote Publishing', entitlementState: 'trial', entitledSeats: 45, activeSeats: 40, trialEndsAt: iso(-2), memberCount: 3, childCount: 0, lastActivityAt: iso(-32), createdAt: iso(-16) },
];

export const previewUsers: CustomerUserRow[] = [
  { id: 'u1', email: 'melis@bristol.example', avatarUrl: null, createdAt: iso(-190), lastLoginAt: iso(-1), emailVerifiedAt: iso(-189), memberships: [{ orgId: 'o1', orgName: 'Bristol Metalworks', role: 'owner', joinedAt: iso(-190) }] },
  { id: 'u2', email: 'ops@harborlane.example', avatarUrl: null, createdAt: iso(-280), lastLoginAt: iso(-2), emailVerifiedAt: iso(-279), memberships: [{ orgId: 'o2', orgName: 'Harbor & Lane Agency', role: 'admin', joinedAt: iso(-280) }, { orgId: 'o3', orgName: 'Northwind Studio', role: 'viewer', joinedAt: iso(-120) }] },
  { id: 'u3', email: 'alex@northwind.example', avatarUrl: null, createdAt: iso(-160), lastLoginAt: iso(-18), emailVerifiedAt: iso(-158), memberships: [{ orgId: 'o3', orgName: 'Northwind Studio', role: 'owner', joinedAt: iso(-160) }] },
  { id: 'u4', email: 'hello@quietcoast.example', avatarUrl: null, createdAt: iso(-8), lastLoginAt: null, emailVerifiedAt: null, memberships: [{ orgId: 'o4', orgName: 'Quiet Coast Consulting', role: 'owner', joinedAt: iso(-8) }] },
];

export const previewStaff: StaffAccountRow[] = [
  { id: 's1', email: 'support@mailmyra.com', avatarUrl: null, createdAt: iso(-400), lastLoginAt: iso(0) },
  { id: 's2', email: 'billing@mailmyra.com', avatarUrl: null, createdAt: iso(-350), lastLoginAt: iso(-1) },
  { id: 's3', email: 'security@mailmyra.com', avatarUrl: null, createdAt: iso(-210), lastLoginAt: iso(-4) },
];

export const previewApprovals: ApprovalQueueRow[] = [
  { id: 'a1', title: 'Increase entitlement to 180 seats', domain: 'Entitlement', requester: 'support@mailmyra.com', customer: 'Harbor & Lane Agency', risk: 'high', status: 'pending', requestedAt: iso(-1), requiredApprovals: 2, approvals: 1 },
  { id: 'a2', title: 'Void duplicate annual invoice', domain: 'Billing', requester: 'billing@mailmyra.com', customer: 'Quiet Coast Consulting', risk: 'critical', status: 'pending', requestedAt: iso(-2), requiredApprovals: 2, approvals: 0 },
  { id: 'a3', title: 'Extend assisted trial by 7 days', domain: 'Trial', requester: 'support@mailmyra.com', customer: 'Fieldnote Publishing', risk: 'medium', status: 'approved', requestedAt: iso(-4), requiredApprovals: 1, approvals: 1 },
  { id: 'a4', title: 'Export audit evidence bundle', domain: 'Security', requester: 'security@mailmyra.com', customer: 'Bristol Metalworks', risk: 'high', status: 'rejected', requestedAt: iso(-7), requiredApprovals: 2, approvals: 0 },
];

export const previewDataRequests: DataRequestRow[] = [
  { id: 'd1', reference: 'KVKK-2026-018', subjectEmail: 'melis@bristol.example', customer: 'Bristol Metalworks', type: 'access', status: 'legal_review', receivedAt: iso(-24), dueAt: iso(3), owner: 'security@mailmyra.com', evidenceCount: 12, identityVerified: true },
  { id: 'd2', reference: 'KVKK-2026-019', subjectEmail: 'hello@quietcoast.example', customer: 'Quiet Coast Consulting', type: 'correction', status: 'identity_check', receivedAt: iso(-5), dueAt: iso(18), owner: 'support@mailmyra.com', evidenceCount: 2, identityVerified: false },
  { id: 'd3', reference: 'KVKK-2026-014', subjectEmail: 'former@atlas.example', customer: 'Atlas Field Services', type: 'erasure', status: 'in_progress', receivedAt: iso(-38), dueAt: iso(-3), owner: 'security@mailmyra.com', evidenceCount: 8, identityVerified: true },
  { id: 'd4', reference: 'KVKK-2026-011', subjectEmail: 'alex@northwind.example', customer: 'Northwind Studio', type: 'portability', status: 'completed', receivedAt: iso(-52), dueAt: iso(-20), owner: 'security@mailmyra.com', evidenceCount: 15, identityVerified: true },
];
