# Mailmyra Superadmin Operations Panel - Comprehensive Product Brief

Date: 2026-08-19  
Status: Product and operations brief  
Scope: Voldi staff-only platform administration  
Audience: Product owner, developer, finance, support and compliance staff

This document defines the highest practical level of platform control for Mailmyra without weakening customer isolation, auditability or the product's locked commercial decisions.

It supersedes the idea that the superadmin panel is only a customer list plus invoice screen. That narrower scope remains the first delivery phase, but the final information architecture must support customer operations, finance, support, compliance, product analytics, platform health and controlled configuration.

---

## 1. Product truths this panel must respect

1. Mailmyra has one product and one list price: **$1 per active sender per year**.
2. A seat is an active `SenderIdentity`, not a user account and not a signature.
3. Draft senders do not consume seats.
4. Pro, Team and Agency are workspace modes, not separate commercial plans.
5. Billing is manual for the first customers. This panel does not become an automatic subscription platform.
6. The invoiced amount is authoritative. `seats x unit price` is only a suggested calculation.
7. Agency invoices belong to the root billing organization; child organizations remain visible under that root.
8. There is no Microsoft 365 or Google Workspace synchronization. The panel must not imply directory sync, deployment sync or remote installation status.
9. Export is manual rich HTML / `.htm` / ZIP output. Admin analytics may show recorded export events, not whether a recipient's mail client installed the signature.
10. Customer signatures, senders, brand settings and memberships are customer-owned content. Staff reads them for support; staff does not silently edit them.
11. No impersonation.
12. No hard delete for organizations, users, invoices, access logs or audit records.
13. The renderer, templates and pricing constants remain code-controlled. The admin panel is not a code editor.

---

## 2. What “full control” means

Full control does not mean unrestricted mutation of every database row. It means:

- every customer and workspace can be found;
- commercial state can be understood and corrected;
- every manual correction has a reason, before/after values and an immutable audit trail;
- customer content can be inspected safely for support;
- revenue, trials, seats, exports, assets, invitations and product adoption can be analyzed;
- abuse, suspicious access and system health can be monitored;
- support can resolve account and billing problems without using raw SQL for daily work;
- irreversible or privacy-sensitive actions are either prohibited or require elevated confirmation.

The panel is an **operations control plane**, not a second customer panel.

---

## 3. Non-negotiable safety architecture

### 3.1 Replace the single staff permission level

The current `User.isStaff` boolean is acceptable as an entry gate but not as the final authorization model. It gives every staff member the same reach.

Add staff roles or grants:

| Staff role | Primary purpose |
|---|---|
| `super_admin` | Full platform administration and staff permission changes |
| `support_viewer` | Read customer context and support history |
| `support_operator` | Read customer data and perform approved account/entitlement operations |
| `finance` | Invoices, payments, revenue reports and entitlement visibility |
| `compliance_auditor` | Read-only access logs, legal records and audit exports |
| `platform_operator` | System health, mail delivery, assets and operational diagnostics |

One staff user may hold multiple grants. UI visibility is convenience; every repository function must enforce permission server-side.

### 3.2 Sensitive reads must fail closed

Customer emails, sender identities, signature data and rendered signature previews are personal data.

For these reads:

1. confirm staff permission;
2. resolve the target organization without loading personal data;
3. create the `StaffAccess` record;
4. only then return personal data.

If the access log cannot be written, the sensitive screen must not open. A warning in server logs is not enough for a KVKK access trail.

### 3.3 Admin writes must be transactional

General customer activity logging may be best-effort, but superadmin writes cannot be.

Entitlement changes, invoice creation, invoice status changes, account suspension and session revocation must write:

- the business change;
- an immutable internal admin action record;
- the customer-visible activity record when applicable;

inside one transaction. If the audit record fails, the business change must roll back.

### 3.4 Every write requires a reason

All staff writes require:

- reason category;
- free-text explanation;
- optional support ticket/reference number;
- before and after values;
- staff user, IP, user agent and request ID;
- timestamp.

No silent toggle changes.

### 3.5 Step-up authentication

Sensitive actions require recent re-authentication. Staff accounts should ultimately require 2FA.

Step-up actions include:

- changing entitlements;
- extending or ending a trial;
- suspending access;
- changing invoice status;
- voiding an invoice;
- revoking all user sessions;
- changing staff grants;
- exporting compliance data.

### 3.6 No impersonation

There is no “log in as customer”. Support uses purpose-built read-only views. This keeps staff activity separate from customer activity.

### 3.7 No deletion

Use explicit lifecycle states:

- organization: active, suspended, cancelled, archived;
- invoice: due, paid, void;
- sender: draft, live, inactive;
- user: active, suspended;
- staff grant: active, revoked.

Archived records remain searchable by authorized staff.

---

## 4. Admin shell and navigation

The superadmin shell must be visually impossible to confuse with the customer panel.

### Persistent shell

- distinct dark or high-contrast staff color, not the normal customer blue;
- permanent **STAFF / PRODUCTION** environment label;
- current staff identity and staff role;
- global search;
- command palette;
- notifications and task queue;
- visible “customer data context” ribbon on every customer detail page;
- production/staging indicator;
- build/version indicator in the footer.

### Main navigation

```text
Command Center

Customers
  Organizations
  Users
  Trials & Entitlements

Finance
  Invoices
  Payments
  Revenue

Product Operations
  Exports
  Assets & CDN
  Invitations
  Templates (read-only)

Support
  Cases & Notes
  Customer Activity

Trust & Safety
  Staff Access Log
  Admin Action Log
  Security Events
  Legal & KVKK

Platform
  System Health
  Mail Delivery
  Data Quality
  Configuration (read-only by default)

Analytics
  Product Adoption
  Customer Health
  Cohorts & Retention

Optional Content
  Marketing Content
  Leads & Demo Requests

Admin Settings
  Staff Directory
  Saved Views
```

---

## 5. `/admin` - Command Center

This is not the customer table. It is the daily operating screen.

### 5.1 Top KPI strip

Show values with comparison to the previous equivalent period:

1. Root customers
2. Active customers
3. Active seats
4. Entitled seats
5. Seat utilization
6. Trials ending in 7 days
7. Past-due customers
8. Outstanding invoice amount
9. Billed revenue this year
10. Collected revenue this year
11. Exports in the last 24 hours
12. Customers needing attention

Do not label `active seats x $1` as recognized revenue. Show it as **list-price seat base**. Keep these separate:

- list-price seat base;
- invoiced amount;
- collected amount;
- outstanding amount.

### 5.2 Daily action queues

The dashboard must answer “what needs action today?”

- trials ending in 3/7 days;
- expired trial still marked active;
- active seats above entitlement;
- invoices due today;
- invoices overdue by 1-7, 8-30 and 30+ days;
- invoice due while entitlement is active;
- payment recorded but invoice still due;
- failed or repeatedly failing mail deliveries;
- unusually high export volume;
- new root customer with no sender/signature/export activity;
- unresolved support cases;
- sensitive customer access in the last 24 hours;
- data quality violations.

Each queue opens a filtered list. No decorative graph without an operational destination.

### 5.3 Trend panels

- new customers by week/month;
- trial to active conversion;
- active seats over time;
- exported signatures over time;
- billed vs collected revenue;
- overdue aging;
- customer activation funnel;
- top workspace modes: Pro, Team, Agency, if workspace mode is stored reliably.

### 5.4 Recent critical activity

Separate streams:

- customer activity;
- staff writes;
- staff sensitive reads;
- finance activity;
- security events;
- system incidents.

---

## 6. `/admin/orgs` - Customer organizations

### 6.1 Default table

Only root billing organizations appear by default.

Columns:

- organization name;
- organization ID;
- created date;
- entitlement state;
- trial end;
- price version;
- active / entitled seats;
- utilization percentage;
- members;
- child organizations;
- signatures;
- last export;
- last customer activity;
- open invoice amount;
- overdue days;
- health status;
- tags;
- assigned support owner.

### 6.2 Filters

- entitlement state;
- trial ending in N days;
- trial expired;
- active seats over entitlement;
- no active sender;
- no export yet;
- stale for 7/30/90 days;
- invoice status;
- overdue aging;
- root/child organization;
- Agency tree present;
- price version;
- created date;
- support owner;
- internal tag;
- health state.

