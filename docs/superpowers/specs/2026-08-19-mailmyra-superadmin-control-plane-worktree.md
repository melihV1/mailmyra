# Mailmyra Superadmin Control Plane - Product Worktree

Date: 2026-08-19  
Status: Information architecture and delivery blueprint  
Scope: Whole-business administration, product operations and analytics  
Audience: Product owner, engineering, finance, support, growth and compliance

This document expands the existing superadmin operations brief. The existing customer, invoice, support and audit capabilities remain valid, but become one workspace inside a larger Mailmyra control plane.

The goal is not a dashboard with more cards. The goal is one staff-only operating system from which Mailmyra can be monitored, analyzed and governed without turning the admin into an unsafe database editor.

---

## 1. Product definition

The superadmin is responsible for five distinct jobs:

1. **Run the business** - customers, trials, revenue, receivables and account health.
2. **Understand the product** - activation, builder usage, signatures, senders, exports and retention.
3. **Operate the platform** - mail, jobs, uploads, errors, incidents and release health.
4. **Run the website** - pages, navigation, SEO, legal documents, media, pricing content and leads.
5. **Govern access and risk** - staff permissions, audit trails, KVKK requests and controlled changes.

These jobs must not be flattened into one page. `/admin` is the command center; the remaining routes are specialist workspaces.

---

## 2. Scope honesty

Every screen and metric receives one of these data-readiness labels during implementation:

| Label | Meaning |
|---|---|
| `LIVE` | Supported by an authoritative model or event already in the repository |
| `DERIVED` | Can be calculated reliably from existing records |
| `INSTRUMENT` | Requires a new product event or historical rollup |
| `MODEL` | Requires a new domain table and workflow |
| `INTEGRATION` | Requires an external system such as analytics, uptime or error monitoring |

The UI must never substitute demo charts for unavailable production data. A not-yet-instrumented panel shows its setup state, owner and required source instead of a fabricated trend.

Current product truths remain fixed:

- one list price: `$1 per active sender per year`;
- a seat is an active sender, not a user or signature;
- manual billing;
- manual rich HTML / `.htm` / ZIP export;
- no Microsoft 365 or Google Workspace directory sync;
- no impersonation;
- no hard delete;
- customer content is read-only to staff unless an explicit governed workflow is later approved;
- invoice amount is authoritative; seat multiplication is only a suggestion.

---

## 3. Top-level information architecture

Keep the permanent sidebar to nine workspaces. Detailed pages live inside each workspace, not as dozens of first-level menu items.

```text
01  Command
02  Customers
03  Product
04  Revenue
05  Growth & Content
06  Support
07  Platform
08  Security & Governance
09  Reports
```

### Persistent shell

- `STAFF / PRODUCTION` environment strip;
- global command search for org, user, sender, signature, invoice and page;
- date range and comparison period where relevant;
- notification and incident drawer;
- staff role and step-up authentication state;
- current environment, app version and last deployment;
- data freshness indicator;
- customer-data context ribbon whenever personal data is open;
- keyboard command palette for navigation, not destructive actions.

The Vuexy dark vertical-menu shell should remain visually recognizable. Use Vuexy's cards, tables, tabs, drawers, offcanvas filters, charts, badges and form controls. Mailmyra branding is limited to logo, accent tokens and staff-environment distinction; it must not become the marketing site's grid-and-glow design.

---

## 4. Complete route worktree

