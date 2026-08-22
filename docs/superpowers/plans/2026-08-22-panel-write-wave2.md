# Panel Write Wave 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the last SQL-bound panel surfaces writable — support cases, error-group states, leads, report schedules — and route staff-flag changes through the approval flow's first real execution.

**Architecture:** Every write mirrors the governance wave verbatim (this repo now contains the reviewed precedent for every layer): repo functions on the `markInvoicePaid` contract in `apps/web/lib/repo/admin.ts`, pure math outside admin.ts, thin `_shared.ts` routes with type-aware body reads, UI action/dialog components on the one-modal pattern. Novel pieces get full code below; pattern-copies get exact contracts + the precedent file to mirror.

**Spec (the contract, read first):** `docs/superpowers/specs/2026-08-22-panel-write-wave2-design.md`

## Global Constraints

- MAIN worktree `/Users/mmacstudio/Desktop/mailmyra-work`, branch `main`; commit per task; npm only; Turkish comments, English identifiers/commits/UI copy.
- Write contract + personal-data rules + audit-union additions: exactly as the spec's "Ortak sözleşme" section. `requesterEmail` never in audit payloads or report output.
- **Binding lesson (governance Critical):** `field()` returns strings only. `seats`/`grant`/`recipients` are read from the raw body with typeof/Array checks, and EVERY create route gets a body→repo-args smoke test (`apps/web/test/api-approvals-route.test.ts` is the template).
- **Binding UI lessons:** one modal at a time (buttons emit picks; dialogs open in PLACE of detail panes); `{!preview && ...}` gating; reason mandatory; header triggers `btn btn-primary btn-sm`; `w-100` on both the row button AND the coloured inner block.
- Gate test `admin-staff-gate.test.ts`: CALLS + empty-reason entries for every new export; tx-mock models extended.
- No schema changes, no new deps. Precedent files are authoritative for idiom — when a brief here conflicts with a reviewed precedent, follow the precedent and note it.

---

### Task 0: Fix the local dev server (prerequisite)

**Files:** to be determined by diagnosis — expected: `apps/web/instrumentation.ts` and/or `apps/web/next.config.js`.

**Problem:** `npm run dev -w apps/web` 500s on EVERY route. `instrumentation.ts`'s dynamic `await import('./lib/db')` is still followed by the dev bundler; the mariadb driver lands in the browser/edge compile where `require('stream')` cannot resolve. Prod build unaffected. Already tried and reverted: `serverExternalPackages: ['@prisma/adapter-mariadb','mariadb']` (does not cover the instrumentation edge compile).

- [ ] **Step 1:** Reproduce: start dev (`npm run dev -w apps/web -- -p 3010` from the MAIN tree), confirm 500 + the mariadb "Can't resolve 'stream'" compile error.
- [ ] **Step 2:** Evaluate, in order, stopping at the first that works cleanly:
  1. Make the import non-analyzable for the client/edge compile: `const mod = 'lib/db'; await import(/* webpackIgnore: true */ ...)` style, or route the ledger write through a `node:`-only module boundary.
  2. Guard at module shape: move the DB write into a separate `instrumentation.node.ts`-style server-only file if Next 15.5 supports a per-runtime entry; otherwise `export const runtime`/conditional `require` via `eval('require')` (last resort, needs a strong comment).
  3. Webpack config in next.config.js scoped to the failing compile (`config.resolve.fallback = { stream: false, ... }` only when `!isServer` / for the instrumentation entry).
- [ ] **Step 3:** Acceptance: dev serves `/login` 200 AND `/dev/admin-preview/security/approvals` 200; `onRequestError` still writes the error ledger on the nodejs runtime (no behavior change in prod paths); `npm test -w apps/web` (999) + typecheck + prod build all green; prod build route list unchanged.
- [ ] **Step 4:** Commit `fix(dev): keep mariadb out of the instrumentation edge compile — next dev serves again` with a Turkish comment at the fix site explaining the trap.
- [ ] **Timebox:** if no clean fix after the three approaches, STOP, report BLOCKED with findings — the wave continues without local preview (live verification), and the existing task chip stays open.

---

### Task 1: Support-case writes (repo + SLA lib + tests)

