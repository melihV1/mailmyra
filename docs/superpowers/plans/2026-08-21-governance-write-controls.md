# Governance Write Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make approval requests and KVKK requests writable from the staff panel — create + full lifecycle — under the existing security contract (staff gate, mandatory reason, single transaction with audit, honest errors).

**Architecture:** 9 new gated write functions in `apps/web/lib/repo/admin.ts` mirroring `markInvoicePaid` exactly (requireStaff → requireReason → `$transaction`: work + event-ledger row + `audit()`); pure legal-deadline math in a new `lib/kvkk.ts` (enumeration test forces gates on every admin.ts export, so pure helpers live outside). 9 thin API routes on the `_shared.ts` contract (NotStaff → 404). UI: row-action + dialog client components following `InvoiceRowActions.tsx` verbatim, rendered inside the existing Codex views only when `preview === false`.

**Tech Stack:** TypeScript, Prisma (MariaDB), Next.js App Router, vitest.

**Spec:** `docs/superpowers/specs/2026-08-21-governance-write-controls-design.md` — the contract. Read it first.

## Global Constraints

- Work in the MAIN worktree `/Users/mmacstudio/Desktop/mailmyra-work` on branch `main`; commit after every task. npm only.
- Code comments Turkish, identifiers/commits English.
- **Write contract (from admin.ts header, protected by 49 tests):** every write demands a reason (`requireReason`); work + audit in ONE `$transaction` — audit unwritable ⇒ rollback; P2002 → friendly Turkish message.
- **Deliberate deviation (spec):** governance writes do NOT write `customerActivity` — the customer-visible feed must not reveal governance operations.
- **Personal data:** `subjectEmail` never appears in any `AdminAction` before/after payload or `KvkkEvent`/`ApprovalEvent` payload. Org-less records audit under the sentinel `{ id: 'platform', name: 'Mailmyra platform' }`.
- **Statutory deadline:** `statutoryDueAt` = `receivedAt` + exactly 30 × 24h, computed by code (`lib/kvkk.ts`), never user-supplied.
- **Codex UI rules:** shell/menu untouched; no new top-level routes; view edits are additive only (action cluster gated by `preview === false`); markup copied from existing Vuexy patterns (`InvoiceRowActions.tsx`, `StaffDialog`), never invented.
- The gate test `apps/web/test/admin-staff-gate.test.ts` walks ALL admin.ts exports via its `CALLS` map — every new export MUST get a CALLS entry (Task 1/2 include them) or the suite fails.
- No new dependencies. No schema changes (tables exist since `20260821085357`).

---

### Task 1: Approval write functions (repo + tests)

**Files:**
- Modify: `apps/web/lib/repo/admin.ts` (extend `audit()` action union; add 3 functions + consts near the other write functions, after `markInvoicePaid`)
- Modify: `apps/web/test/admin-staff-gate.test.ts` (CALLS entries + tx-mock models + reason-list entries)
- Create: `apps/web/test/admin-approval-writes.test.ts`

**Interfaces:**
- Consumes: `requireStaff`, `requireReason`, `audit`, `StaffContext`, `prisma` (all existing in admin.ts).
- Produces (Task 3 calls these):
  - `APPROVAL_POLICY_VERSION = '2026-08-21'`
  - `type ApprovalDomain = 'entitlement' | 'billing' | 'security' | 'platform'`
  - `type ApprovalRisk = 'medium' | 'high' | 'critical'`
  - `createApprovalRequest(staffUserId, input: { title: string; domain: ApprovalDomain; riskLevel: ApprovalRisk; orgId?: string; targetType?: string; targetId?: string; requiredApprovals?: number }, reason: string, ctx?: StaffContext): Promise<{ id: string }>`
  - `decideApproval(staffUserId, requestId: string, decision: 'approve' | 'reject', reason: string, ctx?: StaffContext): Promise<{ status: 'pending' | 'approved' | 'rejected' }>`
  - `cancelApprovalRequest(staffUserId, requestId: string, reason: string, ctx?: StaffContext): Promise<void>`
  - Shared internal helper `resolveGovernanceOrg(tx, orgId?)` and `const PLATFORM_ORG` (Task 2 reuses both).

- [ ] **Step 1: Extend the `audit()` action union** in admin.ts — replace the `action:` line inside `audit`'s entry type:

```ts
    action:
      | 'entitlement.set'
      | 'invoice.created'
      | 'invoice.status_set'
      | 'approval.created'
      | 'approval.decided'
      | 'approval.cancelled'
      | 'kvkk.created'
      | 'kvkk.identity_verified'
      | 'kvkk.owner_assigned'
      | 'kvkk.evidence_added'
      | 'kvkk.status_changed'
      | 'kvkk.completed';
```

- [ ] **Step 2: Write the failing tests** — create `apps/web/test/admin-approval-writes.test.ts`. Mirror the mocking style of `admin-staff-gate.test.ts` (vi.mock `../lib/db`, a `tx` object handed to the `$transaction` callback). Complete file:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Onay yazmalarının sözleşmesi: pending dışına karar yok · tek reject
 * kapatır · onay eşiği requiredApprovals'a saygı duyar · aynı onaycı
 * ikinci karar yazamaz (P2002 dostu mesaj) · denetim aynı transaction'da ·
 * org'suz talep platform nöbetçisiyle denetlenir.
 */

const userFindUnique = vi.fn();

const tx = {
  organization: { findUnique: vi.fn() },
  approvalRequest: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  approvalDecision: { create: vi.fn(), count: vi.fn() },
  approvalEvent: { create: vi.fn() },
  adminAction: { create: vi.fn() },
};

const transaction = vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));

vi.mock('../lib/db', () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => userFindUnique(...a) },
    $transaction: (...a: unknown[]) => transaction(...(a as [never])),
  },
}));

const admin = await import('../lib/repo/admin');

beforeEach(() => {
  vi.clearAllMocks();
  userFindUnique.mockResolvedValue({ isStaff: true, email: 'staff@voldi.net', id: 'u1' });
  tx.organization.findUnique.mockResolvedValue({ id: 'org1', name: 'Acme' });
  tx.approvalRequest.create.mockResolvedValue({ id: 'req1' });
  tx.approvalRequest.findUnique.mockResolvedValue({
    status: 'pending',
    title: 'Koltuk artışı',
    requiredApprovals: 1,
    orgId: 'org1',
    orgName: 'Acme',
  });
  tx.approvalRequest.update.mockResolvedValue({});
  tx.approvalDecision.create.mockResolvedValue({});
  tx.approvalDecision.count.mockResolvedValue(1);
  tx.approvalEvent.create.mockResolvedValue({});
  tx.adminAction.create.mockResolvedValue({});
});