```text
/admin
├── command
│   ├── overview                     # Executive and daily operations overview
│   ├── live                         # Last 24 hours event pulse
│   ├── alerts                       # Actionable cross-workspace alerts
│   └── incidents                    # Active and historical incidents
│
├── customers
│   ├── organizations                # Root organizations and agency trees
│   ├── organizations/[id]
│   │   ├── overview                 # Customer 360
│   │   ├── organization-tree        # Root and child workspaces
│   │   ├── people                   # Members and invitations
│   │   ├── senders                  # Draft, live and inactive seats
│   │   ├── signatures               # Read-only signature list and preview
│   │   ├── brand                    # Read-only brand configuration
│   │   ├── usage                    # Customer-specific product adoption
│   │   ├── billing                  # Entitlement and invoices
│   │   ├── support                  # Cases, notes and tasks
│   │   ├── activity                 # Customer activity timeline
│   │   ├── staff-access             # Who viewed this customer
│   │   └── legal                    # Acceptances and data requests
│   ├── users                        # Global user directory
│   ├── trials                       # Trial and entitlement workbench
│   ├── segments                     # Saved operational segments
│   └── health                       # Customer health and risk queue
│
├── product
│   ├── overview                     # Product KPI tree
│   ├── activation                   # Signup-to-first-export funnel
│   ├── builder                      # Builder starts, saves and completion
│   ├── signatures                   # Signature lifecycle and template mix
│   ├── senders                      # Seat lifecycle and publish behavior
│   ├── exports                      # HTML, .htm and ZIP export operations
│   ├── templates                    # Template catalogue and versions
│   ├── compatibility                # Client claims and QA evidence
│   ├── feature-adoption             # Feature depth and repeat use
│   ├── cohorts                      # Activation and retention cohorts
│   └── experiments                  # Future controlled experiments
│
├── revenue
│   ├── overview                     # Commercial health
│   ├── invoices                     # All invoices
│   ├── receivables                  # Aging and collection workbench
│   ├── payments                     # Recorded payments and references
│   ├── seats                        # Active versus entitled seat ledger
│   ├── trials                       # Trial conversion and expiry
│   ├── pricing-versions             # Price-version cohorts and grandfathering
│   ├── adjustments                  # Governed credits and manual differences
│   └── forecast                     # Scenario-based, explicitly not accounting
│
├── growth
│   ├── overview                     # Acquisition and conversion overview
│   ├── acquisition                  # Source, medium, campaign and landing page
│   ├── funnels                      # Visit-to-signup-to-activation
│   ├── campaigns                    # UTM and campaign performance
│   ├── leads                        # Contact and demo requests
│   ├── seo                          # Search landing and content health
│   └── content
│       ├── pages                    # Marketing page registry
│       ├── pages/[id]               # Draft, preview, publish and revisions
│       ├── navigation               # Header and footer navigation
│       ├── faq                      # FAQ entries and ordering
│       ├── pricing                  # Public pricing copy, not price engine
│       ├── guides                   # Install and product guides
│       ├── legal                    # Legal document versions
│       ├── media                    # Governed media library
│       ├── redirects                # Redirect registry
│       └── releases                 # Public announcements and changelog
│
├── support
│   ├── queue                        # Unified support work queue
│   ├── cases                        # Support cases
│   ├── cases/[id]                   # Case detail and customer context
│   ├── onboarding                   # Accounts stalled before first value
│   ├── tasks                        # Internal follow-ups
│   ├── notes                        # Searchable internal notes
│   └── playbooks                    # Approved support procedures
│
├── platform
│   ├── overview                     # Platform health command view
│   ├── api-health                   # Endpoint success, errors and latency
│   ├── mail                         # SMTP configuration and delivery events
│   ├── exports                      # Render/export pipeline diagnostics
│   ├── uploads                      # Asset and CDN health
│   ├── jobs                         # Scheduled and background job runs
│   ├── errors                       # Application exceptions
│   ├── data-quality                 # Invariant violations and reconciliation
│   ├── releases                     # Deployments and release health
│   ├── feature-flags                # Governed flags and overrides
│   └── environments                 # Read-only environment configuration
│
├── security
│   ├── overview                     # Security posture
│   ├── staff-access                 # Sensitive customer reads
│   ├── admin-actions                # Immutable staff writes
│   ├── auth-events                  # Login, verification and lockout signals
│   ├── sessions                     # Session inventory and revocation
│   ├── staff                        # Staff directory and status
│   ├── roles                        # Staff RBAC
│   ├── approvals                    # Pending sensitive changes
│   ├── data-requests                # KVKK/GDPR request workflow
│   ├── consent                      # Legal acceptance versions
│   ├── retention                    # Retention and cleanup jobs
│   └── audit-exports                # Governed compliance exports
│
└── reports
    ├── library                      # Saved cross-workspace reports
    ├── product                      # Product recurring reports
    ├── finance                      # Finance recurring reports
    ├── growth                       # Growth recurring reports
    ├── security                     # Security recurring reports
    ├── scheduled                    # Delivery schedules and recipients
    ├── exports                      # Generated files and expiry
    └── definitions                  # KPI dictionary and source ownership
```