**Files:**
- Create: `apps/web/lib/support-sla.ts`, `apps/web/test/support-sla.test.ts`, `apps/web/test/admin-support-writes.test.ts`
- Modify: `apps/web/lib/repo/admin.ts` (audit union per spec + 4 functions after the KVKK block), `apps/web/test/admin-staff-gate.test.ts`

**Interfaces (Task 5 consumes):**
```ts
// lib/support-sla.ts
export const SUPPORT_SLA_HOURS = { urgent: 4, high: 24, normal: 48, low: 120 } as const;
export type SupportPriority = keyof typeof SUPPORT_SLA_HOURS;
export function slaDueDate(from: Date, priority: SupportPriority): Date; // from + saat*3600_000

// admin.ts
export type SupportChannel = 'email' | 'form' | 'staff';
export type SupportCategory = 'billing' | 'builder' | 'export' | 'access' | 'account';
createSupportCase(staffUserId, input: { reference: string; subject: string; requesterEmail: string; channel: SupportChannel; category: SupportCategory; priority: SupportPriority; orgId?: string; summary?: string }, reason, ctx?): Promise<{ id: string }>
setSupportCaseStatus(staffUserId, caseId, status: 'open'|'waiting_customer'|'escalated'|'resolved', reason, ctx?): Promise<void>
assignSupportCaseOwner(staffUserId, caseId, ownerEmail: string, reason, ctx?): Promise<void>
setSupportCasePriority(staffUserId, caseId, priority: SupportPriority, reason, ctx?): Promise<void>
```

Guards and exact error strings — from the spec §① verbatim. Transition map as a module const:

```ts
const SUPPORT_TRANSITIONS: Record<string, string[]> = {
  open: ['waiting_customer', 'escalated', 'resolved'],
  waiting_customer: ['open', 'escalated', 'resolved'],
  escalated: ['open', 'resolved'],
  resolved: ['open'], // yeniden açma — destek gerçeği
};
```