### 6.3 Saved views

Examples:

- Trials ending this week
- Over seat entitlement
- First invoice pending
- Past due, still active
- New customers not activated
- Agency accounts
- No export in 30 days
- High-touch support customers

Staff may save private views. Shared views require `super_admin` permission.

### 6.4 Bulk actions

Bulk actions are deliberately narrow:

- export filtered commercial metadata as CSV;
- assign internal support owner;
- add internal tag;
- create a support task.

No bulk entitlement mutation, suspension or invoice status change.

---

## 7. `/admin/orgs/[id]` - Customer 360

This is the main staff workspace.

### 7.1 Persistent customer context header

Always visible:

- **Viewing customer data** warning ribbon;
- organization name and ID;
- root/child relationship;
- entitlement state;
- active/entitled seats;
- price version;
- invoice status;
- trial end;
- customer health;
- last activity;
- support owner;
- internal tags.

The ribbon must survive tab changes and scrolling.

### 7.2 Tabs

```text
Overview
Organization Tree
People
Senders
Signatures
Brand
Activity
Billing
Support
Staff Access
Legal
```

### 7.3 Overview tab

- organization identity;
- lifecycle timeline;
- seat usage and entitlement history;
- activation funnel state;
- last export;
- signature and sender counts;
- member count and roles;
- open invoices;
- recent customer activity;
- recent staff actions;
- data quality warnings;
- internal support summary.

### 7.4 Organization Tree tab

For Agency mode:

- root billing organization at the top;
- child customer organizations;
- active seats per child;
- members, senders, signatures and last export per child;
- total tree seats;
- invoice remains attached to the root;
- selecting a child changes customer context with a visible breadcrumb.

No drag-and-drop reparenting in the first version. Moving an organization is a high-risk support operation requiring a dedicated reviewed workflow.

### 7.5 Entitlement control

Editable only by permitted staff:

- entitled seats;
- entitlement state;
- trial end date;
- price version only through a dedicated migration action;
- optional internal commercial note.

Before save, show:

- current values;
- proposed values;
- impact on customer access;
- whether active seats exceed the new entitlement;
- customer-visible activity message;
- mandatory reason and reference.

The customer activity stream must say what changed and that support changed it. Do not expose internal staff notes to the customer.

### 7.6 People tab

Read-only customer data:

- email;
- role;
- email verification status;
- joined date;
- last login;
- active session count;
- membership organization;
- invitation history.

Controlled account actions, added only with dedicated permissions:

- resend verification email;
- resend or cancel pending invitation;
- send password-reset link;
- revoke all sessions;
- temporarily suspend login;
- restore suspended login.

Staff never sees passwords, hashes or reset tokens. Every action requires a reason and appears in the internal admin action log. Session revocation and suspension require step-up authentication.

### 7.7 Senders tab

Read-only customer content:

- display name;
- email;
- job title;
- department;
- draft/live/inactive status;
- first published date;
- deactivated date;
- last export;
- assigned signature count;
- seat consumption;
- organization in an Agency tree.

Filters:

- state;
- has/no signature;
- exported/not exported;
- stale export;
- child organization;
- created date.

No edit, publish, deactivate or delete actions for staff.

### 7.8 Signatures tab

Implement `listOrgSignatures` as a staff-only repository function.

List metadata first:

- signature name;
- template;
- assigned sender;
- organization;
- created/updated date;
- last export through its sender when available;
- asset count;
- content completeness flags.

Signature preview is deliberately opt-in:

- no automatic rendering of every signature in a list;
- click “Open preview”;
- write `StaffAccess(scope='signature', targetId=signatureId)` before loading data;
- render in a sandboxed iframe using the real renderer;
- show a persistent read-only badge;
- no builder controls and no save path;
- no raw HTML by default;
- a separate permission is required to inspect raw rendered HTML for debugging.

### 7.9 Brand tab

Read-only support view:

- current management modes;
- locked/default fields;
- template;
- colors;
- font;
- logo metadata;
- CTA and legal-text presence;
- last update;
- actor from customer activity where available;
- real read-only preview.

Do not provide staff editing controls.

