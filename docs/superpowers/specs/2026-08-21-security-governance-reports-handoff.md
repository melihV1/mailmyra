# Security, Governance and Reports handoff

## Scope

The Vuexy-based staff control-plane UI for **Security & Governance** and **Reports** is complete. Treat the current components, routes and responsive styles as the visual source of truth. Do not redesign these pages while connecting persistence.

## Source boundaries

- Security overview reads authoritative staff accounts, staff-access events and admin-action events in production.
- Approval and KVKK request records are preview fixtures only because no persistent approval or data-request lifecycle exists yet.
- Report library and KPI definitions are versioned definition-layer configuration.
- Scheduled report rows are preview fixtures only because no report scheduler, delivery worker or execution ledger exists yet.
- Production pages must never manufacture queue rows, run history, customer events or delivery success.
- Mailmyra does not have Microsoft 365 or Google directory synchronization. Do not add or imply those integrations.

## Backend work required

1. Add approval request, approver, decision and immutable decision-event records. Persist reason, actor, target, risk, policy version and timestamps.
2. Add KVKK request, identity verification, owner, statutory due date, evidence item, response and immutable lifecycle-event records.
3. Add report schedule, recipient, format, timezone, cadence, next-run and immutable execution/delivery records.
4. Keep report formulas, denominators, source, grain, freshness and guardrails aligned with `reporting-model.ts`.
5. Log every sensitive staff read and every privileged write. Preserve the actor/customer/target relationship.
6. Keep customer content read-only from staff surfaces. No impersonation, deletion or silent customer-data edits.
7. Do not expose approve, reject, close or schedule controls until authorization, persistence, audit and failure handling are implemented together.

## Verification contract

- Run `npm run typecheck -w apps/web`.
- Run `npm test -w apps/web`.
- Run `npm run build -w apps/web` with a valid `DATABASE_URL` and the documented local database environment.
- Verify all production staff routes with an authenticated `isStaff` account.
- Verify desktop and 390 px mobile layouts without horizontal overflow.
- Verify that production empty/source-gap states never render preview fixtures.

## Preview routes

- `/dev/admin-preview/security/overview`
- `/dev/admin-preview/security/approvals`
- `/dev/admin-preview/security/data-requests`
- `/dev/admin-preview/security/staff`
- `/dev/admin-preview/reports/library`
- `/dev/admin-preview/reports/scheduled`
- `/dev/admin-preview/reports/definitions`