Route aliases can preserve the current `/admin/orgs`, `/admin/invoices`, `/admin/access` and `/admin/actions` links during migration.

---

## 5. `/admin/command/overview` - first screen

The command center answers four questions before the user scrolls:

1. Is the business healthy?
2. Is the product being used successfully?
3. Is anything operationally broken?
4. What requires action today?

### First viewport

#### A. Operating pulse

Use a compact KPI strip with a time comparison and drill-down:

- active root customers;
- active seats;
- list-price seat base;
- invoiced amount;
- collected amount;
- trial-to-active conversion;
- first-export activation rate;
- platform success rate.

Only the first five are available from current core records. Conversion and platform success require instrumentation.

#### B. Attention queue

This is the highest-priority component, not another chart. Group alerts by severity:

- overdue invoices;
- trials ending in 3 or 7 days;
- active seats above entitlement;
- accounts with no first export;
- failed mail or export jobs;
- unresolved security/compliance items;
- data-quality violations;
- content waiting for approval.

Each row has owner, age, severity, affected entity and one clear next route.

#### C. System status rail

- web application;
- database;
- SMTP;
- renderer/export pipeline;
- asset storage/CDN;
- background jobs;
- latest deployment.

Show `Healthy`, `Degraded`, `Incident` or `No monitor`. Never infer uptime from the page loading.

### Second viewport

#### D. Business movement

- new customers and activated customers over time;
- billed versus collected revenue;
- active versus entitled seats;
- receivable aging.

#### E. Product movement

- signup -> verified -> org created -> signature saved -> sender published -> first export;
- export method mix;
- active organizations by product depth;
- template adoption.

#### F. Growth movement

- sessions -> signup -> activated customer;
- channel/source mix;
- demo and contact lead status;
- top converting landing pages.

This block remains in a source-setup state until analytics and lead capture are authoritative.

### Third viewport

- recent staff actions;
- recent sensitive customer reads;
- latest product errors;
- releases and configuration changes;
- customer health distribution;
- saved report shortcuts.

---

## 6. Workspace responsibilities

### 6.1 Customers

Purpose: Find any account, understand its full state and resolve legitimate support or commercial problems.

Primary views:

- organization tree and billing root;
- customer 360 timeline;
- member, invitation, sender and signature inventory;
- seat entitlement and trial history;
- customer activity and staff access;
- health score with transparent component breakdown;
- internal case/task history.

The health score is diagnostic, not a mysterious AI number. Its components must be visible, for example:

- activation complete;
- first export complete;
- recent product activity;
- seat utilization;
- overdue balance;
- unresolved support case.

### 6.2 Product

Purpose: Explain whether customers reach value and where the product creates friction.

North-star candidate: **organizations completing a successful export with at least one active sender in the selected period**.

Supporting metrics:

- activation completion and median time to first export;
- builder start-to-save completion;
- signature creation, assignment and deletion;
- sender draft-to-live conversion;
- active organization rate;
- export success and method mix;
- repeat export rate;
- template and feature adoption;
- cohort retention.

Do not claim email-client installation or recipient delivery. Mailmyra records export, not installation.

### 6.3 Revenue

Purpose: Make manual billing operationally complete and auditable.

Separate these concepts everywhere:

- list-price seat base;
- authoritative invoiced amount;
- collected amount;
- outstanding amount;
- overdue amount;
- adjustments.

The revenue workspace includes invoice creation, payment recording, voiding, aging, seat reconciliation, price-version cohorts and trial conversion. It is not a subscription processor or accounting ledger.

### 6.4 Growth & Content

Purpose: Connect the public website to acquisition and let authorized staff publish governed content.

Content publishing requires:

- draft, preview, approval, publish and rollback states;
- revision history and author;
- scheduled publish/unpublish;
- SEO title, description, canonical and social image;
- locale awareness;
- redirect checks;
- broken-link checks;
- legal-document version locking;
- media usage references so an in-use asset cannot disappear silently.

The renderer, email HTML templates and price engine remain code-controlled. The CMS edits approved content fields, not application code.

### 6.5 Support

Purpose: Give support a workbench, not unrestricted customer-panel access.

Support case detail combines:

- issue category and priority;
- customer context;
- internal notes;
- linked invoice, sender, signature or export;
- staff access history;
- tasks, owner and SLA target;
- approved resolution playbook.

No impersonation. Sensitive customer reads are logged before the data is returned.

### 6.6 Platform

Purpose: Detect and diagnose service degradation.

Important operational signals:

- route error rate and latency;
- database health;
- SMTP send attempts and failures;
- render/export duration and errors;
- upload validation and storage failures;
- scheduled job outcomes;
- release/build association;
- data-quality invariants;
- feature-flag changes.

The platform workspace should link symptoms to affected customers, requests and deployments where technically possible.

### 6.7 Security & Governance

Purpose: Protect customer data and make staff authority visible and reviewable.

Capabilities:

- permission-based navigation and server-side enforcement;
- step-up authentication;
- immutable access and action logs;
- staff session revocation;
- reason-required writes;
- approval workflows for high-risk operations;
- KVKK/GDPR request tracking;
- legal acceptance history;
- retention-job evidence;
- governed audit exports.

### 6.8 Reports

Purpose: Turn recurring operating questions into defined, reproducible reports.

Each report definition stores:

- owner;
- metric definitions;
- source tables/events;
- filters and date logic;
- freshness expectation;
- recipients;
- last successful generation;
- export retention.

---

## 7. Global search and command model

Global search covers:

- organization name and ID;
- user email;
- sender email;
- signature name and ID;
- invoice number;
- support case;
- content page and slug;
- incident and deployment.

Search results are permission-filtered. Personal-data queries create an access record before opening the result, not merely when previewing a signature.

The command palette supports navigation and safe creation flows such as `Create invoice` or `Open support case`. Destructive or sensitive writes never execute directly from the palette.

---

## 8. Staff roles

Replace `isStaff` as the final authority model with grants. Keep it only as the first gate during migration.

| Role | Primary access |
|---|---|
| `super_admin` | Platform-wide governance and permission administration |
| `executive_viewer` | Read-only command center and approved reports |
| `support_viewer` | Read customer and case context |
| `support_operator` | Approved entitlement and support operations |
| `finance_operator` | Invoices, payments, receivables and finance reports |
| `product_analyst` | Product events, funnels, cohorts and exports |
| `growth_editor` | Growth analytics and draft content |
| `content_publisher` | Content approval and publishing |
| `platform_operator` | Health, incidents, jobs, releases and flags |
| `security_auditor` | Logs, sessions, requests and audit exports |

### High-risk approval examples

- staff role changes;
- invoice void or large manual adjustment;
- entitlement reduction on an active customer;
- production feature-flag change;
- legal document publish;
- compliance export;
- global session revocation;
- retention-rule change.

The approval policy can start with reason + step-up authentication and evolve to two-person approval for selected action classes.

---

## 9. Metric dictionary

Every KPI must define numerator, denominator, window, source and freshness.

### Business