### 7.10 Activity tab

Customer-visible activity stream:

- filter by type, actor, target and date;
- link to target when it still exists;
- preserve deleted-target labels from copied payloads;
- export filtered activity for support/compliance;
- identify staff-originated customer-visible changes.

### 7.11 Billing tab

- invoice list;
- current outstanding amount;
- aging;
- payment history;
- price version;
- entitled and active seat history;
- create invoice;
- record payment;
- mark paid;
- void invoice;
- print/download invoice;
- internal finance notes;
- reminder history.

### 7.12 Support tab

Internal only:

- support owner;
- customer health summary;
- internal notes;
- open/closed support cases;
- priority;
- next follow-up date;
- linked invoice, sender, signature or user;
- attachments with strict file policy;
- external ticket/reference number.

Internal notes never enter the customer activity stream.

### 7.13 Staff Access tab

- who viewed this organization;
- staff role;
- scope;
- target ID;
- reason/ticket if required;
- IP, user agent and request ID;
- timestamp;
- unusual-access indicator;
- export for KVKK request.

### 7.14 Legal tab

- terms/privacy/DPA acceptance;
- document version;
- accepted time;
- accepting user;
- IP;
- organization data export requests;
- deletion/anonymization requests;
- retention status;
- legal hold flag, if introduced later.

---

## 8. `/admin/users` - Global user directory

The organization view is customer-centric; this page is identity-centric.

Columns:

- email;
- verified/unverified;
- account status;
- created date;
- last login;
- organization memberships;
- highest customer role;
- active sessions;
- invitations;
- staff flag/grants;
- suspicious activity indicator.

Search by email or user ID. Exact-match searches may reveal sensitive records only to authorized staff.

User detail:

- profile identity;
- memberships and roles;
- active sessions;
- login history summary;
- legal acceptances;
- invitations;
- customer activity;
- staff actions affecting the user;
- controlled actions: resend verification, reset link, revoke sessions, suspend/restore.

No manual password assignment.

---

## 9. `/admin/trials` - Trials and entitlements

This page manages commercial lifecycle, not subscription automation.

Views:

- started today/this week;
- ending in 3/7/14 days;
- expired;
- converted to active;
- cancelled;
- past due;
- over entitlement;
- inactive after trial;
- trial with no activation event.

Metrics:

- trial starts;
- verification rate;
- first-signature rate;
- first-sender rate;
- first-publish rate;
- first-export rate;
- conversion rate;
- median time to first export;
- expired without activation;
- reactivation rate.

Trial extension is a controlled write with reason, old/new date and customer-visible activity.

---

## 10. Finance

### 10.1 `/admin/invoices`

Global invoice list across root billing organizations.

Columns:

- invoice number;
- root organization;
- issued date;
- due date;
- aging;
- seats;
- unit price;
- authoritative amount;
- adjustment from `seats x unit`;
- currency;
- status;
- payment date;
- payment reference;
- last reminder;
- actions.

Filters:

- due/paid/void;
- overdue aging;
- issue/due date;
- organization;
- currency;
- adjusted invoices;
- missing due date;
- amount range;
- payment reference present/missing.

### 10.2 Invoice creation

Fields:

- invoice number;
- root organization;
- issue date;
- due date;
- seats;
- unit amount;
- authoritative total amount;
- currency;
- customer-facing note;
- internal note;
- billing period label;
- reason/reference.

Defaults:

- atomic next invoice number;
- current active seats across the root tree;
- unit $1;
- suggested total `seats x unit`;
- default due date from finance policy.

Invoice number generation must be atomic. A displayed “next number” alone is unsafe when two staff members create invoices simultaneously.

### 10.3 Payment recording

Do not overload `status='paid'` as the whole payment record.

Store:

- paid date;
- paid amount;
- currency;
- method: bank transfer, cash, other;
- bank/payment reference;
- recorded by;
- note;
- optional attachment/reference;
- before/after audit.

If partial payments are needed, use a separate payment table rather than one `paidAt` field.

### 10.4 Voiding

- invoice is never deleted;
- void requires reason;
- previous status is preserved in status history;
- void date and staff actor are recorded;
- customer-visible activity is created;
- a paid invoice cannot be silently voided.