describe('createApprovalRequest', () => {
  const input = { title: 'Koltuk artışı', domain: 'entitlement', riskLevel: 'high' } as const;

  it('talep + created olayı + denetim aynı transaction içinde', async () => {
    const res = await admin.createApprovalRequest('u1', { ...input, orgId: 'org1' }, 'müşteri istedi');

    expect(res).toEqual({ id: 'req1' });
    expect(transaction).toHaveBeenCalledOnce();
    expect(tx.approvalRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: undefined, // status şemadaki default'a bırakılır ('pending')
          policyVersion: admin.APPROVAL_POLICY_VERSION,
          requestedByEmail: 'staff@voldi.net',
          requiredApprovals: 1,
        }),
      }),
    );
    expect(tx.approvalEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'created' }) }),
    );
    expect(tx.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'approval.created', orgId: 'org1', orgName: 'Acme' }),
      }),
    );
  });

  it('org verilmemişse denetim platform nöbetçisine yazılır', async () => {
    await admin.createApprovalRequest('u1', input, 'platform işi');

    expect(tx.organization.findUnique).not.toHaveBeenCalled();
    expect(tx.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orgId: 'platform', orgName: 'Mailmyra platform' }),
      }),
    );
  });

  it('bilinmeyen org transaction içinde keser', async () => {
    tx.organization.findUnique.mockResolvedValue(null);
    await expect(
      admin.createApprovalRequest('u1', { ...input, orgId: 'yok' }, 'sebep'),
    ).rejects.toThrow('bulunamadı');
    expect(tx.approvalRequest.create).not.toHaveBeenCalled();
  });

  it('requiredApprovals 1-3 dışında reddedilir, transaction açılmaz', async () => {
    await expect(
      admin.createApprovalRequest('u1', { ...input, requiredApprovals: 0 }, 'sebep'),
    ).rejects.toThrow('1-3');
    await expect(
      admin.createApprovalRequest('u1', { ...input, requiredApprovals: 4 }, 'sebep'),
    ).rejects.toThrow('1-3');
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe('decideApproval', () => {
  it('tek onay, eşik 1 → approved + kapanış alanları + iki olay', async () => {
    const res = await admin.decideApproval('u1', 'req1', 'approve', 'uygun');

    expect(res).toEqual({ status: 'approved' });
    expect(tx.approvalRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'approved', decidedByEmail: 'staff@voldi.net' }),
      }),
    );
    const eventTypes = tx.approvalEvent.create.mock.calls.map(
      (c) => (c[0] as { data: { type: string } }).data.type,
    );
    expect(eventTypes).toEqual(['decision_recorded', 'approved']);
  });

  it('eşik 2, ilk onay → pending kalır, kapanış yazılmaz', async () => {
    tx.approvalRequest.findUnique.mockResolvedValue({
      status: 'pending', title: 'T', requiredApprovals: 2, orgId: null, orgName: null,
    });
    tx.approvalDecision.count.mockResolvedValue(1);

    const res = await admin.decideApproval('u1', 'req1', 'approve', 'uygun');

    expect(res).toEqual({ status: 'pending' });
    expect(tx.approvalRequest.update).not.toHaveBeenCalled();
  });

  it('tek reject talebi kapatır', async () => {
    const res = await admin.decideApproval('u1', 'req1', 'reject', 'riskli');

    expect(res).toEqual({ status: 'rejected' });
    expect(tx.approvalRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'rejected' }) }),
    );
  });

  it('pending olmayan talebe karar yazılamaz', async () => {
    tx.approvalRequest.findUnique.mockResolvedValue({
      status: 'approved', title: 'T', requiredApprovals: 1, orgId: null, orgName: null,
    });
    await expect(admin.decideApproval('u1', 'req1', 'approve', 's')).rejects.toThrow(
      'artık kararda değil',
    );
    expect(tx.approvalDecision.create).not.toHaveBeenCalled();
  });

  it('aynı onaycının ikinci kararı P2002 → dostça mesaj', async () => {
    const { Prisma } = await import('@prisma/client');
    tx.approvalDecision.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
    );
    await expect(admin.decideApproval('u1', 'req1', 'approve', 's')).rejects.toThrow(
      'zaten karar yazdın',
    );
  });
});

describe('cancelApprovalRequest', () => {
  it('pending → cancelled + olay + denetim', async () => {
    await admin.cancelApprovalRequest('u1', 'req1', 'gerek kalmadı');

    expect(tx.approvalRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'cancelled' }) }),
    );
    expect(tx.approvalEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'cancelled' }) }),
    );
    expect(tx.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'approval.cancelled' }) }),
    );
  });

  it('pending olmayan iptal edilemez', async () => {
    tx.approvalRequest.findUnique.mockResolvedValue({
      status: 'rejected', title: 'T', requiredApprovals: 1, orgId: null, orgName: null,
    });
    await expect(admin.cancelApprovalRequest('u1', 'req1', 's')).rejects.toThrow(
      'artık kararda değil',
    );
  });
});
```

- [ ] **Step 3: Run — expect FAIL** (functions don't exist):

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm test -w apps/web -- admin-approval-writes
```

- [ ] **Step 4: Implement in admin.ts** (place after `markInvoicePaid`, before the queue section):