| Metric | Definition | Readiness |
|---|---|---|
| Active customers | Root orgs with active entitlement | `LIVE` |
| Active seats | Published, non-deactivated senders | `LIVE` |
| List-price seat base | Active seats x price-version unit price | `DERIVED` |
| Invoiced amount | Sum of authoritative invoice amounts | `LIVE` |
| Collected amount | Paid invoice amounts | `LIVE` |
| Outstanding amount | Due invoice amounts | `LIVE` |
| Trial conversion | Trial roots becoming active / eligible trial roots | `INSTRUMENT` history |

### Product

| Metric | Definition | Readiness |
|---|---|---|
| First export activation | Orgs with first real export / eligible new orgs | `DERIVED` with limits |
| Median time to first export | First export timestamp - org creation | `DERIVED` |
| Active sender rate | Live senders / all non-deleted senders | `LIVE` |
| Builder completion | Saved signature / builder start | `INSTRUMENT` |
| Export success rate | Successful exports / attempted exports | `INSTRUMENT` |
| Repeat export rate | Activated orgs with export on multiple days | `DERIVED` |
| Client installation rate | Not observable in current product | `NOT AVAILABLE` |

### Reliability

| Metric | Definition | Readiness |
|---|---|---|
| Web availability | Successful uptime probes / probes | `INTEGRATION` |
| API error rate | Failed API requests / all API requests | `INTEGRATION` |
| Export failure rate | Failed export jobs / attempted export jobs | `MODEL` or telemetry |
| SMTP delivery status | Provider-confirmed outcome by message | `MODEL` or provider integration |
| Data freshness | Time since latest successful rollup | `MODEL` |

---

## 10. Required data foundations

### 10.1 Existing authoritative sources

The current repository already supports:

- users and sessions;
- organizations and organization trees;
- memberships and invitations;
- senders and active-seat state;
- signatures and brand settings;
- assets;
- legal acceptances;
- notifications;
- customer activity;
- invoices and payment references;
- staff sensitive-read log;
- immutable staff action log.

These are enough for the first command center, customer operations, manual finance and basic audit screens.

### 10.2 Product analytics event layer

Add a privacy-minimized event contract rather than deriving every metric from mutable rows.

Recommended entity:

```text
ProductEvent
  id
  schemaVersion
  eventName
  occurredAt
  receivedAt
  actorUserId?       # nullable and access controlled
  orgId?
  sessionIdHash?
  targetType?
  targetId?
  source             # web, api, job
  properties         # allowlisted JSON only
```

Initial events:

- auth signup started/completed;
- email verified;
- workspace created;
- builder opened;
- template selected;
- signature saved;
- sender created/published/deactivated;
- export attempted/succeeded/failed with method;
- invite sent/accepted;
- invoice created/paid/void;
- content viewed only if analytics consent and policy allow it.

Do not place signature HTML, phone numbers, message content or unrestricted form data in analytics properties.

### 10.3 Historical rollups

Create daily rollups for stable dashboards:

- `OrgDailyMetric`;
- `PlatformDailyMetric`;
- `RevenueDailyMetric`;
- `GrowthDailyMetric`.

Rollups must be reproducible, versioned and backfillable. Dashboards should not execute expensive event scans on every request.

### 10.4 New workflow models

Potential new domain groups:

- `StaffGrant`, `StaffRole`, `Permission`;
- `ApprovalRequest`, `ApprovalDecision`;
- `SupportCase`, `SupportNote`, `SupportTask`;
- `ContentPage`, `ContentRevision`, `PublishJob`, `MediaAsset`, `Redirect`;
- `Lead`, `LeadActivity`, `MarketingAttribution`;
- `HealthCheck`, `Incident`, `IncidentEvent`;
- `JobRun`, `ErrorEvent`, `Deployment`;
- `FeatureFlag`, `FeatureFlagOverride`, `FeatureFlagAudit`;
- `DataRequest`, `RetentionJob`, `AuditExport`;
- `ReportDefinition`, `ReportRun`, `ReportSchedule`.