### 10.5 `/admin/revenue`

Keep separate metrics:

- list-price active seat base;
- entitled seat value;
- invoices issued;
- payments collected;
- outstanding receivables;
- overdue receivables;
- discounts/adjustments;
- revenue by price version;
- revenue by workspace mode;
- root vs Agency accounts;
- collection time;
- trial conversion value.

Annual pricing means ARR-style wording must be precise. Do not display MRR unless it is explicitly derived and labeled as normalized annual value / 12.

---

## 11. Product Operations

### 11.1 `/admin/exports`

The system can report recorded export events, not installation state.

Metrics and list:

- rich HTML copy events, if recorded;
- `.htm` downloads, if recorded;
- ZIP exports;
- organization;
- actor;
- sender count;
- signature count;
- timestamp;
- request ID;
- success/failure;
- duration and output size, if instrumented;
- unusual volume indicator.

Do not claim that Outlook or Gmail is synchronized or installed.

### 11.2 `/admin/assets`

Based on the existing `Asset` model and CDN policy:

- asset ID;
- organization;
- kind;
- filename;
- CDN URL;
- MIME/output format;
- bytes;
- hash;
- created date;
- referenced/unreferenced status;
- preview;
- broken URL check status;
- duplicate hash groups;
- storage totals by organization and kind.

No casual delete. CDN URLs are designed to remain stable for years. Any future purge process must verify references, retention and legal requirements.

### 11.3 `/admin/invitations`

- pending, accepted, expired and cancelled invitations;
- organization;
- invited email;
- role;
- sender;
- created/expiry/accepted dates;
- resend count;
- mail status;
- controlled resend/cancel actions.

### 11.4 `/admin/templates`

Read-only operational registry:

- template ID;
- display name;
- renderer version/build;
- active availability;
- signatures using it;
- last test date across the six-client matrix;
- known issues;
- preview;
- code release containing the template.

Templates are code modules. Do not edit template HTML from the admin panel.

---

## 12. Support operations

### 12.1 Global search

Search exact identifiers across:

- organization name/ID;
- root and child organization;
- user email/ID;
- sender email/ID;
- signature name/ID;
- invoice number/ID;
- asset filename/hash;
- support case/reference;
- request ID.

Results are grouped by entity. Personal-data results obey staff permissions and create access records when opened.

### 12.2 Support cases

Add a lightweight internal case model if external ticketing is not used:

- case number;
- organization;
- contact user;
- category;
- priority;
- status;
- assigned staff;
- summary;
- internal notes;
- linked entities;
- next action date;
- opened/resolved dates;
- external reference.

### 12.3 Customer health

Use a transparent rule-based score, not a black-box score.

Possible signals:

- email verified;
- signature created;
- sender created;
- sender published;
- first export completed;
- export recency;
- active/entitled seat ratio;
- member activity;
- invoice standing;
- open support case;
- trial days remaining.

Show the reasons behind the status:

- Healthy
- Onboarding
- Needs attention
- Commercial risk
- Inactive

Never let a health score automatically suspend or modify a customer.

---

## 13. Trust, safety and compliance

### 13.1 `/admin/access`

Staff sensitive-read log:

- staff identity;
- staff role;
- organization;
- scope;
- target;
- date/time;
- IP;
- user agent;
- request ID;
- reason/reference;
- unusual access flag.

Filters:

- staff;
- organization;
- scope;
- target ID;
- date range;
- after-hours access;
- high-volume access;
- access without support case/reference.

### 13.2 `/admin/actions`

Immutable staff-write audit:

- action type;
- organization/user/invoice target;
- actor;
- permission used;
- before snapshot;
- after snapshot;
- reason;
- ticket/reference;
- IP/user agent/request ID;
- success/failure;
- timestamp.

This is separate from the customer-visible `ActivityEvent` stream.

### 13.3 `/admin/security`

- failed login attempts;
- rate-limit triggers;
- suspicious IP/email patterns;
- staff login history;
- staff sessions;
- sensitive access spikes;
- mass export events;
- repeated password-reset requests;
- suspended users;
- staff grant changes;
- audit log failures;
- CSP/security header status, if measured;
- application security version/build.

