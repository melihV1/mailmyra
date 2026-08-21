# Mailmyra Superadmin Visual Redesign Brief

Date: 2026-08-19  
Status: Visual and interaction redesign directive  
Scope: Existing `/admin` routes only  
Depends on: `2026-08-19-superadmin-operations-panel-brief.md`

## 1. Why the current UI is rejected

The current implementation loads Vuexy CSS, but it does not use Vuexy as an application system. Most pages are composed from the same three primitives:

- a generic dark `card`;
- a basic `table table-hover`;
- a small status `badge`.

This makes the panel feel like an early CRUD dashboard rather than a staff operations control plane. The problem is not a missing shadow, accent color or illustration. The problem is that the available Vuexy application patterns were not mapped to Mailmyra's workflows.

The visual defects visible in the current build are:

1. Dark components sit on a light page background at narrow widths, so the theme feels partially applied.
2. The `Command center` heading has insufficient contrast against the page background.
3. Four KPI cards have almost identical composition and weight; they do not establish priority.
4. Empty queues consume large vertical areas instead of becoming compact operational states.
5. The customer detail page is a long stack of unrelated cards and tables. There is no customer-360 navigation model.
6. Invoices, access logs and action logs are plain tables with almost no filtering, grouping, context or drill-down affordance.
7. At the in-app browser width, cards stack into a long feed and the panel loses the density expected from an operations tool.

## 2. Preserve these product and safety decisions

This is a visual and interaction redesign, not a product rewrite.

- Preserve every current route, repository call, permission check and audit write.
- Preserve the visible `STAFF · PRODUCTION` context warning.
- Preserve no impersonation, no hard delete and no silent customer-content editing.
- Preserve read-only members, senders and signatures.
- Preserve writes only for entitlement correction, invoice issue, mark paid and void.
- Preserve manual billing and the authoritative invoice amount.
- Do not add Microsoft 365 or Google Workspace sync language or UI.
- Do not add fake revenue, trend or activity data.
- Do not copy Vuexy JavaScript or jQuery plugins. Recreate required interactions in React.
- Do not alter the email renderer or customer panel.

## 3. Selected Vuexy direction

Use the dark vertical-menu application shell as the base. The comprehensive admin information architecture will not scale inside the current four-item horizontal menu.

Reference root:

`/Users/mmacstudio/Desktop/demos.pixinvent.com/vuexy-html-admin-template/html/vertical-menu-template-dark/`

Use these references intentionally:

| Mailmyra surface | Primary Vuexy reference | What to borrow |
|---|---|---|
| Admin shell | `index.html` | Vertical navigation, compact top bar, content width, breadcrumbs |
| Command center | `dashboards-crm.html` | Mixed KPI compositions, metric hierarchy, dense operational grid |
| KPI variants | `cards-analytics.html` | Progress, mini trend, icon-stat and comparison card patterns |
| Customer list | `app-ecommerce-customer-all.html` | Filter toolbar, data table shell, row identity and actions |
| Customer 360 | `app-ecommerce-customer-details-overview.html` | Identity rail, summary region, tabbed detail navigation |
| Invoice list | `app-invoice-list.html` | Finance summary, status filters, invoice data table and actions |
| Invoice detail | `app-invoice-preview.html` | Readable invoice document and payment metadata hierarchy |
| Access/activity | `extended-ui-timeline-basic.html` | Human-readable event timeline for recent activity |
| Full logs | `tables-datatables-advanced.html` | Filter and table density only; implement with React, not DataTables |
| Confirmations | `ui-modals.html` | Modal sizing, destructive warning hierarchy, button placement |
| Staff roles later | `app-access-roles.html`, `app-access-permission.html` | Role and grant organization |

Do not combine every demo component on every page. Each page needs one dominant composition and no more than two supporting patterns.

## 4. Shell specification

### 4.1 Desktop

- Fixed dark vertical sidebar, 260 px expanded and Vuexy's compact rail behavior when collapsed.
- Top bar contains global search, environment, theme, alerts and staff menu.
- Navigation groups:
  - Overview: Command center
  - Customers: Organizations
  - Finance: Invoices
  - Compliance: Access log, Action log
  - System: future modules from the comprehensive brief
  - Exit: Customer panel