```ts
// ─── Yönetişim yazmaları: onay talepleri ─────────────────────────────────

/** Karar anındaki politika sürümü — talep satırına damgalanır. */
export const APPROVAL_POLICY_VERSION = '2026-08-21';

export type ApprovalDomain = 'entitlement' | 'billing' | 'security' | 'platform';
export type ApprovalRisk = 'medium' | 'high' | 'critical';

/** Org'suz yönetişim kaydının denetimdeki nöbetçi kimliği. */
const PLATFORM_ORG = { id: 'platform', name: 'Mailmyra platform' } as const;

/** Org verilmişse GERÇEKTEN var olmalı (adı kopyalanır); yoksa nöbetçi. */
async function resolveGovernanceOrg(
  tx: Prisma.TransactionClient,
  orgId: string | undefined,
): Promise<{ id: string; name: string }> {
  if (!orgId) return PLATFORM_ORG;
  const org = await tx.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  });
  if (!org) throw new Error(`Organizasyon ${orgId} bulunamadı.`);
  return org;
}

/**
 * Onay talebi açar. Not: onaylanan talep HİÇBİR ŞEYİ otomatik uygulamaz —
 * bu bir karar defteridir; riskli değişikliğin kendisi mevcut yazma
 * fonksiyonlarıyla yapılır. Müşteri aktivitesi BİLEREK yazılmaz: iç
 * yönetişim müşteri akışına sızdırılmaz (tasarım 2026-08-21).
 */
export async function createApprovalRequest(
  staffUserId: string,
  input: {
    title: string;
    domain: ApprovalDomain;
    riskLevel: ApprovalRisk;
    orgId?: string;
    targetType?: string;
    targetId?: string;
    requiredApprovals?: number;
  },
  reason: string,
  ctx?: StaffContext,
): Promise<{ id: string }> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  const title = input.title.trim().slice(0, 160);
  if (!title) throw new Error('Başlık zorunlu.');
  const required = input.requiredApprovals ?? 1;
  if (!Number.isInteger(required) || required < 1 || required > 3) {
    throw new Error('Gereken onay sayısı 1-3 arası olmalı.');
  }

  return prisma.$transaction(async (tx) => {
    const org = await resolveGovernanceOrg(tx, input.orgId);
    const request = await tx.approvalRequest.create({
      data: {
        title,
        domain: input.domain,
        riskLevel: input.riskLevel,
        policyVersion: APPROVAL_POLICY_VERSION,
        orgId: input.orgId ?? null,
        orgName: input.orgId ? org.name : null,
        targetType: input.targetType?.slice(0, 24) ?? null,
        targetId: input.targetId?.slice(0, 64) ?? null,
        requestedById: staff.id,
        requestedByEmail: staff.email,
        reason: cleanReason,
        requiredApprovals: required,
      },
      select: { id: true },
    });
    await tx.approvalEvent.create({
      data: {
        requestId: request.id,
        type: 'created',
        actorEmail: staff.email,
        payload: { title, domain: input.domain, riskLevel: input.riskLevel },
      },
    });
    await audit(tx, staff, {
      org,
      action: 'approval.created',
      targetId: request.id,
      before: {},
      after: { title, domain: input.domain, riskLevel: input.riskLevel, requiredApprovals: required },
      reason: cleanReason,
      ctx,
    });
    return { id: request.id };
  });
}

/**
 * Karar yazar. Tek reject talebi kapatır; approve sayısı (bu karar dahil)
 * `requiredApprovals`a ulaşınca `approved`. Aynı onaycı ikinci karar
 * yazamaz — şemadaki @@unique([requestId, decidedByEmail]) P2002 üretir.
 */
export async function decideApproval(
  staffUserId: string,
  requestId: string,
  decision: 'approve' | 'reject',
  reason: string,
  ctx?: StaffContext,
): Promise<{ status: 'pending' | 'approved' | 'rejected' }> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  try {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({
        where: { id: requestId },
        select: { status: true, title: true, requiredApprovals: true, orgId: true, orgName: true },
      });
      if (!request) throw new Error(`Onay talebi ${requestId} bulunamadı.`);
      if (request.status !== 'pending') throw new Error('Bu talep artık kararda değil.');

      await tx.approvalDecision.create({
        data: {
          requestId,
          decision,
          decidedById: staff.id,
          decidedByEmail: staff.email,
          reason: cleanReason,
        },
      });
      const approvals = await tx.approvalDecision.count({
        where: { requestId, decision: 'approve' },
      });
      await tx.approvalEvent.create({
        data: {
          requestId,
          type: 'decision_recorded',
          actorEmail: staff.email,
          payload: { decision, approvals, required: request.requiredApprovals },
        },
      });

      let status: 'pending' | 'approved' | 'rejected' = 'pending';
      if (decision === 'reject') status = 'rejected';
      else if (approvals >= request.requiredApprovals) status = 'approved';

      if (status !== 'pending') {
        await tx.approvalRequest.update({
          where: { id: requestId },
          data: { status, decidedAt: new Date(), decidedByEmail: staff.email },
        });
        await tx.approvalEvent.create({
          data: {
            requestId,
            type: status,
            actorEmail: staff.email,
            payload: { approvals, required: request.requiredApprovals },
          },
        });
      }

      await audit(tx, staff, {
        org: request.orgId ? { id: request.orgId, name: request.orgName ?? '' } : PLATFORM_ORG,
        action: 'approval.decided',
        targetId: requestId,
        before: { status: 'pending' },
        after: { status, decision },
        reason: cleanReason,
        ctx,
      });
      return { status };
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new Error('Bu talebe zaten karar yazdın.');
    }
    throw err;
  }
}

/** Bekleyen talebi geri çeker — defterde durur, kuyruğa listelenmez. */
export async function cancelApprovalRequest(
  staffUserId: string,
  requestId: string,
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  await prisma.$transaction(async (tx) => {
    const request = await tx.approvalRequest.findUnique({
      where: { id: requestId },
      select: { status: true, orgId: true, orgName: true },
    });
    if (!request) throw new Error(`Onay talebi ${requestId} bulunamadı.`);
    if (request.status !== 'pending') throw new Error('Bu talep artık kararda değil.');

    await tx.approvalRequest.update({
      where: { id: requestId },
      data: { status: 'cancelled', decidedAt: new Date(), decidedByEmail: staff.email },
    });
    await tx.approvalEvent.create({
      data: { requestId, type: 'cancelled', actorEmail: staff.email, payload: {} },
    });
    await audit(tx, staff, {
      org: request.orgId ? { id: request.orgId, name: request.orgName ?? '' } : PLATFORM_ORG,
      action: 'approval.cancelled',
      targetId: requestId,
      before: { status: 'pending' },
      after: { status: 'cancelled' },
      reason: cleanReason,
      ctx,
    });
  });
}
```

- [ ] **Step 5: Update the gate test** (`admin-staff-gate.test.ts`):
  1. Add to the prisma mock's models (if absent) and to the `tx` object: `approvalRequest: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() }`, `approvalDecision: { create: vi.fn(), count: vi.fn() }`, `approvalEvent: { create: vi.fn() }`.
  2. Add CALLS entries:

```ts
  createApprovalRequest: ['u1', { title: 'T', domain: 'billing', riskLevel: 'medium' }, 'sebep'],
  decideApproval: ['u1', 'req1', 'approve', 'sebep'],
  cancelApprovalRequest: ['u1', 'req1', 'sebep'],
```

  3. Find the "boş sebeple çalışmaz" write list (the `describe('yazmalar — sebep zorunlu…')` block iterates labeled write calls) and add the three functions with empty-reason invocations following the exact existing pattern in that block.

- [ ] **Step 6: Run — expect PASS**:

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm test -w apps/web -- admin-approval-writes && npm test -w apps/web -- admin-staff-gate && npm run typecheck -w apps/web
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/repo/admin.ts apps/web/test/admin-approval-writes.test.ts apps/web/test/admin-staff-gate.test.ts
git commit -m "feat(admin): approval request writes — create, decide, cancel under the audit contract"
```

---

### Task 2: KVKK write functions (lib/kvkk.ts + repo + tests)

**Files:**
- Create: `apps/web/lib/kvkk.ts`
- Modify: `apps/web/lib/repo/admin.ts` (6 functions after the approval block)
- Modify: `apps/web/test/admin-staff-gate.test.ts` (CALLS + tx models + reason list)
- Create: `apps/web/test/kvkk.test.ts`
- Create: `apps/web/test/admin-kvkk-writes.test.ts`

**Interfaces:**
- Consumes: Task 1's `PLATFORM_ORG`, `resolveGovernanceOrg`, extended `audit` union.
- Produces (Task 3 calls these):
  - `lib/kvkk.ts`: `KVKK_STATUTORY_DAYS = 30`, `statutoryDueDate(receivedAt: Date): Date`
  - `type KvkkType = 'access' | 'erasure' | 'correction' | 'portability'`
  - `createKvkkRequest(staffUserId, input: { reference: string; subjectEmail: string; type: KvkkType; orgId?: string; receivedAt: Date; receivedVia?: string }, reason, ctx?): Promise<{ id: string }>`
  - `verifyKvkkIdentity(staffUserId, requestId, method: string, reason, ctx?): Promise<void>`
  - `assignKvkkOwner(staffUserId, requestId, ownerEmail: string, reason, ctx?): Promise<void>`
  - `addKvkkEvidence(staffUserId, requestId, input: { label: string; location: string }, reason, ctx?): Promise<void>`
  - `setKvkkStatus(staffUserId, requestId, status: 'identity_check' | 'in_progress' | 'legal_review', reason, ctx?): Promise<void>`
  - `completeKvkkRequest(staffUserId, requestId, responseSummary: string, reason, ctx?): Promise<void>`

- [ ] **Step 1: `lib/kvkk.ts` + its failing test**

```ts
// apps/web/lib/kvkk.ts
/**
 * KVKK saf matematiği — admin.ts'te olamaz (numaralandırma testi her
 * export'tan personel kapısı bekler; report-schedule.ts emsali).
 * Kanuni yanıt süresi: KVKK md. 13 — başvurudan itibaren 30 gün.
 */