### 13.4 `/admin/legal`

- legal document versions;
- acceptance counts by version;
- users/orgs missing required acceptance;
- KVKK requests;
- data export requests;
- deletion/anonymization requests;
- legal holds;
- retention queues;
- compliance export package.

The panel supports the process; it does not silently delete data.

---

## 14. Platform operations

### 14.1 `/admin/system`

Read-only operational dashboard:

- application version/commit;
- environment;
- database connectivity;
- latest migration version;
- storage/CDN reachability;
- SMTP reachability;
- mail queue/last delivery;
- error rate;
- response latency;
- export job failures;
- asset-processing failures;
- scheduled cleanup status;
- last successful backup status supplied by infrastructure;
- uptime/incidents.

Do not place raw database consoles, shell execution, secret editing or migration execution in the web panel.

### 14.2 `/admin/mail`

Provider-independent SMTP operations:

- message type;
- recipient masked by default;
- organization;
- queued/sent/failed state;
- attempts;
- last error category;
- timestamps;
- request ID;
- safe resend for supported transactional messages.

Never display SMTP credentials or full tokenized links.

### 14.3 `/admin/data-quality`

Automated checks:

- active seats exceed entitlement;
- expired trial in active state;
- paid invoice still due;
- void invoice treated as collectible;
- child organization invoiced directly;
- root invoice missing root org;
- sender live without signature;
- malformed or unknown activity type;
- unknown invoice status;
- missing price version;
- orphaned assets;
- missing legal acceptance version;
- staff access log write failure;
- duplicate invoice number attempt;
- stale pending invitations;
- assets over policy limits.

Each finding has severity, first seen, last seen, affected records and a safe resolution guide. Automated repair is not the default.

### 14.4 Configuration

Show important runtime decisions as read-only values:

- export requires authentication;
- current pricing version;
- current legal document versions;
- mail provider host name without credentials;
- current asset limits;
- application/build version;
- environment.

Configuration that requires deployment should not be changed through the panel.

---

## 15. Analytics

### 15.1 Activation funnel

```text
Account created
Email verified
Signature created
Sender created
Sender published
First export
Invoice issued
Invoice paid
```

Measure conversion and median time between stages. Keep root organization and user-level funnels distinct.

### 15.2 Product adoption

- active organizations daily/weekly/monthly;
- active seats;
- signatures per organization;
- senders per organization;
- published sender ratio;
- first export rate;
- export frequency;
- ZIP export usage;
- template distribution;
- brand settings adoption;
- locked/default field adoption;
- member collaboration adoption;
- Agency child-organization adoption.

### 15.3 Retention and cohorts

- signup cohort;
- first-export cohort;
- first-payment cohort;
- price-version cohort;
- root customer vs Agency cohort;
- retained export activity at 7/30/90 days;
- seat growth/shrinkage;
- reactivation after inactivity.

Do not infer email-client installation or recipient engagement unless the product later collects real, consented data for it.

### 15.4 Finance analytics

- billed and collected by month;
- outstanding aging;
- average invoice amount;
- collection time;
- adjustment/discount totals;
- seat value by price version;
- trial conversion value;
- customer concentration;
- Agency tree contribution.

### 15.5 Metric implementation

Do not run every dashboard metric from raw transactional tables on every request as the customer count grows. Introduce daily metric snapshots or an analytics event/snapshot layer.

MariaDB JSON fields are LONGTEXT and should not become the primary analytics query surface.

Every metric definition must document:

- exact numerator/denominator;
- time zone;
- inclusion/exclusion rules;
- source table/event;
- freshness;
- whether it can be recomputed.

---

## 16. Optional marketing/content operations

This module is optional and should not block the operations panel.

Potential pages:

- contact and demo requests;
- lead status and owner;
- FAQ entries;
- announcement bar;
- release notes;
- setup-guide content;
- legal document publishing;
- marketing page content blocks.

Guardrails:

- draft/review/publish workflow;
- preview before publish;
- version history and rollback;
- no direct template/code editing;
- pricing remains controlled by the locked pricing source unless the architecture is deliberately changed;
- legal document publishing requires versioning and acceptance-impact review.

