import { prisma } from '../lib/db';

/** Testler arası tam temizlik. Sıra önemli: çocuklar önce. */
export async function truncateAll() {
  await prisma.$transaction([
    // Onay/denetim satırları — `ApprovalEvent`/`ApprovalDecision`nın
    // `ApprovalRequest`e FK'sı `Restrict`, çocuklar önce gitmeli.
    prisma.approvalEvent.deleteMany(),
    prisma.approvalDecision.deleteMany(),
    prisma.approvalRequest.deleteMany(),
    prisma.adminAction.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.staffAccess.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.activityEvent.deleteMany(),
    prisma.notificationPreference.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.legalAcceptance.deleteMany(),
    prisma.signature.deleteMany(),
    prisma.brandSetting.deleteMany(),
    prisma.senderIdentity.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.emailToken.deleteMany(),
    prisma.session.deleteMany(),
    prisma.asset.deleteMany(),
    prisma.authAttempt.deleteMany(),
    // Org ağacı kendine referans veriyor ve `Restrict`; çocuklar önce gitmeli.
    prisma.organization.deleteMany({ where: { parentOrgId: { not: null } } }),
    prisma.organization.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