export const KVKK_STATUTORY_DAYS = 30;

export function statutoryDueDate(receivedAt: Date): Date {
  return new Date(receivedAt.getTime() + KVKK_STATUTORY_DAYS * 24 * 60 * 60 * 1000);
}
```

```ts
// apps/web/test/kvkk.test.ts
import { describe, expect, it } from 'vitest';

import { KVKK_STATUTORY_DAYS, statutoryDueDate } from '../lib/kvkk';

describe('statutoryDueDate', () => {
  it('kanuni süre tam 30 gündür ve girdiyi değiştirmez', () => {
    const received = new Date(Date.UTC(2026, 7, 21, 10, 0));
    const due = statutoryDueDate(received);

    expect(KVKK_STATUTORY_DAYS).toBe(30);
    expect(due.toISOString()).toBe('2026-09-20T10:00:00.000Z');
    expect(received.toISOString()).toBe('2026-08-21T10:00:00.000Z');
  });
});
```

- [ ] **Step 2: Write the failing repo tests** — `apps/web/test/admin-kvkk-writes.test.ts` (same mock scaffold as Task 1's test; `tx` additionally has `kvkkRequest: { create, findUnique, update }`, `kvkkEvidence: { create }`, `kvkkEvent: { create }`, `user: { findFirst }`):

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * KVKK yazmalarının sözleşmesi: statutoryDueAt KOD hesaplar (+30 gün) ·
 * kimlik doğrulanmadan kapatma YOK · izinli geçiş haritası dışına çıkılmaz ·
 * sahip yalnız staff · completed'a kanıt/sahip yok · subjectEmail hiçbir
 * denetim/olay payload'ına girmez · referans P2002 dostu mesaj.
 */

const userFindUnique = vi.fn();

const tx = {
  organization: { findUnique: vi.fn() },
  user: { findFirst: vi.fn() },
  kvkkRequest: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  kvkkEvidence: { create: vi.fn() },
  kvkkEvent: { create: vi.fn() },
  adminAction: { create: vi.fn() },
};

const transaction = vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));

vi.mock('../lib/db', () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => userFindUnique(...a) },
    $transaction: (...a: unknown[]) => transaction(...(a as [never])),
  },
}));

const admin = await import('../lib/repo/admin');

const RECEIVED = new Date(Date.UTC(2026, 7, 21, 10, 0));

const openRequest = (over: Record<string, unknown> = {}) => ({
  status: 'in_progress',
  identityVerifiedAt: new Date(RECEIVED),
  reference: 'KVKK-2026-0001',
  orgId: null,
  orgName: '',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  userFindUnique.mockResolvedValue({ isStaff: true, email: 'staff@voldi.net', id: 'u1' });
  tx.organization.findUnique.mockResolvedValue({ id: 'org1', name: 'Acme' });
  tx.user.findFirst.mockResolvedValue({ id: 'u2', email: 'destek@voldi.net' });
  tx.kvkkRequest.create.mockResolvedValue({ id: 'kv1' });
  tx.kvkkRequest.findUnique.mockResolvedValue(openRequest());
  tx.kvkkRequest.update.mockResolvedValue({});
  tx.kvkkEvidence.create.mockResolvedValue({});
  tx.kvkkEvent.create.mockResolvedValue({});
  tx.adminAction.create.mockResolvedValue({});
});

/** Tüm denetim + olay payload'larında kişisel veri taraması. */
function assertNoSubjectEmailInLedgers() {
  const payloads = [
    ...tx.adminAction.create.mock.calls.map((c) => JSON.stringify(c[0])),
    ...tx.kvkkEvent.create.mock.calls.map((c) => JSON.stringify(c[0])),
  ];
  for (const p of payloads) expect(p).not.toContain('talep-sahibi@ornek.com');
}

describe('createKvkkRequest', () => {
  const input = {
    reference: 'KVKK-2026-0002',
    subjectEmail: 'talep-sahibi@ornek.com',
    type: 'access',
    receivedAt: RECEIVED,
  } as const;

  it('statutoryDueAt kod hesaplar: +30 gün', async () => {
    await admin.createKvkkRequest('u1', input, 'posta ile geldi');

    const data = (tx.kvkkRequest.create.mock.calls[0]![0] as { data: { statutoryDueAt: Date } }).data;
    expect(data.statutoryDueAt.toISOString()).toBe('2026-09-20T10:00:00.000Z');
  });

  it('received olayı + denetim yazılır; subjectEmail hiçbir deftere sızmaz', async () => {
    await admin.createKvkkRequest('u1', input, 'posta ile geldi');

    expect(tx.kvkkEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'received' }) }),
    );
    expect(tx.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'kvkk.created' }) }),
    );
    assertNoSubjectEmailInLedgers();
  });

  it('mükerrer referans P2002 → dostça mesaj', async () => {
    const { Prisma } = await import('@prisma/client');
    tx.kvkkRequest.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
    );
    await expect(admin.createKvkkRequest('u1', input, 's')).rejects.toThrow('zaten kullanılmış');
  });
});

describe('verifyKvkkIdentity', () => {
  it('intake → in_progress, alanlar dolar, olay düşer', async () => {
    tx.kvkkRequest.findUnique.mockResolvedValue(openRequest({ status: 'intake', identityVerifiedAt: null }));

    await admin.verifyKvkkIdentity('u1', 'kv1', 'e-Devlet doğrulaması', 'kimlik geldi');

    expect(tx.kvkkRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'in_progress', identityMethod: 'e-Devlet doğrulaması' }),
      }),
    );
    expect(tx.kvkkEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'identity_verified' }) }),
    );
  });

  it('zaten doğrulanmışsa reddeder', async () => {
    tx.kvkkRequest.findUnique.mockResolvedValue(openRequest({ status: 'intake' }));
    await expect(admin.verifyKvkkIdentity('u1', 'kv1', 'x', 's')).rejects.toThrow('zaten doğrulanmış');
  });
});

describe('assignKvkkOwner', () => {
  it('sahip staff değilse reddeder', async () => {
    tx.user.findFirst.mockResolvedValue(null);
    await expect(admin.assignKvkkOwner('u1', 'kv1', 'x@y.com', 's')).rejects.toThrow('personel olmalı');
    expect(tx.kvkkRequest.update).not.toHaveBeenCalled();
  });

  it('staff sahibi bağlar ve olay düşer', async () => {
    await admin.assignKvkkOwner('u1', 'kv1', 'destek@voldi.net', 'iş bölümü');

    expect(tx.kvkkRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: 'u2', ownerEmail: 'destek@voldi.net' }),
      }),
    );
    expect(tx.kvkkEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'owner_assigned' }) }),
    );
  });

  it('completed talebe sahip atanamaz', async () => {
    tx.kvkkRequest.findUnique.mockResolvedValue(openRequest({ status: 'completed' }));
    await expect(admin.assignKvkkOwner('u1', 'kv1', 'destek@voldi.net', 's')).rejects.toThrow('kapatılmış');
  });
});

describe('addKvkkEvidence', () => {
  it('kanıt satırı + olay (payload yalnız label — konum defterde ama olayda değil)', async () => {
    await admin.addKvkkEvidence('u1', 'kv1', { label: 'Kimlik teyidi', location: '/dosya/x.pdf' }, 'arşiv');

    expect(tx.kvkkEvidence.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ label: 'Kimlik teyidi' }) }),
    );
    const event = tx.kvkkEvent.create.mock.calls[0]![0] as { data: { payload: Record<string, unknown> } };
    expect(event.data.payload).toEqual({ label: 'Kimlik teyidi' });
  });

  it('completed talebe kanıt eklenemez', async () => {
    tx.kvkkRequest.findUnique.mockResolvedValue(openRequest({ status: 'completed' }));
    await expect(
      admin.addKvkkEvidence('u1', 'kv1', { label: 'L', location: '/x' }, 's'),
    ).rejects.toThrow('kapatılmış');
  });
});

describe('setKvkkStatus', () => {
  it('izinli geçiş: in_progress → legal_review', async () => {
    await admin.setKvkkStatus('u1', 'kv1', 'legal_review', 'hukuk görüşü');

    expect(tx.kvkkRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'legal_review' }) }),
    );
    const event = tx.kvkkEvent.create.mock.calls[0]![0] as { data: { payload: Record<string, unknown> } };
    expect(event.data.payload).toEqual({ from: 'in_progress', to: 'legal_review' });
  });

  it('izinsiz geçiş reddedilir (intake → legal_review)', async () => {
    tx.kvkkRequest.findUnique.mockResolvedValue(openRequest({ status: 'intake', identityVerifiedAt: null }));
    await expect(admin.setKvkkStatus('u1', 'kv1', 'legal_review', 's')).rejects.toThrow('geçilemez');
  });

  it('identity_check → in_progress yalnız kimlik doğrulanmışsa', async () => {
    tx.kvkkRequest.findUnique.mockResolvedValue(
      openRequest({ status: 'identity_check', identityVerifiedAt: null }),
    );
    await expect(admin.setKvkkStatus('u1', 'kv1', 'in_progress', 's')).rejects.toThrow('doğrulanmadan');
  });
});

describe('completeKvkkRequest', () => {
  it('kimlik doğrulanmadan kapatılamaz', async () => {
    tx.kvkkRequest.findUnique.mockResolvedValue(openRequest({ identityVerifiedAt: null }));
    await expect(admin.completeKvkkRequest('u1', 'kv1', 'özet', 's')).rejects.toThrow(
      'Kimlik doğrulanmadan',
    );
  });

  it('in_progress → completed: respondedAt + özet + iki olay', async () => {
    await admin.completeKvkkRequest('u1', 'kv1', 'Verinin kopyası iletildi.', 'yanıt gitti');

    expect(tx.kvkkRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'completed', responseSummary: 'Verinin kopyası iletildi.' }),
      }),
    );
    const eventTypes = tx.kvkkEvent.create.mock.calls.map(
      (c) => (c[0] as { data: { type: string } }).data.type,
    );
    expect(eventTypes).toEqual(['responded', 'completed']);
    assertNoSubjectEmailInLedgers();
  });
});
```