Precedents to mirror verbatim: `createKvkkRequest` (create with reference/P2002/personal-data rules — here `requesterEmail` plays subjectEmail's role in payload-exclusion), `setKvkkStatus` (transition write), `assignKvkkOwner` (staff-only owner). Priority change recomputes `slaDueAt = slaDueDate(case.createdAt, newPriority)` and audits before/after `{ priority, slaDueAt }`.

- [ ] **Step 1:** Write failing tests first. `support-sla.test.ts`: 4→4h/24h/48h/120h exact ISO math + input not mutated. `admin-support-writes.test.ts` (mock scaffold = `admin-kvkk-writes.test.ts`): create computes slaDueAt from now+priority · `received`-equivalent: audit `support.case_created` present, `requesterEmail` absent from ALL audit payloads (reuse the `assertNoSubjectEmailInLedgers` technique with the requester fixture string) · P2002 friendly · unknown org rejects inside tx · every legal transition passes, one illegal (`resolved → escalated`) rejects · reopen `resolved → open` passes · owner must be staff · owner/priority refused on resolved · priority change recomputes slaDueAt from createdAt (fixture createdAt in the mock row).
- [ ] **Step 2:** RED → implement → gate-test CALLS (+4) & empty-reason (+4) & tx models (`supportCase: { create, findUnique, update }`) → GREEN: `npm test -w apps/web -- support` + `admin-staff-gate` + typecheck.
- [ ] **Step 3:** Commit `feat(admin): support-case writes — SLA clock, guarded transitions, staff-only ownership`.

---

### Task 2: Error-group state + lead writes (repo + tests)

**Files:**
- Modify: `apps/web/lib/repo/admin.ts` (3 functions), `apps/web/test/admin-staff-gate.test.ts`
- Modify: `apps/web/app/(admin)/growth-analytics-model.ts` (`GrowthLeadStage` union + `lost`) and any view badge-tone map that switches on stage (grep `GrowthLeadStage` / stage tone in `GrowthOperationsViews.tsx` — `lost` → `danger` tone)
- Create: `apps/web/test/admin-errors-leads-writes.test.ts`

**Interfaces:**
```ts
setErrorGroupState(staffUserId, groupId, state: 'open'|'investigating'|'resolved', reason, ctx?): Promise<void>
export type LeadStage = 'new' | 'qualified' | 'scheduled' | 'won' | 'lost';
createLead(staffUserId, input: { company: string; contact: string; source: string; seats?: number; stage?: LeadStage; nextStep?: string }, reason, ctx?): Promise<{ id: string }>
updateLead(staffUserId, leadId, patch: { stage?: LeadStage; nextStep?: string; seats?: number }, reason, ctx?): Promise<void>
```

Error transition map: `open → investigating|resolved` · `investigating → open|resolved` · `resolved → open`; audit `error.state_set`, platform sentinel, before/after state. Leads: platform sentinel; `seats` integer ≥1 ("Koltuk sayısı 1'den küçük olamaz."); `updateLead` requires ≥1 patch field ("Değiştirilecek alan yok."); audit payloads carry `company` + changed fields, never `contact`. Update the Lead schema doc comment's stage union to include `lost` (comment-only).

- [ ] **Step 1:** Failing tests: error transitions (legal/illegal/reopen) · lead create defaults (seats 1, stage 'new') · seats<1 rejected before tx · empty patch rejected before tx · `contact` absent from audit payloads · stage `lost` accepted end-to-end.
- [ ] **Step 2:** RED → implement (+ model/view `lost` tone) → gate test (+3 CALLS, +3 reason-list, tx `errorGroup: { findUnique, update }`, `lead: { create, findUnique, update }`) → GREEN + typecheck + full web suite.
- [ ] **Step 3:** Commit `feat(admin): error-group state and lead writes; honest lost stage`.

---

### Task 3: Report-schedule writes + support report builder (repo + tests)

**Files:**
- Modify: `apps/web/lib/repo/admin.ts` (2 functions), `apps/web/lib/reports/registry.ts` (add `TABLELESS_REPORTS` export + register support builder), `apps/web/app/(admin)/reporting-model.ts` (library entry flip), `apps/web/test/admin-staff-gate.test.ts`, `docs/report-runner.md` (schedule creation now panel-first; seed section removed)
- Create: `apps/web/lib/reports/builders/support-operations.ts`, `apps/web/test/report-builder-support.test.ts`, `apps/web/test/admin-schedule-writes.test.ts`
- Delete: `apps/web/scripts/seed-report-schedule.ts` + its `"seed-reports"` npm script (panel replaces it)

**Interfaces:**
```ts
// registry.ts ekleri
export const TABLELESS_REPORTS: readonly string[] = ['command-center'];
// + REPORT_BUILDERS['support-operations'] = buildSupportOperations

// admin.ts
createReportSchedule(staffUserId, input: { reportId: string; cadence: 'daily'|'weekly'|'monthly'; format: 'digest'|'csv'; recipients: string[] }, reason, ctx?): Promise<{ id: string }>
setReportScheduleStatus(staffUserId, scheduleId, status: 'active'|'paused', reason, ctx?): Promise<void>
```

Guards per spec §④ with exact strings ("Bu rapor koşturulamıyor." / "Bu raporun tablo çıktısı yok." / recipients 1–10 each `@`, lowercased). admin.ts imports `REPORT_BUILDERS`/`TABLELESS_REPORTS` from `../reports/registry` (allowed: the import guard only walks `app/`). Schedule + recipients in one tx; audit `report.schedule_created` payload `{ reportId, cadence, format, recipients: <count> }`.

`buildSupportOperations` — full contract: sections `Open cases` (per-status counts), `Priority pressure` (per-priority counts of unresolved), `Window` (created in window, escalated count, **SLA breaches** = `slaDueAt < window.end && status !== 'resolved'`); table columns `['Reference', 'Customer', 'Category', 'Priority', 'Status', 'Due']` over unresolved cases, `Customer` = orgName or `'—'`, `Due` = `Xd left`/`Xd overdue` vs window.end; **select must not include requesterEmail** (test asserts select keys, activation-builder style). reportId `'support-operations'`, title `'Support operations'`. Library entry: status `'ready'`, freshness matching siblings; `support-sla` KPI stays `source-gap` (update its guardrail note: "resolvedAt yok — uyum yüzdesi hesaplanamaz").

Also in `reporting-model.ts` (this task, because Task 7's UI consumes them and the import guard forbids `app/` importing `lib/reports`): add
```ts
/** Registry ile eşleşmek ZORUNDA — report-builder-support testi iddia eder. */
export const RUNNABLE_REPORTS = ['command-center', 'revenue-collections', 'product-activation', 'customer-health', 'security-evidence', 'support-operations'] as const;
export const TABLELESS_REPORT_IDS = ['command-center'] as const;
```
and assert in `report-builder-support.test.ts`: `Object.keys(REPORT_BUILDERS).sort()` equals `[...RUNNABLE_REPORTS].sort()`, and `TABLELESS_REPORT_IDS` equals registry's `TABLELESS_REPORTS`.

- [ ] **Step 1:** Failing tests: schedule create guards (unknown report, pdf → route-level but repo re-rejects non digest/csv, csv+command-center, 0/11 recipients, bad email) · rows created in one tx with nextRunAt null · pause/resume only from the other state · builder: counts, SLA-breach math at the boundary (due exactly at end → not breached; 1ms before → breached), requesterEmail select-exclusion, registry contains support-operations, TABLELESS consistency (command-center builder output really has no table — import and assert).
- [ ] **Step 2:** RED → implement → seed script + npm script removed (grep for stragglers) → gate test (+2) → GREEN: report tests + gate + full suite + typecheck.
- [ ] **Step 3:** Commit `feat(admin): report schedules from the panel; support-operations report goes ready`.

---

### Task 4: Staff flag via approval execution (repo + tests)

**Files:**
- Modify: `apps/web/lib/repo/admin.ts` (2 exports; ApprovalEvent type-union comment gains `'executed'`), `apps/web/test/admin-staff-gate.test.ts`
- Create: `apps/web/test/admin-staff-flag.test.ts`

**Interfaces:**
```ts
setStaffFlag(staffUserId, targetEmail: string, grant: boolean, approvalRequestId: string, reason, ctx?): Promise<void>
listStaffChangeRequests(staffUserId): Promise<Array<{ id: string; targetType: 'staff_grant'|'staff_revoke'; targetId: string; status: string; executed: boolean }>>
```

Normalization pinned: both the UI (Task 7 dialog) and `setStaffFlag` use `email.trim().toLowerCase().slice(0, 64)` when writing/comparing `targetId` (createApprovalRequest slices targetId to 64 — comparisons must match). Guards in tx, exact strings from spec §⑤: approved+matching request ("Bu işlem için onaylanmış talep yok."), not yet executed via `approvalEvent.count({ where: { requestId, type: 'executed' } }) === 0` ("Bu onay zaten kullanılmış."), target user exists, grant-on-staff ("Zaten personel.") / revoke-on-nonstaff ("Zaten personel değil."), lockout guard `user.count({ where: { isStaff: true } })` — revoke leaving 0 → "Son personelin yetkisi düşürülemez." Write `user.update isStaff` + `ApprovalEvent 'executed'` (payload `{ action, target: <email> }`) + audit `staff.flag_set` (platform sentinel, targetId = user id, before/after isStaff). `listStaffChangeRequests`: approvalRequest.findMany domain security + targetType in (...), with `events: { where: { type: 'executed' }, take: 1 }` mapped to boolean; günlüksüz (staff emails only); CALLS entry.

- [ ] **Step 1:** Failing tests: happy grant + happy revoke · each guard string · double-execute blocked · lockout blocked (count 1) · wrong targetType/targetId/status blocked · executed event + audit written in same tx · listStaffChangeRequests maps executed correctly.
- [ ] **Step 2:** RED → implement → gate test (+2 CALLS; setStaffFlag into the empty-reason list) → GREEN + typecheck + full suite.
- [ ] **Step 3:** Commit `feat(admin): staff flag flips only through an approved, single-use request`.

---

### Task 5: API routes ×10 + create-route smoke tests

**Files (Create):** the ten routes from the spec's route table, under `apps/web/app/api/admin/{support,errors,leads,report-schedules,staff}/...` — real `[id]` bracket directories (Task-3-of-governance incident: verify with `find`, never shell-escape the brackets).
**Create tests:** `apps/web/test/api-support-route.test.ts`, `api-leads-route.test.ts`, `api-report-schedules-route.test.ts`, `api-staff-flag-route.test.ts` (template: `api-approvals-route.test.ts`).

Idiom: `invoices/[id]/paid/route.ts` + governance routes. Type-aware reads (the binding lesson): `seats` → `typeof body.seats === 'number' ? body.seats : undefined`; `grant` → must be `typeof === 'boolean'` else 400 "grant (true|false) gerekli."; `recipients` → `Array.isArray(body.recipients) ? body.recipients.filter((x): x is string => typeof x === 'string') : []`. Enum guards at the edge for channel/category/priority/status/state/cadence/format. Smoke tests assert: number/boolean/array values reach the repo spy intact; string garbage in typed fields → 400 or undefined-passthrough per field; each create route's full body maps to the exact repo args.

- [ ] **Steps:** routes → smoke tests RED where written first is practical (at minimum write them before commit) → `find` bracket check → typecheck + full suite → commit `feat(api): wave-2 write endpoints with type-aware body reads`.

---

### Task 6: UI — support screens + errors screen

**Files:**
- Create: `apps/web/app/(admin)/ui/SupportActions.tsx`, `apps/web/app/(admin)/ui/ErrorActions.tsx`
- Modify: `apps/web/app/(admin)/ui/SupportOperationsViews.tsx`, `apps/web/app/(admin)/ui/PlatformOperationsViews.tsx` (additive blocks only), support queue/cases pages + platform/errors page (header buttons, stale comments)

Pattern: `ApprovalActions.tsx`/`KvkkActions.tsx` + `GovernanceOperationsViews` wiring are THE precedents — buttons-emit-picks, `<XActionDialog>` sibling replaces the detail pane, `onDone={() => setSelected(null)}`, `{!preview && ...}`, header `btn btn-primary btn-sm`, `w-100` on row buttons AND coloured blocks if these views share that card pattern (read them). SupportActions: `NewSupportCaseButton` (all create fields + reason; reference placeholder `SUP-2026-0001`) + `SupportActionButtons/Dialog` (status select limited to legal targets from the CURRENT status via a mirror of `SUPPORT_TRANSITIONS`; owner; priority with SLA-recompute note in the subtitle). ErrorActions: state select limited to legal targets. Read each view first; if a view has no detail pane, place row actions per that view's own layout (additive) and note it.

- [ ] **Steps:** read precedents + target views → implement → verify typecheck + full suite (both guards) → if Task 0 succeeded, load the relevant `/dev/admin-preview/...` routes and visually confirm one-modal + layouts (screenshot in report) → commit `feat(admin-ui): support and error controls on the one-modal pattern`.

---

### Task 7: UI — leads + schedules + staff screens

**Files:**
- Create: `apps/web/app/(admin)/ui/LeadActions.tsx`, `apps/web/app/(admin)/ui/ScheduleActions.tsx`, `apps/web/app/(admin)/ui/StaffFlagActions.tsx`
- Modify: `GrowthOperationsViews.tsx`, `ReportingOperationsViews.tsx`, governance/staff view (`StaffRolesView`) — additive; their pages (header buttons, stale comments; `reports/scheduled` page comment updated: creation now panel-first, seeder retired)

LeadActions: create (company/contact/source/seats/stage/nextStep + reason) + update dialog (stage incl. `lost`, nextStep, seats). ScheduleActions: create — report select uses `RUNNABLE_REPORTS` from `../operations-model`-adjacent `reporting-model.ts` (added in Task 3; the import guard forbids `app/` importing `lib/reports`, and Task 3's test pins the const to the registry). Format select digest/csv with csv disabled for ids in `TABLELESS_REPORT_IDS` (same source). Recipients: textarea, one email per line, client-side split+trim → array. Pause/Resume row action. StaffFlagActions: `RequestStaffChangeButton` (email + grant/revoke + reason → POST `/api/admin/approvals` with domain security, targetType, targetId normalized `trim().toLowerCase().slice(0,64)`, auto title) + `ExecuteStaffChangeButton` shown per approved+unexecuted matching request (page feeds `listStaffChangeRequests` data) → POST `/api/admin/staff/flag`.

- [ ] **Steps:** read views → implement → typecheck + full suite → preview verification if Task 0 succeeded → commit `feat(admin-ui): lead, schedule and staff-change controls`.

---

### Task 8: Final verification

- [ ] `npm run typecheck && npm test` at root — three workspaces green.
- [ ] `DATABASE_URL=placeholder... npm run build -w apps/web` — green; route list includes the 10 new endpoints.
- [ ] `git status` clean; every task committed.
