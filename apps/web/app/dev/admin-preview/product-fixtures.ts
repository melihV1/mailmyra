import type { ProductAnalyticsSnapshot } from '../../(admin)/product-analytics-model';

export const productPreviewNow = Date.UTC(2026, 7, 20, 9, 0);
const day = 86_400_000;
const iso = (offset: number) => new Date(productPreviewNow + offset * day).toISOString();

export const productPreviewSource: ProductAnalyticsSnapshot = {
  organizations: [
    { id: 'o1', name: 'Bristol Metalworks', entitlementState: 'past_due', createdAt: iso(-250), memberCount: 5, signatureCount: 14, senderCount: 50, activeSenderCount: 48, exportedSenderCount: 43, lastActivityAt: iso(-2) },
    { id: 'o2', name: 'Harbor & Lane Agency', entitlementState: 'active', createdAt: iso(-310), memberCount: 9, signatureCount: 32, senderCount: 126, activeSenderCount: 120, exportedSenderCount: 116, lastActivityAt: iso(-1) },
    { id: 'o3', name: 'Northwind Studio', entitlementState: 'active', createdAt: iso(-170), memberCount: 4, signatureCount: 9, senderCount: 27, activeSenderCount: 25, exportedSenderCount: 22, lastActivityAt: iso(-18) },
    { id: 'o4', name: 'Quiet Coast Consulting', entitlementState: 'trial', createdAt: iso(-8), memberCount: 2, signatureCount: 2, senderCount: 3, activeSenderCount: 0, exportedSenderCount: 0, lastActivityAt: iso(-2) },
    { id: 'o5', name: 'Atlas Field Services', entitlementState: 'active', createdAt: iso(-430), memberCount: 7, signatureCount: 18, senderCount: 62, activeSenderCount: 60, exportedSenderCount: 58, lastActivityAt: iso(-3) },
    { id: 'o6', name: 'Fieldnote Publishing', entitlementState: 'trial', createdAt: iso(-16), memberCount: 3, signatureCount: 4, senderCount: 42, activeSenderCount: 40, exportedSenderCount: 21, lastActivityAt: iso(-32) },
    { id: 'o7', name: 'Morrow Architecture', entitlementState: 'trial', createdAt: iso(-42), memberCount: 1, signatureCount: 1, senderCount: 1, activeSenderCount: 0, exportedSenderCount: 0, lastActivityAt: iso(-39) },
    { id: 'o8', name: 'Copperline Systems', entitlementState: 'active', createdAt: iso(-77), memberCount: 3, signatureCount: 7, senderCount: 18, activeSenderCount: 18, exportedSenderCount: 18, lastActivityAt: iso(-6) },
    { id: 'o9', name: 'Slate & Finch', entitlementState: 'trial', createdAt: iso(-112), memberCount: 1, signatureCount: 0, senderCount: 0, activeSenderCount: 0, exportedSenderCount: 0, lastActivityAt: null },
    { id: 'o10', name: 'Bluehaven Logistics', entitlementState: 'active', createdAt: iso(-145), memberCount: 4, signatureCount: 6, senderCount: 22, activeSenderCount: 20, exportedSenderCount: 17, lastActivityAt: iso(-12) },
  ],
  signatures: [
    { id: 's1', orgId: 'o1', orgName: 'Bristol Metalworks', templateId: 'classic-horizontal', createdAt: iso(-220), updatedAt: iso(-2), assigned: true, size: 'medium', iconStyle: 'mono', hasCta: true, hasLogo: true, hasAvatar: true },
    { id: 's2', orgId: 'o1', orgName: 'Bristol Metalworks', templateId: 'stacked-minimal', createdAt: iso(-180), updatedAt: iso(-34), assigned: true, size: 'small', iconStyle: 'outline', hasCta: false, hasLogo: true, hasAvatar: false },
    { id: 's3', orgId: 'o2', orgName: 'Harbor & Lane Agency', templateId: 'card-bordered', createdAt: iso(-290), updatedAt: iso(-1), assigned: true, size: 'large', iconStyle: 'filled', hasCta: true, hasLogo: true, hasAvatar: true },
    { id: 's4', orgId: 'o2', orgName: 'Harbor & Lane Agency', templateId: 'classic-horizontal', createdAt: iso(-260), updatedAt: iso(-5), assigned: true, size: 'medium', iconStyle: 'mono', hasCta: true, hasLogo: true, hasAvatar: false },
    { id: 's5', orgId: 'o2', orgName: 'Harbor & Lane Agency', templateId: 'classic-horizontal', createdAt: iso(-210), updatedAt: iso(-48), assigned: false, size: 'medium', iconStyle: 'outline', hasCta: false, hasLogo: true, hasAvatar: true },
    { id: 's6', orgId: 'o3', orgName: 'Northwind Studio', templateId: 'stacked-minimal', createdAt: iso(-150), updatedAt: iso(-18), assigned: true, size: 'small', iconStyle: 'mono', hasCta: false, hasLogo: true, hasAvatar: false },
    { id: 's7', orgId: 'o4', orgName: 'Quiet Coast Consulting', templateId: 'classic-horizontal', createdAt: iso(-7), updatedAt: iso(-1), assigned: false, size: 'medium', iconStyle: 'mono', hasCta: false, hasLogo: false, hasAvatar: true },
    { id: 's8', orgId: 'o5', orgName: 'Atlas Field Services', templateId: 'card-bordered', createdAt: iso(-390), updatedAt: iso(-3), assigned: true, size: 'large', iconStyle: 'filled', hasCta: true, hasLogo: true, hasAvatar: false },
    { id: 's9', orgId: 'o6', orgName: 'Fieldnote Publishing', templateId: 'classic-horizontal', createdAt: iso(-15), updatedAt: iso(-7), assigned: true, size: 'medium', iconStyle: 'outline', hasCta: true, hasLogo: true, hasAvatar: true },
    { id: 's10', orgId: 'o7', orgName: 'Morrow Architecture', templateId: 'stacked-minimal', createdAt: iso(-40), updatedAt: iso(-40), assigned: false, size: 'small', iconStyle: 'mono', hasCta: false, hasLogo: false, hasAvatar: false },
    { id: 's11', orgId: 'o8', orgName: 'Copperline Systems', templateId: 'card-bordered', createdAt: iso(-70), updatedAt: iso(-6), assigned: true, size: 'large', iconStyle: 'filled', hasCta: true, hasLogo: true, hasAvatar: true },
    { id: 's12', orgId: 'o10', orgName: 'Bluehaven Logistics', templateId: 'classic-horizontal', createdAt: iso(-140), updatedAt: iso(-12), assigned: true, size: 'medium', iconStyle: 'mono', hasCta: false, hasLogo: true, hasAvatar: true },
  ],
  senders: [
    { id: 'p1', orgId: 'o1', createdAt: iso(-220), publishedAt: iso(-218), deactivatedAt: null, lastExportedAt: iso(-2) },
    { id: 'p2', orgId: 'o2', createdAt: iso(-290), publishedAt: iso(-285), deactivatedAt: null, lastExportedAt: iso(-1) },
    { id: 'p3', orgId: 'o3', createdAt: iso(-150), publishedAt: iso(-145), deactivatedAt: null, lastExportedAt: iso(-95) },
    { id: 'p4', orgId: 'o4', createdAt: iso(-7), publishedAt: null, deactivatedAt: null, lastExportedAt: null },
    { id: 'p5', orgId: 'o5', createdAt: iso(-390), publishedAt: iso(-380), deactivatedAt: null, lastExportedAt: iso(-3) },
    { id: 'p6', orgId: 'o6', createdAt: iso(-15), publishedAt: iso(-13), deactivatedAt: null, lastExportedAt: null },
    { id: 'p7', orgId: 'o8', createdAt: iso(-70), publishedAt: iso(-68), deactivatedAt: null, lastExportedAt: iso(-6) },
    { id: 'p8', orgId: 'o10', createdAt: iso(-140), publishedAt: iso(-138), deactivatedAt: null, lastExportedAt: iso(-12) },
  ],
  events: [
    { id: 'e1', orgId: 'o2', orgName: 'Harbor & Lane Agency', type: 'export.zip', createdAt: iso(-1), fileCount: 24, senderCount: 24 },
    { id: 'e2', orgId: 'o1', orgName: 'Bristol Metalworks', type: 'sender.published', createdAt: iso(-2), fileCount: 0, senderCount: 0 },
    { id: 'e3', orgId: 'o5', orgName: 'Atlas Field Services', type: 'brand.saved', createdAt: iso(-3), fileCount: 0, senderCount: 0 },
    { id: 'e4', orgId: 'o8', orgName: 'Copperline Systems', type: 'export.zip', createdAt: iso(-6), fileCount: 18, senderCount: 18 },
    { id: 'e5', orgId: 'o6', orgName: 'Fieldnote Publishing', type: 'sender.published', createdAt: iso(-13), fileCount: 0, senderCount: 0 },
    { id: 'e6', orgId: 'o3', orgName: 'Northwind Studio', type: 'export.zip', createdAt: iso(-35), fileCount: 12, senderCount: 12 },
    { id: 'e7', orgId: 'o10', orgName: 'Bluehaven Logistics', type: 'brand.saved', createdAt: iso(-48), fileCount: 0, senderCount: 0 },
    { id: 'e8', orgId: 'o5', orgName: 'Atlas Field Services', type: 'export.zip', createdAt: iso(-65), fileCount: 60, senderCount: 60 },
    { id: 'e9', orgId: 'o8', orgName: 'Copperline Systems', type: 'sender.published', createdAt: iso(-68), fileCount: 0, senderCount: 0 },
    { id: 'e10', orgId: 'o3', orgName: 'Northwind Studio', type: 'brand.saved', createdAt: iso(-96), fileCount: 0, senderCount: 0 },
    { id: 'e11', orgId: 'o10', orgName: 'Bluehaven Logistics', type: 'export.zip', createdAt: iso(-112), fileCount: 20, senderCount: 20 },
    { id: 'e12', orgId: 'o1', orgName: 'Bristol Metalworks', type: 'export.zip', createdAt: iso(-152), fileCount: 40, senderCount: 40 },
  ],
};