Do not add all tables at once. Add each group with the workspace phase that owns it.

### 10.5 External observability

Prefer purpose-built systems for high-volume operational telemetry:

- error monitoring;
- uptime checks;
- application performance;
- analytics/attribution;
- log aggregation.

The admin consumes summarized, permission-safe data or deep-links to the source. It should not rebuild an entire observability vendor inside the product database.

---

## 11. Cross-cutting interaction rules

- Filters use URL state so filtered views can be shared internally.
- Every KPI drills into a reconciled list or explanation.
- Tables support saved views, column selection and CSV export where privacy allows.
- Empty states distinguish `zero`, `not instrumented`, `permission denied` and `source delayed`.
- Every chart displays date window, comparison window and freshness.
- Sensitive values are masked until explicitly revealed.
- Production writes require reason, confirmation and recent authentication.
- Customer 360 always shows the billing root and current data context.
- No staff action is hidden behind an unlabeled icon-only control.
- Bulk changes show an impact preview before confirmation.
- No animation should delay operational interaction; motion is reserved for state transition and feedback.

---

## 12. Delivery worktree

### Phase 0 - Trust foundation

Build before broadening the UI:

- staff RBAC and server-side permission checks;
- fail-closed sensitive read logging;
- transactional admin action audit;
- reason and request metadata;
- step-up authentication;
- KPI dictionary and data ownership;
- production/staging shell distinction.

### Phase 1 - Real-data command center

Use only current authoritative data:

- `/admin/command/overview`;
- customer queues;
- organizations and Customer 360;
- invoices, payments and receivables;
- staff access and admin actions;
- global search;
- data-quality checks for seat and invoice invariants.

### Phase 2 - Product intelligence

- product event contract;
- event ingestion and privacy rules;
- daily rollups;
- activation funnel;
- builder, signature, sender and export analytics;
- product cohorts and customer health components.

### Phase 3 - Platform operations

- uptime/error integration;
- job, mail, export and upload diagnostics;
- incident workflow;
- deployment correlation;
- feature flags with audit and approvals.

### Phase 4 - Support operations

- cases, notes, owners, SLAs and tasks;
- onboarding rescue queue;
- playbooks;
- customer-linked support timeline;
- support reporting.

### Phase 5 - Growth and CMS

- lead capture and attribution;
- acquisition funnel;
- content models and revision workflow;
- navigation, FAQ, guides, legal and media management;
- approval, scheduling and rollback;
- SEO and redirect health.

### Phase 6 - Reports and executive layer

- saved report library;
- scheduled delivery;
- governed exports;
- executive read-only workspace;
- forecast scenarios with explicit assumptions;
- metric ownership and freshness monitoring.

---

## 13. What the first design should contain

Do not redesign all routes at once. The first high-fidelity implementation should include:

1. the Vuexy staff shell and nine-workspace navigation;
2. `/admin/command/overview` using only real or clearly unavailable data states;
3. global search;
4. attention queue;
5. business, product, system and security summary bands;
6. links into the current organization, invoice, access and action screens;
7. responsive desktop and tablet behavior;
8. loading, empty, error, delayed-source and permission-denied states.

This first screen validates the entire architecture. Once its metric contracts and navigation work, the specialist workspaces can be built without repeatedly redesigning the admin shell.

---

## 14. Acceptance criteria

The control plane is correctly designed when:

- a product owner can understand business, product, platform and risk health without opening the database;
- finance can answer who owes what and why;
- support can investigate a customer without impersonation;
- product can identify activation friction using defined events;
- growth can connect acquisition to activation once instrumentation exists;
- content staff can publish without editing source files and with rollback;
- platform staff can associate incidents with releases and affected workflows;
- security can answer who viewed or changed customer data;
- every KPI has a definition, source, window and freshness;
- unavailable data is visibly unavailable, never simulated;
- the UI remains recognizably Vuexy and operationally dense without becoming visually noisy.