---

## 17. Admin notifications and task system

Staff notifications should be operational, not noisy.

Notification classes:

- trial ending;
- over entitlement;
- invoice overdue;
- payment recorded;
- audit/access anomaly;
- mail delivery failure;
- export failure spike;
- data-quality violation;
- support follow-up due;
- system incident;
- staff permission changed.

Each notification links to a filtered screen and supports assignment, snooze and resolution. Resolving a notification does not change business data unless the user performs an explicit action.

---

## 18. Write-operation matrix

| Action | Permission | Step-up | Reason | Customer-visible activity | Internal immutable audit |
|---|---|---:|---:|---:|---:|
| Change entitled seats | support operator | Yes | Yes | Yes | Yes |
| Change entitlement state | support operator | Yes | Yes | Yes | Yes |
| Extend trial | support operator | Yes | Yes | Yes | Yes |
| Create invoice | finance | Yes | Yes | Yes | Yes |
| Record payment | finance | Yes | Yes | Yes | Yes |
| Mark invoice paid | finance | Yes | Yes | Yes | Yes |
| Void invoice | finance | Yes | Yes | Yes | Yes |
| Resend invitation | support operator | No | Yes | Optional | Yes |
| Cancel invitation | support operator | Yes | Yes | Yes | Yes |
| Send password reset | support operator | No | Yes | No | Yes |
| Revoke sessions | support operator | Yes | Yes | Yes | Yes |
| Suspend account | super admin | Yes | Yes | Yes | Yes |
| Restore account | super admin | Yes | Yes | Yes | Yes |
| Change staff grants | super admin | Yes | Yes | No | Yes |
| Export KVKK package | compliance auditor | Yes | Yes | No | Yes |

Customer-owned content edits are absent from this table because they are prohibited.

---

## 19. Required data-model additions

The exact schema belongs in an implementation spec. The brief requires concepts equivalent to:

### Staff authorization

- `StaffGrant`: user, role/permission, granted by, granted at, revoked at;
- optional `StaffAccessPolicy` for future organization-limited support access.

### Immutable admin actions

- `AdminAction`: actor, action, target type/ID, organization, before, after, reason, ticket, IP, user agent, request ID, success/failure, timestamp.

### Customer support

- `SupportCase`;
- `SupportNote`;
- internal organization tags and support owner.

### Finance

- invoice status history;
- payment records;
- payment reference;
- invoice numbering sequence;
- reminder history;
- optional internal finance note separate from customer-facing invoice note.

### Account safety

- user suspension state, reason and dates;
- organization operational state separate from entitlement state, if suspension is required.

### Operations

- mail delivery attempts/status;
- admin/system incident events;
- data-quality findings;
- daily metric snapshots;
- optional export event detail beyond the existing customer activity event.

### Access log enrichment

Add IP, user agent, request ID, staff role/permission and reason/reference to sensitive access records.

---

## 20. Repository boundaries

1. Cross-organization reads remain isolated in a dedicated admin repository layer.
2. No `if (isStaff) skip orgId filter` logic is added to customer repositories.
3. Every exported admin function enforces permission itself.
4. Customer page layouts and middleware are not the sole authorization gate.
5. Admin write functions use transactions and immutable audit writes.
6. Sensitive reads fail closed when access logging fails.
7. Admin list queries are paginated; no unbounded `findMany`.
8. All table filters are server-side once record counts grow.
9. CSV exports are permission-checked, access-logged and size-limited.
10. Signature preview uses the existing pure renderer and a sandboxed iframe.
11. Raw `Signature.data` and JSON fields are not used as ad-hoc analytics databases.
12. Secrets, raw tokens and password hashes are never returned to admin UI code.

---

## 21. UX rules

### Tables

- server pagination;
- column sorting;
- clear filters;
- saved views;
- selectable columns;
- sticky organization identity;
- CSV export only where justified;
- meaningful empty states;
- row click opens detail, not an accidental write;
- write actions live in explicit menus.

### Forms

- show before/after;
- explain business impact;
- require reason;
- use confirmation for sensitive actions;
- show request ID on failure;
- prevent double submit;
- use idempotency keys for invoice/payment writes;
- do not optimistically show a finance or entitlement write as complete before server confirmation.