- `STAFF · PRODUCTION` remains visible, but convert it from a tall red alert into a 28-32 px environment rail integrated below the top bar.
- The environment rail must never disappear on customer pages.

### 4.2 Narrow browser and tablet

The in-app browser is a real supported surface, not an edge case.

- Sidebar becomes an off-canvas drawer.
- Top bar search becomes an icon that opens a full-width command search sheet.
- Page heading and primary action stay on one compact header row when possible.
- KPI region uses a two-column grid at approximately 640 px and one column below 420 px.
- Tables either expose an obvious horizontal scroll container or switch to a labeled record-list view. Do not silently clip columns.
- Tabs become horizontally scrollable; do not wrap tab labels into two rows.

### 4.3 Theme integrity

- Apply theme variables to the full page root, including `html`, `body`, shell, content and footer.
- No light gutters around dark content.
- Do not place low-contrast light headings on the light body background.
- Keep Vuexy Public Sans typography and spacing scale.
- Use Vuexy's standard radius. Do not create large rounded marketing cards.

## 5. `/admin` command center

The first viewport must answer:

1. How many active billable seats exist?
2. Which customers need action today?
3. What money is overdue?
4. Where is onboarding stuck?

### 5.1 Header

- Breadcrumb: `Staff / Command center`.
- Title: `Command center`.
- Supporting text: one sentence, maximum 90 characters.
- Right side: `Updated just now` and refresh action if the data layer supports revalidation.

### 5.2 KPI band

Use four visually different but related Vuexy analytics patterns:

- Active seats: large `active / entitled`, progress and list-price base.
- Customers: root organizations plus active/trial split.
- Trials ending: count plus next expiry date; warning tone only when non-zero.
- Overdue: authoritative total plus invoice count; danger tone only when non-zero.

Do not render fake sparklines. A trend appears only when historical data exists.

### 5.3 Action queue

Replace four large queue cards with one operational queue surface:

- left: segmented control `All / Trial / Entitlement / Billing / Activation`;
- center: compact rows with customer identity, reason, age/deadline and severity;
- right: direct customer link;
- empty categories appear as a single compact state, not an empty table card.

Sort by severity and deadline, not by category.

### 5.4 Customer table

- Full-width customer table below the queue.
- Search, state, expiring trial and over-entitlement filters.
- Columns: organization, state, seats, trial, members, children, last activity, created.
- Organization cell includes initials/avatar, name and root/agency context.
- Seat cell uses a micro progress treatment, not only `4/5` text.
- Entire row is not clickable; organization link and a clear overflow menu are.
- Sticky header when the table is long.

## 6. `/admin/orgs/[id]` customer 360

Do not keep the current seven-card vertical stack.

### 6.1 Context header

- Customer name, initials/avatar, entitlement state and root/child context.
- Secondary line: customer since, trial end and organization ID with copy action.
- Right actions: `Edit entitlement` and `New invoice` only.
- A customer-data context strip remains visible under the page header.

### 6.2 Customer navigation

Use client-side tabs or anchored sections with persistent tab navigation:

1. Overview
2. People & Senders
3. Signatures
4. Billing
5. Access
6. Activity

Do not create separate routes unless necessary. Preserve current server permission and audit behavior.

### 6.3 Overview

- Left identity rail inspired by `app-ecommerce-customer-details-overview.html`.
- Four summary tiles: seat usage, members, active senders and signatures.
- Plan/entitlement block with trial end, list-price version and seat progress.
- Activation uses a horizontal stepper on desktop and vertical timeline on narrow screens.
- Child organizations appear as a compact tree/list for agency roots.

### 6.4 People & Senders

- Members and senders are separate sub-tabs or one split view.
- Use avatar/initial identity cells.
- Add compact status filters for sender state.
- Keep the content read only.

### 6.5 Signatures

- List with template, sender, update date and logged preview action.
- Preview opens in a large side panel or modal with explicit `Sensitive view logged` text.
- Do not shrink the email signature into a tiny card.

### 6.6 Billing

- Customer finance summary, invoice history and create-invoice action.
- Use the invoice list pattern and readable status hierarchy.
- No delete action. Only paid and void workflows.

### 6.7 Access and Activity