- [ ] **Step 3: Run — expect FAIL**:

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm test -w apps/web -- kvkk
```

- [ ] **Step 4: Implement the 6 functions in admin.ts** (after the approval block). Shared loader + transition map + functions:

```ts
// ─── Yönetişim yazmaları: KVKK yaşam döngüsü ─────────────────────────────

export type KvkkType = 'access' | 'erasure' | 'correction' | 'portability';

/**
 * İzinli durum geçişleri (hedef → izinli kaynaklar). `completed` bu haritada
 * YOK — oraya tek yol `completeKvkkRequest`. Kimlik şartları fonksiyonlarda.
 */
const KVKK_TRANSITIONS: Record<'identity_check' | 'in_progress' | 'legal_review', string[]> = {
  identity_check: ['intake'],
  in_progress: ['identity_check', 'legal_review'],
  legal_review: ['in_progress'],
};

/** Talep + audit org'unu tek yerden yükler; kapatılmış talebe yazmayı keser. */
async function loadKvkkForWrite(
  tx: Prisma.TransactionClient,
  requestId: string,
  opts: { allowCompleted?: boolean } = {},
): Promise<{
  status: string;
  identityVerifiedAt: Date | null;
  reference: string;
  auditOrg: { id: string; name: string };
}> {
  const request = await tx.kvkkRequest.findUnique({
    where: { id: requestId },
    select: { status: true, identityVerifiedAt: true, reference: true, orgId: true, orgName: true },
  });
  if (!request) throw new Error(`KVKK talebi ${requestId} bulunamadı.`);
  if (!opts.allowCompleted && request.status === 'completed') {
    throw new Error('Bu talep kapatılmış — üzerine yazılamaz.');
  }
  return {
    status: request.status,
    identityVerifiedAt: request.identityVerifiedAt,
    reference: request.reference,
    auditOrg: request.orgId ? { id: request.orgId, name: request.orgName } : PLATFORM_ORG,
  };
}

/**
 * KVKK talebi açar. `statutoryDueAt`ı KOD hesaplar (kanuni 30 gün —
 * lib/kvkk.ts). Denetim payload'ında subjectEmail YOKTUR: denetim kaydı
 * referans taşır, kişisel veriyi değil. Müşteri aktivitesi bilerek yok.
 */
export async function createKvkkRequest(
  staffUserId: string,
  input: {
    reference: string;
    subjectEmail: string;
    type: KvkkType;
    orgId?: string;
    receivedAt: Date;
    receivedVia?: string;
  },
  reason: string,
  ctx?: StaffContext,
): Promise<{ id: string }> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  const reference = input.reference.trim().slice(0, 32);
  if (!reference) throw new Error('Referans zorunlu.');
  const subjectEmail = input.subjectEmail.trim().toLowerCase().slice(0, 255);
  if (!subjectEmail.includes('@')) throw new Error('Talep sahibi e-postası geçersiz.');

  try {
    return await prisma.$transaction(async (tx) => {
      const org = await resolveGovernanceOrg(tx, input.orgId);
      const request = await tx.kvkkRequest.create({
        data: {
          reference,
          subjectEmail,
          orgId: input.orgId ?? null,
          orgName: input.orgId ? org.name : '',
          type: input.type,
          receivedAt: input.receivedAt,
          receivedVia: input.receivedVia?.slice(0, 32) ?? null,
          statutoryDueAt: statutoryDueDate(input.receivedAt),
        },
        select: { id: true },
      });
      await tx.kvkkEvent.create({
        data: {
          requestId: request.id,
          type: 'received',
          actorEmail: staff.email,
          payload: { reference, type: input.type },
        },
      });
      await audit(tx, staff, {
        org,
        action: 'kvkk.created',
        targetId: request.id,
        before: {},
        after: { reference, type: input.type, status: 'intake' },
        reason: cleanReason,
        ctx,
      });
      return { id: request.id };
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new Error('Bu referans zaten kullanılmış.');
    }
    throw err;
  }
}