### Customer-data context

Every customer page shows:

> STAFF VIEW - You are viewing data for **Organization Name**. All sensitive access is logged.

The organization name and ID remain visible during scroll and modal actions.

### Privacy by default

- mask email addresses in broad/global lists where full value is unnecessary;
- reveal full personal data only in an authorized detail context;
- do not render signature previews in bulk;
- do not include personal data in URLs;
- copy-to-clipboard actions are explicit and audited when sensitive.

---

## 22. Delivery phases

### Phase 0 - Security foundation

- staff role/grant model;
- permission enforcement helper;
- immutable admin action log;
- enriched staff access log;
- fail-closed sensitive reads;
- transactional admin writes;
- step-up authentication design;
- tests that enumerate every exported admin function and its required permission.

No customer-data UI ships before this foundation.

### Phase 1 - Core staff operations

- distinct admin shell;
- command center essentials;
- root organization list and filters;
- Customer 360 overview;
- organization tree;
- read-only members, senders and signatures;
- opt-in signature preview;
- entitlement correction;
- organization invoices;
- global invoice list;
- create invoice, mark paid and void;
- staff access log;
- admin action log;
- global search.

This phase contains Claude's original scope, corrected and secured.

### Phase 2 - Finance and support maturity

- payment records and invoice history;
- aging and revenue reports;
- support cases and notes;
- invitations operations;
- account session/verification support actions;
- trials and entitlement lifecycle;
- customer health;
- saved views and staff task queues.

### Phase 3 - Platform and compliance operations

- assets/CDN operations;
- mail delivery operations;
- data-quality dashboard;
- security events;
- legal/KVKK workflows;
- system health;
- compliance export packages;
- staff access anomaly detection.

### Phase 4 - Analytics and optional content

- metric snapshot layer;
- activation funnel;
- cohorts and retention;
- product adoption;
- finance analytics;
- optional lead/demo/content operations;
- versioned legal/content publishing.

---

## 23. Explicit non-goals

- customer impersonation;
- editing customer signatures, senders, brand settings or memberships;
- hard delete;
- automatic subscriptions or payment-provider orchestration;
- M365/Google Workspace directory synchronization;
- claiming installation status in Outlook/Gmail;
- raw SQL console;
- shell/terminal access;
- secret or environment-variable editing;
- migration execution from the web UI;
- renderer/template code editing;
- pricing edits that bypass the locked pricing source;
- invisible staff changes;
- AI-generated automatic account decisions;
- mass sensitive-data export without explicit compliance permission.

---

## 24. Launch acceptance criteria

The panel is not ready until:

1. a non-staff user cannot reach any admin repository function;
2. a staff user without the right grant cannot reach an unauthorized function;
3. every sensitive customer read creates an access record before data is returned;
4. access-log failure prevents sensitive data display;
5. every staff write has before/after, reason, actor, request and timestamp;
6. a failed audit write rolls back the staff business change;
7. staff and customer activity streams remain distinct;
8. every customer-visible support change appears in customer activity;
9. invoice number creation is concurrency-safe;
10. invoices cannot be hard-deleted;
11. voiding and payment changes preserve status history;
12. root/child organization billing scope is tested;
13. signature previews are read-only, sandboxed and target-logged;
14. tables are paginated and filters are permission-safe;
15. personal data is masked in broad views and revealed only in context;
16. no page implies M365/Google sync or email-client installation tracking;
17. dashboard metric definitions are documented and internally consistent;
18. production/staging and staff/customer context are visually unmistakable;
19. mobile and desktop layouts keep critical actions accessible;
20. keyboard navigation, focus order, contrast and screen-reader labels are tested.

---

## 25. Recommended first implementation decision

Do not begin with `/admin/orgs` markup.

Begin with:

1. staff grants and permissions;
2. fail-closed access logging;
3. immutable transactional admin actions;
4. the admin shell and customer context ribbon;
5. then the command center and organization list.

The original five-screen proposal is a useful Phase 1 slice, but building it directly on one `isStaff` boolean and best-effort audit logging would create a panel that looks powerful while being too dangerous to operate at scale.