- Recent records use a timeline, not raw JSON rows.
- Full history remains available as a filterable table.
- Before/after changes render as labeled field diffs. Do not print raw `JSON.stringify` blocks in the default view.

## 7. `/admin/invoices`

- Header summary: outstanding total, due invoice count, paid this period and void count.
- Filters: status, customer, issue date and due date.
- Table is based on `app-invoice-list.html`.
- Invoice number is the primary link; customer is secondary.
- Overdue age is visually distinct from the due date.
- Row actions use a menu with explicit confirmation.
- Empty state is compact and explains that invoices are issued from customer detail.
- Add an invoice preview/detail surface based on `app-invoice-preview.html`; do not force finance staff to infer an invoice from one table row.

## 8. `/admin/access` and `/admin/actions`

### Access log

- Top filters: organization, staff, scope, target type and date range.
- Show recent access as a compact timeline with person, customer, scope and time.
- Full log appears below as an advanced table.
- Target IDs are secondary metadata with copy action, not the dominant text.

### Action log

- Top filters: organization, staff, action and date range.
- Default change presentation is a field-level diff: label, before, after.
- Reason is visible without opening the row.
- Raw JSON is available only inside a disclosure/detail panel.

## 9. Component architecture

Create reusable admin-only React components rather than repeating class strings:

- `AdminPageHeader`
- `AdminMetricCard`
- `AdminQueue`
- `AdminDataTable`
- `AdminFilterBar`
- `AdminStatusBadge`
- `AdminEmptyState`
- `AdminTimeline`
- `CustomerContextHeader`
- `CustomerTabs`
- `FieldDiff`

These components may use Vuexy class names and tokens. They must not import Vuexy demo JavaScript.

## 10. Explicit anti-patterns

- Do not solve the redesign by changing only colors, shadows or border radius.
- Do not put every section in an identical card.
- Do not use a marketing-site hero, oversized heading or decorative illustration.
- Do not use charts with fabricated history.
- Do not retain the current long sequence of empty tables.
- Do not expose dangerous actions to make the panel feel more powerful.
- Do not add integration, deployment or synchronization states Mailmyra does not implement.
- Do not remove animations globally; use only short, functional transitions for drawer, tabs, modal and row expansion.

## 11. Implementation order

1. Fix full-page theme propagation and build the vertical admin shell.
2. Build shared admin components.
3. Redesign the command center.
4. Redesign customer 360 with tabs.
5. Redesign invoices.
6. Redesign access and action logs.
7. Verify permissions and audit writes did not change.
8. Run responsive visual QA and only then call the redesign complete.

Do not redesign all pages in one uncontrolled pass. Finish and visually approve the command center first, then customer 360, then the remaining pages.

## 12. Acceptance criteria

The redesign is not complete until all of these are true:

- Screenshots are captured at 1440x900, 1024x768 and approximately 640x900.
- The dark theme covers the full viewport with no light gutters.
- Page titles pass basic contrast and remain visible in both themes.
- Command center first viewport contains KPIs plus at least one operational queue surface.
- Zero-count queue states do not each occupy a large card.
- Customer detail is navigable without scrolling through every data domain.
- Invoices have meaningful summary and filters.
- Access and action logs have filters and readable event/change presentation.
- No table content is clipped without a visible scrolling or record-list treatment.
- No placeholder metrics, fake charts or fake customer data were added.
- No write scope, permission gate, audit behavior or product rule changed.
- Existing admin tests pass; add focused tests for new tab/filter behavior.
- Compare final screenshots side by side with the selected local Vuexy references.

## 13. Claude execution prompt

Use this brief as a hard implementation contract:

> Redesign the existing Mailmyra `/admin` interface according to `docs/superpowers/specs/2026-08-19-superadmin-visual-redesign-brief.md`. Do not reinterpret this as a color polish. First inspect the current admin routes, repository functions and the exact local Vuexy HTML files listed in the brief. Preserve all existing security, audit, data and route behavior. Implement only the command center and shared shell/components first. Use the dark vertical-menu Vuexy application structure, React interactions and real Mailmyra data. Do not add fake charts, unsupported sync features, destructive actions or generic repeated cards. Verify the result visually at 1440x900 and approximately 640x900, compare screenshots with the selected Vuexy references, and stop for visual approval before redesigning customer detail.