export async function verifyKvkkIdentity(
  staffUserId: string,
  requestId: string,
  method: string,
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);
  const cleanMethod = method.trim().slice(0, 48);
  if (!cleanMethod) throw new Error('Doğrulama yöntemi zorunlu.');

  await prisma.$transaction(async (tx) => {
    const request = await loadKvkkForWrite(tx, requestId);
    if (request.identityVerifiedAt) throw new Error('Kimlik zaten doğrulanmış.');
    if (request.status !== 'intake' && request.status !== 'identity_check') {
      throw new Error(`'${request.status}' durumunda kimlik doğrulanamaz.`);
    }

    await tx.kvkkRequest.update({
      where: { id: requestId },
      data: { identityVerifiedAt: new Date(), identityMethod: cleanMethod, status: 'in_progress' },
    });
    await tx.kvkkEvent.create({
      data: {
        requestId,
        type: 'identity_verified',
        actorEmail: staff.email,
        payload: { method: cleanMethod },
      },
    });
    await audit(tx, staff, {
      org: request.auditOrg,
      action: 'kvkk.identity_verified',
      targetId: requestId,
      before: { status: request.status },
      after: { status: 'in_progress', method: cleanMethod },
      reason: cleanReason,
      ctx,
    });
  });
}

export async function assignKvkkOwner(
  staffUserId: string,
  requestId: string,
  ownerEmail: string,
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);
  const email = ownerEmail.trim().toLowerCase();

  await prisma.$transaction(async (tx) => {
    const request = await loadKvkkForWrite(tx, requestId);
    const owner = await tx.user.findFirst({
      where: { email, isStaff: true },
      select: { id: true, email: true },
    });
    if (!owner) throw new Error('Sahip personel olmalı.');

    await tx.kvkkRequest.update({
      where: { id: requestId },
      data: { ownerId: owner.id, ownerEmail: owner.email },
    });
    await tx.kvkkEvent.create({
      data: {
        requestId,
        type: 'owner_assigned',
        actorEmail: staff.email,
        payload: { owner: owner.email },
      },
    });
    await audit(tx, staff, {
      org: request.auditOrg,
      action: 'kvkk.owner_assigned',
      targetId: requestId,
      before: {},
      after: { owner: owner.email },
      reason: cleanReason,
      ctx,
    });
  });
}

export async function addKvkkEvidence(
  staffUserId: string,
  requestId: string,
  input: { label: string; location: string },
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);
  const label = input.label.trim().slice(0, 160);
  const location = input.location.trim().slice(0, 500);
  if (!label || !location) throw new Error('Kanıt etiketi ve konumu zorunlu.');

  await prisma.$transaction(async (tx) => {
    const request = await loadKvkkForWrite(tx, requestId);

    await tx.kvkkEvidence.create({
      data: { requestId, label, location, addedByEmail: staff.email },
    });
    // Olay payload'ında konum YOK: dosya yolu olay akışına sızmasın.
    await tx.kvkkEvent.create({
      data: { requestId, type: 'evidence_added', actorEmail: staff.email, payload: { label } },
    });
    await audit(tx, staff, {
      org: request.auditOrg,
      action: 'kvkk.evidence_added',
      targetId: requestId,
      before: {},
      after: { label },
      reason: cleanReason,
      ctx,
    });
  });
}

export async function setKvkkStatus(
  staffUserId: string,
  requestId: string,
  status: 'identity_check' | 'in_progress' | 'legal_review',
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  await prisma.$transaction(async (tx) => {
    const request = await loadKvkkForWrite(tx, requestId);
    const allowedFrom = KVKK_TRANSITIONS[status];
    if (!allowedFrom.includes(request.status)) {
      throw new Error(`'${request.status}' durumundan '${status}' durumuna geçilemez.`);
    }
    if (status === 'in_progress' && request.status === 'identity_check' && !request.identityVerifiedAt) {
      throw new Error('Kimlik doğrulanmadan işleme alınamaz.');
    }

    await tx.kvkkRequest.update({ where: { id: requestId }, data: { status } });
    await tx.kvkkEvent.create({
      data: {
        requestId,
        type: 'status_changed',
        actorEmail: staff.email,
        payload: { from: request.status, to: status },
      },
    });
    await audit(tx, staff, {
      org: request.auditOrg,
      action: 'kvkk.status_changed',
      targetId: requestId,
      before: { status: request.status },
      after: { status },
      reason: cleanReason,
      ctx,
    });
  });
}

export async function completeKvkkRequest(
  staffUserId: string,
  requestId: string,
  responseSummary: string,
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);
  const summary = responseSummary.trim().slice(0, 1000);
  if (!summary) throw new Error('Yanıt özeti zorunlu.');

  await prisma.$transaction(async (tx) => {
    const request = await loadKvkkForWrite(tx, requestId);
    if (!request.identityVerifiedAt) {
      throw new Error('Kimlik doğrulanmadan talep kapatılamaz.');
    }
    if (request.status !== 'in_progress' && request.status !== 'legal_review') {
      throw new Error(`'${request.status}' durumundan kapatılamaz.`);
    }

    await tx.kvkkRequest.update({
      where: { id: requestId },
      data: { status: 'completed', respondedAt: new Date(), responseSummary: summary },
    });
    await tx.kvkkEvent.create({
      data: { requestId, type: 'responded', actorEmail: staff.email, payload: {} },
    });
    await tx.kvkkEvent.create({
      data: { requestId, type: 'completed', actorEmail: staff.email, payload: {} },
    });
    await audit(tx, staff, {
      org: request.auditOrg,
      action: 'kvkk.completed',
      targetId: requestId,
      before: { status: request.status },
      after: { status: 'completed' },
      reason: cleanReason,
      ctx,
    });
  });
}
```

Add the import at the top of admin.ts: `import { statutoryDueDate } from '../kvkk';`

- [ ] **Step 5: Update the gate test** — tx models (`kvkkRequest`, `kvkkEvidence`, `kvkkEvent`, `user.findFirst` on tx) + CALLS entries:

```ts
  createKvkkRequest: [
    'u1',
    { reference: 'KVKK-2026-0001', subjectEmail: 'x@example.com', type: 'access', receivedAt: new Date(0) },
    'sebep',
  ],
  verifyKvkkIdentity: ['u1', 'kv1', 'e-imza', 'sebep'],
  assignKvkkOwner: ['u1', 'kv1', 'staff@voldi.net', 'sebep'],
  addKvkkEvidence: ['u1', 'kv1', { label: 'L', location: '/x' }, 'sebep'],
  setKvkkStatus: ['u1', 'kv1', 'legal_review', 'sebep'],
  completeKvkkRequest: ['u1', 'kv1', 'özet', 'sebep'],
```

Plus the six functions in the empty-reason write list.

- [ ] **Step 6: Run — expect PASS**:

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm test -w apps/web -- kvkk && npm test -w apps/web -- admin-staff-gate && npm run typecheck -w apps/web
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/kvkk.ts apps/web/lib/repo/admin.ts apps/web/test/kvkk.test.ts apps/web/test/admin-kvkk-writes.test.ts apps/web/test/admin-staff-gate.test.ts
git commit -m "feat(admin): KVKK lifecycle writes — statutory 30-day clock, guarded transitions"
```

---

### Task 3: API routes (9 thin POST endpoints)

**Files (all Create):**
- `apps/web/app/api/admin/approvals/route.ts`
- `apps/web/app/api/admin/approvals/[id]/decision/route.ts`
- `apps/web/app/api/admin/approvals/[id]/cancel/route.ts`
- `apps/web/app/api/admin/kvkk/route.ts`
- `apps/web/app/api/admin/kvkk/[id]/identity/route.ts`
- `apps/web/app/api/admin/kvkk/[id]/owner/route.ts`
- `apps/web/app/api/admin/kvkk/[id]/evidence/route.ts`
- `apps/web/app/api/admin/kvkk/[id]/status/route.ts`
- `apps/web/app/api/admin/kvkk/[id]/complete/route.ts`

**Interfaces:**
- Consumes: Task 1/2 repo functions; `adminError`, `json`, `requireSessionUserId`, `staffCtx` from `../../_shared` (adjust relative depth per file); `readJsonBody`, `field` from `../../../auth/_shared` (adjust depth). Mirror `apps/web/app/api/admin/invoices/[id]/paid/route.ts` exactly for idiom and import paths.
- Produces: endpoints Task 4/5 dialogs call. All return `{ ok: true }` (creates also return `id`).

- [ ] **Step 1: Create the two collection routes.** `approvals/route.ts`:

```ts
import { readJsonBody, field } from '../../auth/_shared';
import {
  createApprovalRequest,
  type ApprovalDomain,
  type ApprovalRisk,
} from '../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../_shared';

/** Onay talebi açar — karar defteri kaydı; hiçbir şeyi otomatik uygulamaz. */
export async function POST(req: Request): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const body = await readJsonBody(req);

  const domain = field(body, 'domain');
  if (!['entitlement', 'billing', 'security', 'platform'].includes(domain)) {
    return json(400, { error: 'Alan (domain) gerekli.' });
  }
  const riskLevel = field(body, 'riskLevel');
  if (!['medium', 'high', 'critical'].includes(riskLevel)) {
    return json(400, { error: 'Risk seviyesi gerekli.' });
  }
  const requiredRaw = field(body, 'requiredApprovals');

  try {
    const res = await createApprovalRequest(
      auth.userId,
      {
        title: field(body, 'title'),
        domain: domain as ApprovalDomain,
        riskLevel: riskLevel as ApprovalRisk,
        orgId: field(body, 'orgId') || undefined,
        targetType: field(body, 'targetType') || undefined,
        targetId: field(body, 'targetId') || undefined,
        requiredApprovals: requiredRaw ? Number(requiredRaw) : undefined,
      },
      field(body, 'reason'),
      staffCtx(req),
    );
    return json(200, { ok: true, id: res.id });
  } catch (err) {
    return adminError(err);
  }
}
```

`kvkk/route.ts`:

```ts
import { readJsonBody, field } from '../../auth/_shared';
import { createKvkkRequest, type KvkkType } from '../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../_shared';

export async function POST(req: Request): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const body = await readJsonBody(req);

  const type = field(body, 'type');
  if (!['access', 'erasure', 'correction', 'portability'].includes(type)) {
    return json(400, { error: 'Talep türü gerekli.' });
  }
  const receivedAtRaw = field(body, 'receivedAt');
  const receivedAt = new Date(receivedAtRaw || Date.now());
  if (Number.isNaN(receivedAt.getTime())) {
    return json(400, { error: 'Geliş tarihi geçersiz.' });
  }

  try {
    const res = await createKvkkRequest(
      auth.userId,
      {
        reference: field(body, 'reference'),
        subjectEmail: field(body, 'subjectEmail'),
        type: type as KvkkType,
        orgId: field(body, 'orgId') || undefined,
        receivedAt,
        receivedVia: field(body, 'receivedVia') || undefined,
      },
      field(body, 'reason'),
      staffCtx(req),
    );
    return json(200, { ok: true, id: res.id });
  } catch (err) {
    return adminError(err);
  }
}
```

- [ ] **Step 2: Create the seven `[id]` action routes.** Each mirrors `invoices/[id]/paid/route.ts` (params is a Promise). Complete code:

`approvals/[id]/decision/route.ts`:

```ts
import { readJsonBody, field } from '../../../../auth/_shared';
import { decideApproval } from '../../../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../../../_shared';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await readJsonBody(req);

  const decision = field(body, 'decision');
  if (decision !== 'approve' && decision !== 'reject') {
    return json(400, { error: 'Karar (approve|reject) gerekli.' });
  }

  try {
    const res = await decideApproval(auth.userId, id, decision, field(body, 'reason'), staffCtx(req));
    return json(200, { ok: true, status: res.status });
  } catch (err) {
    return adminError(err);
  }
}
```

`approvals/[id]/cancel/route.ts`:

```ts
import { readJsonBody, field } from '../../../../auth/_shared';
import { cancelApprovalRequest } from '../../../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../../../_shared';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await readJsonBody(req);

  try {
    await cancelApprovalRequest(auth.userId, id, field(body, 'reason'), staffCtx(req));
    return json(200, { ok: true });
  } catch (err) {
    return adminError(err);
  }
}
```

`kvkk/[id]/identity/route.ts`:

```ts
import { readJsonBody, field } from '../../../../auth/_shared';
import { verifyKvkkIdentity } from '../../../../../../lib/repo/admin';
import { adminError, json, requireSessionUserId, staffCtx } from '../../../_shared';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireSessionUserId();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const body = await readJsonBody(req);

  try {
    await verifyKvkkIdentity(auth.userId, id, field(body, 'method'), field(body, 'reason'), staffCtx(req));
    return json(200, { ok: true });
  } catch (err) {
    return adminError(err);
  }
}
```

`kvkk/[id]/owner/route.ts` — same shell, calls `assignKvkkOwner(auth.userId, id, field(body, 'ownerEmail'), field(body, 'reason'), staffCtx(req))`.

`kvkk/[id]/evidence/route.ts` — same shell, calls `addKvkkEvidence(auth.userId, id, { label: field(body, 'label'), location: field(body, 'location') }, field(body, 'reason'), staffCtx(req))`.

`kvkk/[id]/status/route.ts` — same shell plus enum guard:

```ts
  const status = field(body, 'status');
  if (!['identity_check', 'in_progress', 'legal_review'].includes(status)) {
    return json(400, { error: 'Hedef durum gerekli.' });
  }
```
then `setKvkkStatus(auth.userId, id, status as 'identity_check' | 'in_progress' | 'legal_review', field(body, 'reason'), staffCtx(req))`.

`kvkk/[id]/complete/route.ts` — same shell, calls `completeKvkkRequest(auth.userId, id, field(body, 'responseSummary'), field(body, 'reason'), staffCtx(req))`.

Write each of the four "same shell" files IN FULL by copying the identity route and changing only the import, the call, and (for status) the guard.

- [ ] **Step 3: Verify**

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm run typecheck -w apps/web && npm test -w apps/web
```

Expected: typecheck clean, full suite green (routes are thin; behavior lives in the Task 1/2-tested repo functions — matching the codebase's existing convention of not unit-testing the 6 existing admin routes).

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/admin/approvals apps/web/app/api/admin/kvkk
git commit -m "feat(api): governance write endpoints — approvals and KVKK lifecycle"
```

---

### Task 4: Approvals UI — row actions + create dialog

**Files:**
- Create: `apps/web/app/(admin)/ui/ApprovalActions.tsx`
- Modify: `apps/web/app/(admin)/ui/GovernanceOperationsViews.tsx` (`ApprovalsView` only — additive)
- Modify: `apps/web/app/(admin)/admin/security/approvals/page.tsx` (header button + stale comment)

**Interfaces:**
- Consumes: Task 3 endpoints; `StaffDialog` from `./StaffDialog`; `useToast` from `../../(app)/ToastProvider`; `ApprovalQueueRow` from `../operations-model`.
- Produces: `ApprovalRowActions({ row }: { row: ApprovalQueueRow })` and `NewApprovalButton()` client components.

- [ ] **Step 1: Read the precedents first** — `apps/web/app/(admin)/admin/orgs/[id]/InvoiceRowActions.tsx` (dialog/fetch/refresh idiom, THE template) and `ApprovalsView` in `GovernanceOperationsViews.tsx` (where the selected-row detail pane renders; note the `preview` prop).

- [ ] **Step 2: Create `ApprovalActions.tsx`** — one file, three exports, InvoiceRowActions idiom exactly (`'use client'`, `useState`, fetch → error inline → `toast` + `router.refresh()`):
  - `ApprovalRowActions({ row })`: renders nothing unless `row.status === 'pending'`. Three buttons (Approve `btn-success`, Reject `btn-danger`, Cancel `btn-label-secondary` — small `btn-sm`, matching the detail pane's existing button sizing) each opening a `StaffDialog` with a mandatory reason input; Approve/Reject POST to `/api/admin/approvals/${row.id}/decision` with `{ decision, reason }`; Cancel POSTs to `.../cancel` with `{ reason }`. Toast copy: `Request approved.` / `Request rejected.` / `Request cancelled.` (or `Decision recorded — still pending.` when the decision response returns `status: 'pending'`).
  - `NewApprovalButton()`: `btn btn-primary` "New approval request" opening a `StaffDialog` form with: title (required), domain select (entitlement/billing/security/platform), risk select (medium/high/critical), optional orgId text input (help text: "Org id — boş bırakılırsa platform kaydı"), optional required approvals (number 1–3, default 1), reason (required). POST `/api/admin/approvals`.
  - Follow the dialog form markup of `PaidDialog` verbatim (form classes `row g-6`, `form-label`, error `alert alert-danger`, submit row with spinner).

- [ ] **Step 3: Wire into `ApprovalsView`** — additive only: import `ApprovalRowActions` at top; inside the selected-row detail pane (where the request's facts render), add ONE block `{!preview && selected.status === 'pending' && <ApprovalRowActions row={selected} />}` in a `d-flex gap-2` wrapper placed after the existing fact list. Do not touch columns, sorting, or any other markup.

- [ ] **Step 4: Wire the page** — in `approvals/page.tsx`: render `<NewApprovalButton />` next to the existing `RefreshButton` in the header actions area, and REWRITE the stale comment block ("Onay/ret KONTROLLERİ bilinçli yok…") to reflect reality: controls now live behind the audit contract; `cancelled` rows still unlisted.

- [ ] **Step 5: Verify** — `npm run typecheck -w apps/web && npm test -w apps/web` (fixture-leak guard + full suite green; preview pages must NOT render actions — confirm `ApprovalsView` only shows them when `preview === false`).

- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/(admin)/ui/ApprovalActions.tsx" "apps/web/app/(admin)/ui/GovernanceOperationsViews.tsx" "apps/web/app/(admin)/admin/security/approvals/page.tsx"
git commit -m "feat(admin-ui): approval decision and create controls behind the audit contract"
```

---

### Task 5: KVKK UI — lifecycle actions + create dialog

**Files:**
- Create: `apps/web/app/(admin)/ui/KvkkActions.tsx`
- Modify: `apps/web/app/(admin)/ui/GovernanceOperationsViews.tsx` (`DataRequestsView` only — additive)
- Modify: `apps/web/app/(admin)/admin/security/data-requests/page.tsx` (header button + stale comment)

**Interfaces:**
- Consumes: Task 3 kvkk endpoints; `StaffDialog`; `DataRequestRow` from `../operations-model` (read it first — the row carries id/status/identity fields the actions need).
- Produces: `KvkkRowActions({ row })`, `NewKvkkButton()`.

- [ ] **Step 1: Read `DataRequestsView` + `DataRequestRow`** to learn the exact row fields (id, status, identity-verified flag naming) and the detail pane structure.

- [ ] **Step 2: Create `KvkkActions.tsx`** — same idiom as Task 4:
  - `KvkkRowActions({ row })`: action buttons filtered by state, each with a reason-mandatory `StaffDialog`:
    - "Verify identity" (visible when not verified and status intake/identity_check): method input (required) → POST `.../identity`.
    - "Assign owner" (hidden when completed): ownerEmail input → POST `.../owner`.
    - "Add evidence" (hidden when completed): label + location inputs → POST `.../evidence`.
    - "Move status" (hidden when completed): select with only the targets valid from the CURRENT status per the transition map (`intake→identity_check`; `identity_check→in_progress`; `in_progress→legal_review`; `legal_review→in_progress`) → POST `.../status`.
    - "Respond & close" (visible when status in_progress/legal_review AND identity verified): responseSummary textarea (required) → POST `.../complete`.
  - `NewKvkkButton()`: dialog with reference (required, placeholder `KVKK-2026-0001`), subjectEmail (required, type=email), type select (access/erasure/correction/portability), optional orgId, receivedAt date input (default today), receivedVia input, reason (required). Help text under receivedAt: "Kanuni 30 günlük süre bu tarihten hesaplanır." POST `/api/admin/kvkk`.
- [ ] **Step 3: Wire into `DataRequestsView`** — additive `{!preview && <KvkkRowActions row={selected} />}` in the detail pane; nothing else changes.
- [ ] **Step 4: Wire the page** — `<NewKvkkButton />` beside `RefreshButton`; rewrite the stale "yazma kontrolleri yok" comment.
- [ ] **Step 5: Verify** — `npm run typecheck -w apps/web && npm test -w apps/web`.
- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/(admin)/ui/KvkkActions.tsx" "apps/web/app/(admin)/ui/GovernanceOperationsViews.tsx" "apps/web/app/(admin)/admin/security/data-requests/page.tsx"
git commit -m "feat(admin-ui): KVKK lifecycle controls — verify, assign, evidence, close"
```

---

### Task 6: Final verification

- [ ] **Step 1:** `cd /Users/mmacstudio/Desktop/mailmyra-work && npm run typecheck && npm test` — all three workspaces green.
- [ ] **Step 2:** `DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder" npm run build -w apps/web` — production build green (placeholder precedent).
- [ ] **Step 3:** `git status` clean; every task committed.
