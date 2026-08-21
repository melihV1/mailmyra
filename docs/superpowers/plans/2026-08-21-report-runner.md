# Report Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute due `ReportSchedule` rows: build the report, email it (digest + optional CSV attachment), and fill the `ReportExecution`/`ReportDelivery` ledgers honestly.

**Architecture:** A standalone data layer (`apps/web/lib/reports/`) queries Prisma directly — it must NOT use `lib/repo/admin.ts` (every admin export is staff-gated by the enumeration test; the runner has no staff session). Orchestration (`run.ts`) receives `db`/`mailer`/`now`/`builders` by injection so tests pass fakes. The CLI script wraps everything in a `JobRun` ledger entry (extracted helper), and Plesk's scheduled task calls it every morning.

**Tech Stack:** TypeScript, Prisma (MariaDB), nodemailer via the existing `lib/mail` abstraction, vitest, tsx.

**Spec:** `docs/superpowers/specs/2026-08-21-report-runner-design.md` — read it first; it is the contract.

## Global Constraints

- Work in the MAIN worktree `/Users/mmacstudio/Desktop/mailmyra-work` on branch `main` (project convention; commit after every task).
- npm only — never pnpm/corepack. Commands: `npm test -w apps/web -- <filter>`, `npm run typecheck` from the repo root.
- Code comments in Turkish, identifiers/commits in English (house style — see any file under `apps/web/lib/`).
- **Content boundary (hard rule):** report output must never contain customer personal data — no member/sender emails, no person names, no signature content. Allowed: aggregates + org-level commercial data (org name, seat counts, invoice amounts). `security-evidence` carries Voldi staff emails only.
- **Email HTML rules apply to the digest** (it is email HTML): table-based layout, all CSS inline, no `<style>` block, web-safe fonts only, `border="0"` explicitly on every `<table>` (Outlook 2512 border bug).
- Reports never fabricate history: unsupported format/report → honest `failed` execution with a clear error; empty data → honest zeros.
- No new dependencies. No schema changes (no migration).
- Every task: write the failing test first, watch it fail, implement, watch it pass, commit.

---

### Task 1: Extract `withJobRun` into `lib/job-run.ts`

**Files:**
- Create: `apps/web/lib/job-run.ts`
- Modify: `apps/web/scripts/cleanup-orphans.ts` (delete its local `withJobRun`, lines 23–67)
- Test: `apps/web/test/job-run.test.ts`

**Interfaces:**
- Consumes: `prisma.jobRun` (existing model), dynamic `import('./db')`.
- Produces: `withJobRun(name: string, queue: string, fn: () => Promise<void>): Promise<void>` — Task 11's script calls `withJobRun('run-reports', 'scheduled', main)`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/test/job-run.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Koşu defteri sarmalının sözleşmesi: defter EN-İYİ-ÇABA'dır — yazılamazsa
 * iş YİNE koşar; iş başarısızsa defter 'failed' der ve hata YENİDEN fırlar.
 */

const jobCreate = vi.fn();
const jobUpdate = vi.fn();

vi.mock('../lib/db', () => ({
  prisma: {
    jobRun: {
      create: (...a: unknown[]) => jobCreate(...a),
      update: (...a: unknown[]) => jobUpdate(...a),
    },
  },
}));

const { withJobRun } = await import('../lib/job-run');

beforeEach(() => {
  jobCreate.mockReset().mockResolvedValue({ id: 'run1' });
  jobUpdate.mockReset().mockResolvedValue({});
});

describe('withJobRun', () => {
  it('records a complete run around a successful job', async () => {
    await withJobRun('run-reports', 'scheduled', async () => {});

    expect(jobCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'run-reports', queue: 'scheduled', state: 'running' }),
      }),
    );
    expect(jobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run1' },
        data: expect.objectContaining({ state: 'complete', error: null }),
      }),
    );
  });

  it('records failure and rethrows', async () => {
    await expect(
      withJobRun('run-reports', 'scheduled', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(jobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ state: 'failed', error: 'boom' }) }),
    );
  });

  it('still runs the job when the ledger is unreachable', async () => {
    jobCreate.mockRejectedValue(new Error('no db'));
    const fn = vi.fn().mockResolvedValue(undefined);

    await withJobRun('run-reports', 'scheduled', fn);

    expect(fn).toHaveBeenCalledOnce();
    expect(jobUpdate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL** (`Cannot find module '../lib/job-run'`)

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm test -w apps/web -- job-run
```

- [ ] **Step 3: Create `apps/web/lib/job-run.ts`**

Move the `withJobRun` implementation out of `scripts/cleanup-orphans.ts` verbatim, parameterizing `name`/`queue` and fixing the dynamic import path (`'../lib/db'` → `'./db'`):

```ts
/**
 * Koşu defteri (JobRun) sarmalı — panelin Jobs ekranının tek kaynağı.
 * EN-İYİ-ÇABA: defter yazılamıyorsa (DB'siz makine) iş YİNE koşar; iş
 * gözlemden önemlidir. `import('./db')` DİNAMİK: script'ler DATABASE_URL
 * olmayan makinede de yüklenebilsin (lib/mail/index.ts emsali).
 */
export async function withJobRun(
  name: string,
  queue: string,
  fn: () => Promise<void>,
): Promise<void> {
  const startedAt = new Date();
  let runId: string | null = null;
  try {
    const { prisma } = await import('./db');
    const run = await prisma.jobRun.create({
      data: { name, queue, state: 'running', startedAt },
      select: { id: true },
    });
    runId = run.id;
  } catch {
    /* defter yok — devam */
  }

  const finish = async (state: 'complete' | 'failed', error?: string) => {
    if (!runId) return;
    try {
      const { prisma } = await import('./db');
      await prisma.jobRun.update({
        where: { id: runId },
        data: {
          state,
          finishedAt: new Date(),
          durationMs: Date.now() - startedAt.getTime(),
          error: error?.slice(0, 300) ?? null,
        },
      });
    } catch {
      /* gözlem katmanı işi düşüremez */
    }
  };

  try {
    await fn();
    await finish('complete');
  } catch (e) {
    await finish('failed', e instanceof Error ? e.message : String(e));
    throw e;
  }
}
```

- [ ] **Step 4: Refactor `apps/web/scripts/cleanup-orphans.ts`**

Delete its local `withJobRun` (the whole block including its doc comment) and replace the tail call:

```ts
import { withJobRun } from '../lib/job-run';
// ... mevcut main() aynen kalır ...

withJobRun('cleanup-orphans', 'manual', main).catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 5: Run tests + typecheck — expect PASS**

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm test -w apps/web -- job-run && npm run typecheck -w apps/web
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/job-run.ts apps/web/scripts/cleanup-orphans.ts apps/web/test/job-run.test.ts
git commit -m "refactor(jobs): extract withJobRun ledger wrapper for reuse"
```

---

### Task 2: Mail attachments + `report` kind

**Files:**
- Modify: `apps/web/lib/mail/types.ts`
- Modify: `apps/web/lib/mail/smtp.ts:35-43` (the `build` helper)
- Modify: `apps/web/lib/mail/index.ts` (log mailer + type re-export)
- Test: `apps/web/test/mail-send.test.ts` (extend the existing file)

**Interfaces:**
- Produces: `MailAttachment { filename: string; content: string; contentType: string }`, `OutgoingMail.attachments?: MailAttachment[]`, `MailKind` union gains `'report'`. Task 10's `run.ts` sends `{ to, kind: 'report', subject, html, text, attachments }`.

- [ ] **Step 1: Extend `apps/web/test/mail-send.test.ts` with failing tests** (append inside the file; reuse its existing `config` and `mail` consts)

```ts
describe('attachments', () => {
  const csv = { filename: 'revenue-2026-08-21.csv', content: 'a,b\r\n1,2\r\n', contentType: 'text/csv' };

  it('passes attachments through the SMTP envelope', async () => {
    const mailer = createSmtpMailer(config, { jsonTransport: true });

    const sent = await mailer.sendForTest({ ...mail, kind: 'report', attachments: [csv] });
    const message = JSON.parse(sent.message);

    expect(message.attachments).toHaveLength(1);
    expect(message.attachments[0].filename).toBe('revenue-2026-08-21.csv');
    expect(message.attachments[0].contentType).toBe('text/csv');
  });

  it('keeps attachments visible to the memory mailer', async () => {
    const mailer = new MemoryMailer();
    await mailer.send({ ...mail, kind: 'report', attachments: [csv] });

    expect(mailer.sent[0].kind).toBe('report');
    expect(mailer.sent[0].attachments).toEqual([csv]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (type error: `'report'` not in MailKind / `attachments` unknown)

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm test -w apps/web -- mail-send
```

- [ ] **Step 3: Implement**

`apps/web/lib/mail/types.ts` — replace the `MailKind` line and `OutgoingMail`:

```ts
/** Teslim defterindeki sınıflandırma — içerik değil, tür etiketi. */
export type MailKind = 'verification' | 'invitation' | 'notification' | 'support' | 'report';

/** E-posta eki. `content` metindir (CSV gibi) — binary ek ihtiyacı yok (YAGNI). */
export interface MailAttachment {
  filename: string;
  content: string;
  contentType: string;
}

export interface OutgoingMail extends MailBody {
  to: string;
  /** Verilmezse defterde 'notification' sayılır. */
  kind?: MailKind;
  attachments?: MailAttachment[];
}
```

`apps/web/lib/mail/smtp.ts` — in `build`, after `html: mail.html,` add:

```ts
    // nodemailer'ın Attachment şekli bizimkiyle birebir — geçirilir.
    attachments: mail.attachments,
```

`apps/web/lib/mail/index.ts` — re-export the type (extend line 5) and show attachments in the log mailer:

```ts
export type { MailAttachment, MailBody, Mailer, OutgoingMail } from './types';
```

In `createLogMailer`'s `console.info` template, after the `Konu` line add:

```ts
          (mail.attachments?.length
            ? `  Ek   : ${mail.attachments.map((a) => a.filename).join(', ')}\n`
            : '') +
```

- [ ] **Step 4: Run — expect PASS** (same command), then `npm run typecheck -w apps/web`

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/mail/types.ts apps/web/lib/mail/smtp.ts apps/web/lib/mail/index.ts apps/web/test/mail-send.test.ts
git commit -m "feat(mail): text attachments and 'report' delivery kind"
```

---

### Task 3: Report types + window math

**Files:**
- Create: `apps/web/lib/reports/types.ts`
- Create: `apps/web/lib/reports/window.ts`
- Test: `apps/web/test/report-window.test.ts`

**Interfaces:**
- Produces (used by every later task):
  - `ReportsDb` (= `PrismaClient`), `ReportWindow { start: Date; end: Date }`
  - `ReportSection { heading: string; items: Array<{ label: string; value: string }> }`
  - `ReportTable { columns: string[]; rows: Array<Array<string | number>> }`
  - `ReportResult { reportId; title; window; sections; table? }`
  - `ReportBuilder = (db: ReportsDb, window: ReportWindow) => Promise<ReportResult>`
  - `countRows(report: ReportResult): number`
  - `reportWindow(cadence: string, end: Date): ReportWindow`
  - `windowLabel(window: ReportWindow): string` → `"2026-08-14 → 2026-08-21"`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/test/report-window.test.ts
import { describe, expect, it } from 'vitest';

import { countRows } from '../lib/reports/types';
import { reportWindow, windowLabel } from '../lib/reports/window';

const END = new Date(Date.UTC(2026, 7, 21, 7, 15)); // 2026-08-21 07:15Z

describe('reportWindow', () => {
  it('daily = last 24 hours', () => {
    const w = reportWindow('daily', END);
    expect(w.start.toISOString()).toBe('2026-08-20T07:15:00.000Z');
    expect(w.end.toISOString()).toBe(END.toISOString());
  });

  it('weekly = last 7 days', () => {
    expect(reportWindow('weekly', END).start.toISOString()).toBe('2026-08-14T07:15:00.000Z');
  });

  it('monthly = one UTC month back', () => {
    expect(reportWindow('monthly', END).start.toISOString()).toBe('2026-07-21T07:15:00.000Z');
  });

  it('unknown cadence behaves like monthly (nextPlannedRun ile aynı tavır)', () => {
    expect(reportWindow('yearly', END).start.toISOString()).toBe('2026-07-21T07:15:00.000Z');
  });

  it('does not mutate the given end date', () => {
    const end = new Date(END);
    reportWindow('daily', end);
    expect(end.toISOString()).toBe(END.toISOString());
  });

  it('month-end rollover is the known JS behavior', () => {
    // 31 Mar − 1 ay → JS "31 Şub"u 3 Mart'a taşırır. Bilinçli kabul (spec).
    const w = reportWindow('monthly', new Date(Date.UTC(2026, 2, 31)));
    expect(w.start.toISOString()).toBe('2026-03-03T00:00:00.000Z');
  });
});

describe('windowLabel', () => {
  it('renders UTC-day ISO range', () => {
    expect(windowLabel(reportWindow('weekly', END))).toBe('2026-08-14 → 2026-08-21');
  });
});

describe('countRows', () => {
  const base = {
    reportId: 'x',
    title: 'X',
    window: reportWindow('daily', END),
    sections: [{ heading: 'S', items: [{ label: 'a', value: '1' }, { label: 'b', value: '2' }] }],
  };

  it('prefers the table row count', () => {
    expect(countRows({ ...base, table: { columns: ['c'], rows: [['x'], ['y'], ['z']] } })).toBe(3);
  });

  it('falls back to total section items', () => {
    expect(countRows(base)).toBe(2);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`Cannot find module '../lib/reports/types'`)

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm test -w apps/web -- report-window
```

- [ ] **Step 3: Implement**

```ts
// apps/web/lib/reports/types.ts
import type { PrismaClient } from '@prisma/client';

/**
 * Rapor veri katmanı — admin.ts'i KULLANMAZ (tasarım 2026-08-21):
 * numaralandırma testi her admin export'undan personel kapısı bekler,
 * çalıştırıcının personel oturumu yok. Builder'lar Prisma'ya doğrudan sorar.
 *
 * İÇERİK SINIRI (sert kural): rapora müşteri kişisel verisi ASLA girmez —
 * üye/gönderici e-postası, kişi adı, imza içeriği yok. İzinli: agregalar +
 * org düzeyi ticari veri (org adı, koltuk, fatura tutarı — listLeads emsali).
 */
export type ReportsDb = PrismaClient;

export interface ReportWindow {
  start: Date;
  end: Date;
}

export interface ReportSectionItem {
  label: string;
  value: string;
}

export interface ReportSection {
  heading: string;
  items: ReportSectionItem[];
}

export interface ReportTable {
  columns: string[];
  rows: Array<Array<string | number>>;
}

export interface ReportResult {
  reportId: string;
  /** REPORT_LIBRARY'deki adla aynı (reporting-model.ts). */
  title: string;
  window: ReportWindow;
  sections: ReportSection[];
  /** CSV eki için; yoksa csv formatlı zamanlama dürüstçe 'failed' olur. */
  table?: ReportTable;
}

export type ReportBuilder = (db: ReportsDb, window: ReportWindow) => Promise<ReportResult>;

/** ReportExecution.rowCount: tablo varsa satır sayısı, yoksa özet kalemleri. */
export function countRows(report: ReportResult): number {
  return report.table
    ? report.table.rows.length
    : report.sections.reduce((n, s) => n + s.items.length, 0);
}
```

```ts
// apps/web/lib/reports/window.ts
import type { ReportWindow } from './types';

/**
 * Kadans penceresi: end = koşu anı. monthly JS `setUTCMonth` kullanır —
 * ay sonu taşması (31 Mar − 1 ay → 3 Mar) bilinen JS davranışı, personel
 * özeti için kabul (spec). Bilinmeyen kadans aylık sayılır — sessiz hata
 * yok, `nextPlannedRun` ile aynı tavır (lib/report-schedule.ts).
 */
export function reportWindow(cadence: string, end: Date): ReportWindow {
  const start = new Date(end);
  if (cadence === 'daily') start.setUTCDate(start.getUTCDate() - 1);
  else if (cadence === 'weekly') start.setUTCDate(start.getUTCDate() - 7);
  else start.setUTCMonth(start.getUTCMonth() - 1);
  return { start, end: new Date(end) };
}

/** Konu satırı ve digest başlığı için: `2026-08-14 → 2026-08-21` (UTC gün). */
export function windowLabel(window: ReportWindow): string {
  const day = (d: Date) => d.toISOString().slice(0, 10);
  return `${day(window.start)} → ${day(window.end)}`;
}
```

- [ ] **Step 4: Run — expect PASS** (same command)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/reports/types.ts apps/web/lib/reports/window.ts apps/web/test/report-window.test.ts
git commit -m "feat(reports): report result types and cadence window math"
```

---

### Task 4: Digest + CSV rendering

**Files:**
- Modify: `apps/web/lib/mail/templates/layout.ts` (export the palette)
- Create: `apps/web/lib/reports/render.ts`
- Test: `apps/web/test/report-render.test.ts`

**Interfaces:**
- Consumes: `escapeHtml`, new `EMAIL_PALETTE` from `../mail/templates/layout`; `MailBody` from `../mail/types`; `ReportResult`, `ReportTable` from `./types`; `windowLabel` from `./window`.
- Produces (used by Task 10 and builders):
  - `renderDigest(report: ReportResult): MailBody`
  - `renderCsv(table: ReportTable): string` (RFC-4180, CRLF)
  - `csvFilename(reportId: string, end: Date): string` → `"revenue-collections-2026-08-21.csv"`
  - `formatCents(cents: number, currency: string): string` → `"12.00 USD"`
  - `DIGEST_TABLE_MAX_ROWS = 30`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/test/report-render.test.ts
import { describe, expect, it } from 'vitest';

import {
  DIGEST_TABLE_MAX_ROWS,
  csvFilename,
  formatCents,
  renderCsv,
  renderDigest,
} from '../lib/reports/render';
import type { ReportResult } from '../lib/reports/types';

const END = new Date(Date.UTC(2026, 7, 21, 7, 15));

const report: ReportResult = {
  reportId: 'revenue-collections',
  title: 'Revenue & collections',
  window: { start: new Date(Date.UTC(2026, 7, 14, 7, 15)), end: END },
  sections: [
    {
      heading: 'Totals (USD)',
      items: [
        { label: 'Billed', value: '120.00 USD' },
        { label: 'Kaçış <testi>', value: 'a & b' },
      ],
    },
  ],
  table: { columns: ['Organization', 'Billed'], rows: [['Şişli Ajans', '120.00']] },
};

describe('renderDigest', () => {
  const digest = renderDigest(report);

  it('subject carries the report name and window label', () => {
    expect(digest.subject).toBe('[Mailmyra] Revenue & collections — 2026-08-14 → 2026-08-21');
  });

  it('is email HTML: table-based, no div, border="0" on every table', () => {
    expect(digest.html).not.toContain('<div');
    expect(digest.html).not.toContain('<style');
    const tables = digest.html.match(/<table/g) ?? [];
    const borders = digest.html.match(/<table border="0"/g) ?? [];
    expect(tables.length).toBeGreaterThan(0);
    expect(borders.length).toBe(tables.length);
  });

  it('escapes user-written values', () => {
    expect(digest.html).toContain('Kaçış &lt;testi&gt;');
    expect(digest.html).toContain('a &amp; b');
    expect(digest.html).toContain('Şişli Ajans');
  });

  it('has a real text fallback', () => {
    expect(digest.text).toContain('Revenue & collections — 2026-08-14 → 2026-08-21');
    expect(digest.text).toContain('Billed: 120.00 USD');
  });

  it('caps the inline table and says how much is hidden', () => {
    const rows = Array.from({ length: DIGEST_TABLE_MAX_ROWS + 5 }, (_, i) => [`org${i}`, '1.00']);
    const html = renderDigest({ ...report, table: { columns: ['O', 'B'], rows } }).html;
    expect(html).toContain(`org${DIGEST_TABLE_MAX_ROWS - 1}`);
    expect(html).not.toContain(`org${DIGEST_TABLE_MAX_ROWS}<`);
    expect(html).toContain('+5 more rows');
  });
});

describe('renderCsv', () => {
  it('quotes commas, quotes and newlines per RFC 4180', () => {
    const csv = renderCsv({
      columns: ['name', 'note'],
      rows: [
        ['Acme, Inc', 'said "hi"'],
        ['Plain', 'multi\nline'],
      ],
    });
    expect(csv).toBe('name,note\r\n"Acme, Inc","said ""hi"""\r\nPlain,"multi\nline"\r\n');
  });
});

describe('helpers', () => {
  it('csvFilename uses the UTC day', () => {
    expect(csvFilename('revenue-collections', END)).toBe('revenue-collections-2026-08-21.csv');
  });

  it('formatCents renders decimal + currency', () => {
    expect(formatCents(12345, 'USD')).toBe('123.45 USD');
    expect(formatCents(0, 'TRY')).toBe('0.00 TRY');
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`Cannot find module '../lib/reports/render'`)

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm test -w apps/web -- report-render
```

- [ ] **Step 3: Export the palette from `apps/web/lib/mail/templates/layout.ts`**

After the five `const` color/font lines (`FONT`…`PAPER`, lines 27–31) add:

```ts
/** Rapor digest'i gibi diğer e-posta üreticileri aynı evi kullansın diye. */
export const EMAIL_PALETTE = {
  font: FONT,
  ink: INK,
  muted: MUTED,
  line: LINE,
  paper: PAPER,
} as const;
```

- [ ] **Step 4: Create `apps/web/lib/reports/render.ts`**

```ts
import { EMAIL_PALETTE, escapeHtml } from '../mail/templates/layout';
import type { MailBody } from '../mail/types';
import type { ReportResult, ReportTable } from './types';
import { windowLabel } from './window';

/**
 * Rapor digest'i de e-posta HTML'idir: layout.ts'in kurallarının aynısı —
 * tablo tabanlı yerleşim, bütün CSS satır içi, `<style>` yok, web-safe font,
 * `border="0"` her tabloda (Outlook 2512 kenarlık bug'ı). Gmail clipping'e
 * karşı satır tavanı: digest tabloda en çok DIGEST_TABLE_MAX_ROWS satır
 * gösterilir, kalanına not düşülür; CSV eki daima tamdır.
 */
export const DIGEST_TABLE_MAX_ROWS = 30;

const { font: FONT, ink: INK, muted: MUTED, line: LINE, paper: PAPER } = EMAIL_PALETTE;

export function formatCents(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

function sectionHtml(report: ReportResult): string {
  return report.sections
    .map(
      (s) => `<tr><td style="padding:20px 32px 0 32px;font:700 15px/1.3 ${FONT};color:${INK};">${escapeHtml(s.heading)}</td></tr>
<tr><td style="padding:8px 32px 0 32px;">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border:none;">
${s.items
  .map(
    (i) => `<tr>
<td style="padding:4px 0;font:400 14px/1.5 ${FONT};color:${MUTED};">${escapeHtml(i.label)}</td>
<td align="right" style="padding:4px 0;font:700 14px/1.5 ${FONT};color:${INK};">${escapeHtml(i.value)}</td>
</tr>`,
  )
  .join('')}
</table>
</td></tr>`,
    )
    .join('');
}

function tableHtml(table: ReportTable): string {
  const shown = table.rows.slice(0, DIGEST_TABLE_MAX_ROWS);
  const hidden = table.rows.length - shown.length;

  const head = table.columns
    .map(
      (c) =>
        `<td style="padding:6px 8px;font:700 12px/1.4 ${FONT};color:${MUTED};border-bottom:1px solid ${LINE};">${escapeHtml(c)}</td>`,
    )
    .join('');
  const body = shown
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell) =>
              `<td style="padding:6px 8px;font:400 13px/1.4 ${FONT};color:${INK};border-bottom:1px solid ${LINE};">${escapeHtml(String(cell))}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('');
  const note =
    hidden > 0
      ? `<tr><td colspan="${table.columns.length}" style="padding:8px;font:400 12px/1.4 ${FONT};color:${MUTED};">+${hidden} more rows in the CSV attachment.</td></tr>`
      : '';

  return `<tr><td style="padding:20px 32px 0 32px;">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border:none;">
<tr>${head}</tr>${body}${note}
</table>
</td></tr>`;
}

export function renderDigest(report: ReportResult): MailBody {
  const label = windowLabel(report.window);
  const subject = `[Mailmyra] ${report.title} — ${label}`;

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(report.title)}</title>
</head><body style="margin:0;padding:0;background-color:${PAPER};">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="background-color:${PAPER};margin:0;padding:0;border:none;">
<tr><td align="center" style="padding:32px 16px;">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="600" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid ${LINE};">
<tr><td style="padding:28px 32px 0 32px;font:700 18px/1.2 ${FONT};color:${INK};letter-spacing:-0.01em;">Mailmyra</td></tr>
<tr><td style="padding:20px 32px 0 32px;font:700 24px/1.3 ${FONT};color:${INK};">${escapeHtml(report.title)}</td></tr>
<tr><td style="padding:4px 32px 0 32px;font:400 13px/1.6 ${FONT};color:${MUTED};">${escapeHtml(label)}</td></tr>
${sectionHtml(report)}
${report.table ? tableHtml(report.table) : ''}
<tr><td style="padding:24px 32px 28px 32px;font:400 13px/1.6 ${FONT};color:${MUTED};border-top:1px solid ${LINE};">Automated staff report. Generated by the Mailmyra report runner.</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const lines = [`${report.title} — ${label}`, ''];
  for (const s of report.sections) {
    lines.push(s.heading);
    for (const i of s.items) lines.push(`  ${i.label}: ${i.value}`);
    lines.push('');
  }
  if (report.table) lines.push(`Table: ${report.table.rows.length} rows (see the panel or the CSV attachment).`, '');

  return { subject, html, text: [...lines, '— Mailmyra'].join('\n') };
}

export function renderCsv(table: ReportTable): string {
  const cell = (v: string | number): string => {
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const line = (row: Array<string | number>) => row.map(cell).join(',');
  return [line(table.columns), ...table.rows.map(line)].join('\r\n') + '\r\n';
}

export function csvFilename(reportId: string, end: Date): string {
  return `${reportId}-${end.toISOString().slice(0, 10)}.csv`;
}
```

- [ ] **Step 5: Run — expect PASS**, then run the full mail template tests to catch layout regressions:

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm test -w apps/web -- report-render && npm test -w apps/web -- mail-
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/mail/templates/layout.ts apps/web/lib/reports/render.ts apps/web/test/report-render.test.ts
git commit -m "feat(reports): digest and CSV rendering in the email house style"
```

---

### Task 5: Builder — command-center

**Files:**
- Create: `apps/web/lib/reports/builders/command-center.ts`
- Test: `apps/web/test/report-builder-command-center.test.ts`

**Interfaces:**
- Consumes: `ReportBuilder`, `ReportsDb` (Task 3), `formatCents` (Task 4).
- Produces: `buildCommandCenter: ReportBuilder` returning `reportId: 'command-center'`, `title: 'Executive command center'`, sections only (NO `table` — this report is digest-only by design).

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/test/report-builder-command-center.test.ts
import { describe, expect, it } from 'vitest';

import { buildCommandCenter } from '../lib/reports/builders/command-center';
import type { ReportsDb } from '../lib/reports/types';

const WINDOW = {
  start: new Date(Date.UTC(2026, 7, 14, 7, 15)),
  end: new Date(Date.UTC(2026, 7, 21, 7, 15)),
};

/** Sahte db — her sorgu sabit döner, çağrı argümanları yakalanır. */
function fakeDb() {
  const calls: Record<string, unknown[]> = {};
  const capture = (name: string, value: unknown) => (args: unknown) => {
    (calls[name] ??= []).push(args);
    return Promise.resolve(value);
  };
  const db = {
    organization: {
      count: capture('organization.count', 10),
      aggregate: capture('organization.aggregate', { _sum: { entitledSeats: 42 } }),
    },
    senderIdentity: { count: capture('senderIdentity.count', 7) },
    invoice: {
      groupBy: capture('invoice.groupBy', [
        { currency: 'USD', _sum: { amountCents: 30000 }, _count: { _all: 3 } },
      ]),
    },
    jobRun: { count: capture('jobRun.count', 1) },
    errorGroup: { count: capture('errorGroup.count', 2) },
  };
  return { db: db as unknown as ReportsDb, calls };
}

describe('buildCommandCenter', () => {
  it('assembles aggregate sections without any table', async () => {
    const { db } = fakeDb();
    const report = await buildCommandCenter(db, WINDOW);

    expect(report.reportId).toBe('command-center');
    expect(report.title).toBe('Executive command center');
    expect(report.table).toBeUndefined();

    const all = report.sections.flatMap((s) => s.items);
    expect(all).toContainEqual({ label: 'Active seats', value: '7' });
    expect(all).toContainEqual({ label: 'Entitled seats', value: '42' });
    expect(all).toContainEqual({ label: 'Outstanding', value: '300.00 USD (3)' });
  });

  it('scopes window queries to the window', async () => {
    const { db, calls } = fakeDb();
    await buildCommandCenter(db, WINDOW);

    const newOrgCall = (calls['organization.count'] ?? []).find(
      (a) => (a as { where?: { createdAt?: unknown } })?.where?.createdAt,
    ) as { where: { createdAt: { gte: Date; lt: Date } } };
    expect(newOrgCall.where.createdAt.gte).toEqual(WINDOW.start);
    expect(newOrgCall.where.createdAt.lt).toEqual(WINDOW.end);
  });

  it('never queries personal-data fields', async () => {
    const { db, calls } = fakeDb();
    await buildCommandCenter(db, WINDOW);
    // Sayım/agrega dışında hiçbir findMany/select yok → kişisel veri yolu yok.
    expect(Object.keys(calls).every((k) => /\.(count|aggregate|groupBy)$/.test(k))).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm test -w apps/web -- report-builder-command-center
```

- [ ] **Step 3: Implement `apps/web/lib/reports/builders/command-center.ts`**

```ts
import { formatCents } from '../render';
import type { ReportBuilder } from '../types';

/**
 * Yönetici özeti — İÇERİK SINIRI: yalnız agregalar, org adı bile yok.
 * Formüller reporting-model.ts KPI tanımlarıyla hizalı: active-seats
 * (taslak/pasif hariç), billed-revenue (para birimleri asla tek toplamda
 * karışmaz — para birimi başına ayrı kalem).
 */
export const buildCommandCenter: ReportBuilder = async (db, window) => {
  const inWindow = { gte: window.start, lt: window.end };

  const [
    orgTotal,
    orgActive,
    orgTrial,
    orgNew,
    activeSeats,
    entitled,
    outstanding,
    overdue,
    publishedInWindow,
    failedJobs,
    newErrorGroups,
    openErrorGroups,
  ] = await Promise.all([
    db.organization.count(),
    db.organization.count({ where: { entitlementState: 'active' } }),
    db.organization.count({ where: { entitlementState: 'trial' } }),
    db.organization.count({ where: { createdAt: inWindow } }),
    db.senderIdentity.count({ where: { publishedAt: { not: null }, deactivatedAt: null } }),
    db.organization.aggregate({ _sum: { entitledSeats: true } }),
    db.invoice.groupBy({
      by: ['currency'],
      where: { status: 'due' },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    db.invoice.groupBy({
      by: ['currency'],
      where: { status: 'due', dueAt: { lt: window.end } },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    db.senderIdentity.count({ where: { publishedAt: inWindow } }),
    db.jobRun.count({ where: { state: 'failed', scheduledAt: inWindow } }),
    db.errorGroup.count({ where: { firstSeenAt: inWindow } }),
    db.errorGroup.count({ where: { state: 'open' } }),
  ]);

  type MoneyGroup = { currency: string; _sum: { amountCents: number | null }; _count: { _all: number } };
  const money = (groups: MoneyGroup[]): string =>
    groups.length
      ? groups
          .map((g) => `${formatCents(g._sum.amountCents ?? 0, g.currency)} (${g._count._all})`)
          .join(' · ')
      : '0';

  return {
    reportId: 'command-center',
    title: 'Executive command center',
    window,
    sections: [
      {
        heading: 'Customers',
        items: [
          { label: 'Total workspaces', value: String(orgTotal) },
          { label: 'Active', value: String(orgActive) },
          { label: 'On trial', value: String(orgTrial) },
          { label: 'New in window', value: String(orgNew) },
        ],
      },
      {
        heading: 'Seats',
        items: [
          { label: 'Active seats', value: String(activeSeats) },
          { label: 'Entitled seats', value: String(entitled._sum.entitledSeats ?? 0) },
        ],
      },
      {
        heading: 'Receivables',
        items: [
          { label: 'Outstanding', value: money(outstanding as MoneyGroup[]) },
          { label: 'Overdue', value: money(overdue as MoneyGroup[]) },
        ],
      },
      {
        heading: 'Product',
        items: [{ label: 'Senders published in window', value: String(publishedInWindow) }],
      },
      {
        heading: 'Open risks',
        items: [
          { label: 'Failed jobs in window', value: String(failedJobs) },
          { label: 'New error groups in window', value: String(newErrorGroups) },
          { label: 'Open error groups', value: String(openErrorGroups) },
        ],
      },
    ],
  };
};
```

- [ ] **Step 4: Run — expect PASS**, then commit

```bash
git add apps/web/lib/reports/builders/command-center.ts apps/web/test/report-builder-command-center.test.ts
git commit -m "feat(reports): command-center builder — aggregate-only executive digest"
```

---

### Task 6: Builder — revenue-collections

**Files:**
- Create: `apps/web/lib/reports/builders/revenue-collections.ts`
- Test: `apps/web/test/report-builder-revenue.test.ts`

**Interfaces:**
- Consumes: Task 3 types, `formatCents` (Task 4).
- Produces: `buildRevenueCollections: ReportBuilder` — `reportId: 'revenue-collections'`, `title: 'Revenue & collections'`, per-currency sections + per-org `table` with columns `['Organization', 'Currency', 'Billed', 'Collected', 'Outstanding', 'Overdue']` (money as `"12.00"` strings).

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/test/report-builder-revenue.test.ts
import { describe, expect, it } from 'vitest';

import { buildRevenueCollections } from '../lib/reports/builders/revenue-collections';
import type { ReportsDb } from '../lib/reports/types';

const WINDOW = {
  start: new Date(Date.UTC(2026, 7, 14, 7, 15)),
  end: new Date(Date.UTC(2026, 7, 21, 7, 15)),
};

const past = new Date(Date.UTC(2026, 7, 1));
const future = new Date(Date.UTC(2026, 8, 30));

function dbWith(invoices: unknown[], captured: { args?: unknown } = {}) {
  return {
    invoice: {
      findMany: (args: unknown) => {
        captured.args = args;
        return Promise.resolve(invoices);
      },
    },
  } as unknown as ReportsDb;
}

const rows = [
  { amountCents: 10000, currency: 'USD', status: 'paid', dueAt: past, org: { name: 'Acme' } },
  { amountCents: 5000, currency: 'USD', status: 'due', dueAt: past, org: { name: 'Acme' } },
  { amountCents: 2000, currency: 'USD', status: 'due', dueAt: future, org: { name: 'Beta' } },
  { amountCents: 999, currency: 'USD', status: 'void', dueAt: null, org: { name: 'Beta' } },
  { amountCents: 70000, currency: 'TRY', status: 'due', dueAt: past, org: { name: 'Acme' } },
];

describe('buildRevenueCollections', () => {
  it('splits totals per currency and never mixes them (KPI guardrail)', async () => {
    const report = await buildRevenueCollections(dbWith(rows), WINDOW);

    const usd = report.sections.find((s) => s.heading === 'Totals (USD)');
    expect(usd?.items).toContainEqual({ label: 'Billed', value: '170.00 USD' });
    expect(usd?.items).toContainEqual({ label: 'Collected', value: '100.00 USD' });
    expect(usd?.items).toContainEqual({ label: 'Outstanding', value: '70.00 USD' });
    expect(usd?.items).toContainEqual({ label: 'Overdue', value: '50.00 USD' });
    expect(usd?.items).toContainEqual({ label: 'Collection rate', value: '59%' });

    const tr = report.sections.find((s) => s.heading === 'Totals (TRY)');
    expect(tr?.items).toContainEqual({ label: 'Billed', value: '700.00 TRY' });
  });

  it('void invoices never enter the billed denominator', async () => {
    const report = await buildRevenueCollections(
      dbWith([{ amountCents: 999, currency: 'USD', status: 'void', dueAt: null, org: { name: 'X' } }]),
      WINDOW,
    );
    expect(report.sections[0].items).toContainEqual({ label: 'Invoices in window', value: '0' });
  });

  it('builds a per-org table sorted by billed desc', async () => {
    const report = await buildRevenueCollections(dbWith(rows), WINDOW);

    expect(report.table?.columns).toEqual([
      'Organization', 'Currency', 'Billed', 'Collected', 'Outstanding', 'Overdue',
    ]);
    expect(report.table?.rows[0]).toEqual(['Acme', 'TRY', '700.00', '0.00', '700.00', '700.00']);
    expect(report.table?.rows[1]).toEqual(['Acme', 'USD', '150.00', '100.00', '50.00', '50.00']);
  });

  it('windows on issuedAt and selects only commercial fields', async () => {
    const captured: { args?: unknown } = {};
    await buildRevenueCollections(dbWith([], captured), WINDOW);

    const args = captured.args as {
      where: { issuedAt: { gte: Date; lt: Date } };
      select: Record<string, unknown>;
    };
    expect(args.where.issuedAt).toEqual({ gte: WINDOW.start, lt: WINDOW.end });
    // İÇERİK SINIRI: org'dan yalnız ad; üye/kişi alanı yok.
    expect(args.select.org).toEqual({ select: { name: true } });
    expect(Object.keys(args.select).sort()).toEqual(['amountCents', 'currency', 'dueAt', 'org', 'status']);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm test -w apps/web -- report-builder-revenue
```

- [ ] **Step 3: Implement `apps/web/lib/reports/builders/revenue-collections.ts`**

```ts
import { formatCents } from '../render';
import type { ReportBuilder } from '../types';

/**
 * Gelir & tahsilat — pencere `issuedAt` üstünde. İÇERİK SINIRI: org adı +
 * tutarlar (Voldi'nin kendi ticari kaydı, listLeads emsali); üye/kişi verisi
 * SORGULANMAZ. KPI hizası: billed-revenue (void hariç, para birimi asla
 * karışmaz), collection-rate (paid/billed, payda void'siz).
 */
interface Bucket {
  billed: number;
  collected: number;
  outstanding: number;
  overdue: number;
}

export const buildRevenueCollections: ReportBuilder = async (db, window) => {
  const invoices = await db.invoice.findMany({
    where: { issuedAt: { gte: window.start, lt: window.end } },
    select: {
      amountCents: true,
      currency: true,
      status: true,
      dueAt: true,
      org: { select: { name: true } },
    },
  });

  const zero = (): Bucket => ({ billed: 0, collected: 0, outstanding: 0, overdue: 0 });
  const add = (b: Bucket, inv: (typeof invoices)[number]) => {
    if (inv.status === 'void') return;
    b.billed += inv.amountCents;
    if (inv.status === 'paid') b.collected += inv.amountCents;
    if (inv.status === 'due') {
      b.outstanding += inv.amountCents;
      if (inv.dueAt && inv.dueAt < window.end) b.overdue += inv.amountCents;
    }
  };

  const byCurrency = new Map<string, Bucket>();
  const byOrg = new Map<string, Bucket & { name: string; currency: string }>();
  for (const inv of invoices) {
    const c = byCurrency.get(inv.currency) ?? zero();
    add(c, inv);
    byCurrency.set(inv.currency, c);

    const key = `${inv.org.name} ${inv.currency}`;
    const o = byOrg.get(key) ?? { ...zero(), name: inv.org.name, currency: inv.currency };
    add(o, inv);
    byOrg.set(key, o);
  }

  const sections = [...byCurrency.entries()]
    .filter(([, b]) => b.billed > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, b]) => ({
      heading: `Totals (${currency})`,
      items: [
        { label: 'Billed', value: formatCents(b.billed, currency) },
        { label: 'Collected', value: formatCents(b.collected, currency) },
        { label: 'Outstanding', value: formatCents(b.outstanding, currency) },
        { label: 'Overdue', value: formatCents(b.overdue, currency) },
        {
          label: 'Collection rate',
          value: b.billed > 0 ? `${Math.round((b.collected / b.billed) * 100)}%` : '—',
        },
      ],
    }));

  const money = (cents: number) => (cents / 100).toFixed(2);
  const tableRows = [...byOrg.values()]
    .filter((b) => b.billed > 0)
    .sort((a, b) => b.billed - a.billed || a.name.localeCompare(b.name))
    .map((b) => [b.name, b.currency, money(b.billed), money(b.collected), money(b.outstanding), money(b.overdue)]);

  return {
    reportId: 'revenue-collections',
    title: 'Revenue & collections',
    window,
    sections: sections.length
      ? sections
      : [{ heading: 'Totals', items: [{ label: 'Invoices in window', value: '0' }] }],
    table: {
      columns: ['Organization', 'Currency', 'Billed', 'Collected', 'Outstanding', 'Overdue'],
      rows: tableRows,
    },
  };
};
```

- [ ] **Step 4: Run — expect PASS**, then commit

```bash
git add apps/web/lib/reports/builders/revenue-collections.ts apps/web/test/report-builder-revenue.test.ts
git commit -m "feat(reports): revenue-collections builder with per-currency totals"
```

---

### Task 7: Builder — product-activation

**Files:**
- Create: `apps/web/lib/reports/builders/product-activation.ts`
- Test: `apps/web/test/report-builder-activation.test.ts`

**Interfaces:**
- Consumes: Task 3 types.
- Produces: `buildProductActivation: ReportBuilder` — `reportId: 'product-activation'`, `title: 'Product activation'`, one cohort section + `table` `['Organization', 'Created', 'Signature', 'Published', 'Export']` with `yes`/`no` cells.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/test/report-builder-activation.test.ts
import { describe, expect, it } from 'vitest';

import { buildProductActivation } from '../lib/reports/builders/product-activation';
import type { ReportsDb } from '../lib/reports/types';

const WINDOW = {
  start: new Date(Date.UTC(2026, 7, 14, 7, 15)),
  end: new Date(Date.UTC(2026, 7, 21, 7, 15)),
};

function fakeDb(overrides: { orgs?: unknown[]; sig?: unknown[]; pub?: unknown[]; exp?: unknown[] } = {}) {
  const calls: Record<string, unknown[]> = {};
  const capture = (name: string, value: unknown) => (args: unknown) => {
    (calls[name] ??= []).push(args);
    return Promise.resolve(value);
  };
  const db = {
    organization: {
      findMany: capture(
        'organization.findMany',
        overrides.orgs ?? [
          { id: 'o1', name: 'Acme', createdAt: new Date(Date.UTC(2026, 7, 15)) },
          { id: 'o2', name: 'Beta', createdAt: new Date(Date.UTC(2026, 7, 16)) },
          { id: 'o3', name: 'Cadde', createdAt: new Date(Date.UTC(2026, 7, 17)) },
          { id: 'o4', name: 'Dost', createdAt: new Date(Date.UTC(2026, 7, 18)) },
        ],
      ),
    },
    signature: { findMany: capture('signature.findMany', overrides.sig ?? [{ orgId: 'o1' }, { orgId: 'o2' }]) },
    senderIdentity: { findMany: capture('senderIdentity.findMany', overrides.pub ?? [{ orgId: 'o1' }]) },
    activityEvent: { findMany: capture('activityEvent.findMany', overrides.exp ?? [{ orgId: 'o1' }]) },
  };
  return { db: db as unknown as ReportsDb, calls };
}

describe('buildProductActivation', () => {
  it('computes cohort funnel with fixed denominators (KPI: activation-rate, export-evidence)', async () => {
    const { db } = fakeDb();
    const report = await buildProductActivation(db, WINDOW);

    const items = report.sections[0].items;
    expect(items).toContainEqual({ label: 'Workspaces created', value: '4' });
    expect(items).toContainEqual({ label: 'With saved signature', value: '2' });
    expect(items).toContainEqual({ label: 'With published sender', value: '1' });
    expect(items).toContainEqual({ label: 'With export evidence', value: '1' });
    expect(items).toContainEqual({ label: 'Activation rate', value: '50%' }); // 2/4, payda kohort
    expect(items).toContainEqual({ label: 'Export evidence rate', value: '50%' }); // 1/2, payda aktive
  });

  it('renders per-org yes/no rows', async () => {
    const { db } = fakeDb();
    const report = await buildProductActivation(db, WINDOW);

    expect(report.table?.columns).toEqual(['Organization', 'Created', 'Signature', 'Published', 'Export']);
    expect(report.table?.rows[0]).toEqual(['Acme', '2026-08-15', 'yes', 'yes', 'yes']);
    expect(report.table?.rows[2]).toEqual(['Cadde', '2026-08-17', 'no', 'no', 'no']);
  });

  it('handles the empty cohort without dividing by zero', async () => {
    const { db } = fakeDb({ orgs: [], sig: [], pub: [], exp: [] });
    const report = await buildProductActivation(db, WINDOW);

    expect(report.sections[0].items).toContainEqual({ label: 'Activation rate', value: '—' });
    expect(report.table?.rows).toEqual([]);
  });

  it('content boundary: sender/signature/export queries select ONLY orgId', async () => {
    const { db, calls } = fakeDb();
    await buildProductActivation(db, WINDOW);

    for (const name of ['signature.findMany', 'senderIdentity.findMany', 'activityEvent.findMany']) {
      const args = calls[name]?.[0] as { select: Record<string, unknown> };
      expect(Object.keys(args.select)).toEqual(['orgId']);
    }
    const exportArgs = calls['activityEvent.findMany']?.[0] as { where: { type: unknown } };
    expect(exportArgs.where.type).toEqual({ startsWith: 'export.' });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm test -w apps/web -- report-builder-activation
```

- [ ] **Step 3: Implement `apps/web/lib/reports/builders/product-activation.ts`**

```ts
import type { ReportBuilder } from '../types';

/**
 * Aktivasyon hunisi — kohort: pencerede AÇILAN org'lar; payda SABİT kalır
 * (KPI: activation-rate). Export kanıtı ActivityEvent `export.*` tipleri
 * (KPI: export-evidence — Mailmyra dışı elle kurulum gözlemlenemez, payda
 * aktive olanlar). İÇERİK SINIRI: SenderIdentity'den YALNIZ orgId çekilir —
 * gönderici e-postası/adı bu rapora asla giremez.
 */
export const buildProductActivation: ReportBuilder = async (db, window) => {
  const cohort = await db.organization.findMany({
    where: { createdAt: { gte: window.start, lt: window.end } },
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  const ids = cohort.map((o) => o.id);

  const [withSignature, published, withExport] = ids.length
    ? await Promise.all([
        db.signature.findMany({
          where: { orgId: { in: ids } },
          select: { orgId: true },
          distinct: ['orgId'],
        }),
        db.senderIdentity.findMany({
          where: { orgId: { in: ids }, publishedAt: { not: null } },
          select: { orgId: true },
          distinct: ['orgId'],
        }),
        db.activityEvent.findMany({
          where: { orgId: { in: ids }, type: { startsWith: 'export.' } },
          select: { orgId: true },
          distinct: ['orgId'],
        }),
      ])
    : [[], [], []];

  const sigSet = new Set(withSignature.map((r) => r.orgId));
  const pubSet = new Set(published.map((r) => r.orgId));
  const expSet = new Set(withExport.map((r) => r.orgId));

  const pct = (num: number, den: number): string =>
    den > 0 ? `${Math.round((num / den) * 100)}%` : '—';
  const yn = (b: boolean) => (b ? 'yes' : 'no');

  return {
    reportId: 'product-activation',
    title: 'Product activation',
    window,
    sections: [
      {
        heading: 'Cohort (workspaces created in window)',
        items: [
          { label: 'Workspaces created', value: String(cohort.length) },
          { label: 'With saved signature', value: String(sigSet.size) },
          { label: 'With published sender', value: String(pubSet.size) },
          { label: 'With export evidence', value: String(expSet.size) },
          { label: 'Activation rate', value: pct(sigSet.size, cohort.length) },
          { label: 'Export evidence rate', value: pct(expSet.size, sigSet.size) },
        ],
      },
    ],
    table: {
      columns: ['Organization', 'Created', 'Signature', 'Published', 'Export'],
      rows: cohort.map((o) => [
        o.name,
        o.createdAt.toISOString().slice(0, 10),
        yn(sigSet.has(o.id)),
        yn(pubSet.has(o.id)),
        yn(expSet.has(o.id)),
      ]),
    },
  };
};
```

- [ ] **Step 4: Run — expect PASS**, then commit

```bash
git add apps/web/lib/reports/builders/product-activation.ts apps/web/test/report-builder-activation.test.ts
git commit -m "feat(reports): product-activation builder with fixed cohort denominators"
```

---

### Task 8: Builder — customer-health

**Files:**
- Create: `apps/web/lib/reports/builders/customer-health.ts`
- Test: `apps/web/test/report-builder-health.test.ts`

**Interfaces:**
- Consumes: Task 3 types.
- Produces: `buildCustomerHealth: ReportBuilder` — `reportId: 'customer-health'`, `title: 'Customer health'`, portfolio section + `table` `['Organization', 'State', 'Active seats', 'Entitled seats', 'Utilization', 'Inactive days', 'Overdue invoices']`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/test/report-builder-health.test.ts
import { describe, expect, it } from 'vitest';

import { buildCustomerHealth } from '../lib/reports/builders/customer-health';
import type { ReportsDb } from '../lib/reports/types';

const END = new Date(Date.UTC(2026, 7, 21, 7, 15));
const WINDOW = { start: new Date(Date.UTC(2026, 7, 14, 7, 15)), end: END };
const DAY = 24 * 60 * 60 * 1000;

function fakeDb() {
  const db = {
    organization: {
      findMany: () =>
        Promise.resolve([
          { id: 'o1', name: 'Acme', entitledSeats: 5, entitlementState: 'active' },
          { id: 'o2', name: 'Beta', entitledSeats: 0, entitlementState: 'trial' },
          { id: 'o3', name: 'Cadde', entitledSeats: 10, entitlementState: 'active' },
        ]),
    },
    senderIdentity: {
      groupBy: () => Promise.resolve([{ orgId: 'o1', _count: { _all: 4 } }]),
    },
    activityEvent: {
      groupBy: () =>
        Promise.resolve([
          { orgId: 'o1', _max: { createdAt: new Date(END.getTime() - 2 * DAY) } },
          { orgId: 'o3', _max: { createdAt: new Date(END.getTime() - 30 * DAY) } },
        ]),
    },
    invoice: {
      groupBy: () => Promise.resolve([{ orgId: 'o3', _count: { _all: 2 } }]),
    },
  };
  return db as unknown as ReportsDb;
}

describe('buildCustomerHealth', () => {
  it('renders one row per org with utilization and inactivity', async () => {
    const report = await buildCustomerHealth(fakeDb(), WINDOW);

    expect(report.table?.rows).toEqual([
      ['Acme', 'active', 4, 5, '80%', '2', 0],
      ['Beta', 'trial', 0, 0, '—', '—', 0], // payda 0 → '—' (KPI guardrail)
      ['Cadde', 'active', 0, 10, '0%', '30', 2],
    ]);
  });

  it('summarizes the portfolio honestly', async () => {
    const report = await buildCustomerHealth(fakeDb(), WINDOW);

    const items = report.sections[0].items;
    expect(items).toContainEqual({ label: 'Customers', value: '3' });
    expect(items).toContainEqual({ label: 'At ≥80% seat utilization', value: '1' });
    expect(items).toContainEqual({ label: 'With overdue invoices', value: '1' });
    // Beta hiç aktivite görmemiş, Cadde 30 gündür sessiz → 2.
    expect(items).toContainEqual({ label: 'Inactive ≥14 days (or never)', value: '2' });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm test -w apps/web -- report-builder-health
```

- [ ] **Step 3: Implement `apps/web/lib/reports/builders/customer-health.ts`**

```ts
import type { ReportBuilder } from '../types';

/**
 * Müşteri sağlığı — anlık portföy fotoğrafı; "inactive days" pencere sonuna
 * (koşu anına) göre. İÇERİK SINIRI: org adı + sayımlar; üye/gönderici kişi
 * verisi sorgulanmaz (groupBy yalnız orgId döndürür). KPI hizası:
 * seat-utilization (payda >0 şartı — 0 koltuk '—' gösterir).
 */
const DAY = 24 * 60 * 60 * 1000;
const INACTIVE_DAYS = 14;

export const buildCustomerHealth: ReportBuilder = async (db, window) => {
  const [orgs, seatGroups, lastActivity, overdueGroups] = await Promise.all([
    db.organization.findMany({
      select: { id: true, name: true, entitledSeats: true, entitlementState: true },
      orderBy: { name: 'asc' },
    }),
    db.senderIdentity.groupBy({
      by: ['orgId'],
      where: { publishedAt: { not: null }, deactivatedAt: null },
      _count: { _all: true },
    }),
    db.activityEvent.groupBy({ by: ['orgId'], _max: { createdAt: true } }),
    db.invoice.groupBy({
      by: ['orgId'],
      where: { status: 'due', dueAt: { lt: window.end } },
      _count: { _all: true },
    }),
  ]);

  const seatByOrg = new Map(seatGroups.map((g) => [g.orgId, g._count._all]));
  const lastByOrg = new Map(lastActivity.map((g) => [g.orgId, g._max.createdAt]));
  const overdueByOrg = new Map(overdueGroups.map((g) => [g.orgId, g._count._all]));

  const rows = orgs.map((o) => {
    const active = seatByOrg.get(o.id) ?? 0;
    const util = o.entitledSeats > 0 ? `${Math.round((active / o.entitledSeats) * 100)}%` : '—';
    const last = lastByOrg.get(o.id) ?? null;
    const inactive = last
      ? String(Math.max(0, Math.floor((window.end.getTime() - last.getTime()) / DAY)))
      : '—';
    return [o.name, o.entitlementState, active, o.entitledSeats, util, inactive, overdueByOrg.get(o.id) ?? 0];
  });

  const over80 = orgs.filter(
    (o) => o.entitledSeats > 0 && (seatByOrg.get(o.id) ?? 0) / o.entitledSeats >= 0.8,
  ).length;
  const inactive14 = orgs.filter((o) => {
    const last = lastByOrg.get(o.id);
    return !last || window.end.getTime() - last.getTime() >= INACTIVE_DAYS * DAY;
  }).length;

  return {
    reportId: 'customer-health',
    title: 'Customer health',
    window,
    sections: [
      {
        heading: 'Portfolio',
        items: [
          { label: 'Customers', value: String(orgs.length) },
          { label: 'At ≥80% seat utilization', value: String(over80) },
          { label: 'With overdue invoices', value: String(overdueGroups.length) },
          { label: `Inactive ≥${INACTIVE_DAYS} days (or never)`, value: String(inactive14) },
        ],
      },
    ],
    table: {
      columns: ['Organization', 'State', 'Active seats', 'Entitled seats', 'Utilization', 'Inactive days', 'Overdue invoices'],
      rows,
    },
  };
};
```

- [ ] **Step 4: Run — expect PASS**, then commit

```bash
git add apps/web/lib/reports/builders/customer-health.ts apps/web/test/report-builder-health.test.ts
git commit -m "feat(reports): customer-health builder — seat pressure and inactivity"
```

---

### Task 9: Builder — security-evidence

**Files:**
- Create: `apps/web/lib/reports/builders/security-evidence.ts`
- Test: `apps/web/test/report-builder-security.test.ts`

**Interfaces:**
- Consumes: Task 3 types.
- Produces: `buildSecurityEvidence: ReportBuilder` — `reportId: 'security-evidence'`, `title: 'Security evidence pack'`, totals section + `table` `['Staff', 'Sensitive reads', 'Privileged writes']`. Exports `BURST_READS = 5`, `BURST_WINDOW_MS = 15 * 60 * 1000`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/test/report-builder-security.test.ts
import { describe, expect, it } from 'vitest';

import {
  BURST_READS,
  BURST_WINDOW_MS,
  buildSecurityEvidence,
} from '../lib/reports/builders/security-evidence';
import type { ReportsDb } from '../lib/reports/types';

const WINDOW = {
  start: new Date(Date.UTC(2026, 7, 14, 7, 15)),
  end: new Date(Date.UTC(2026, 7, 21, 7, 15)),
};
const T0 = WINDOW.start.getTime();
const MIN = 60 * 1000;

function fakeDb(accessRows: Array<{ staffEmail: string; orgId: string; createdAt: Date }>) {
  const reads = new Map<string, number>();
  for (const r of accessRows) reads.set(r.staffEmail, (reads.get(r.staffEmail) ?? 0) + 1);
  return {
    staffAccess: {
      groupBy: () =>
        Promise.resolve([...reads.entries()].map(([staffEmail, n]) => ({ staffEmail, _count: { _all: n } }))),
      findMany: () => Promise.resolve(accessRows),
    },
    adminAction: {
      groupBy: () => Promise.resolve([{ staffEmail: 'huseyin@voldi.net', _count: { _all: 3 } }]),
    },
  } as unknown as ReportsDb;
}

/** i dakikada bir okuma — aynı personel + org. */
const burst = (n: number, stepMs: number) =>
  Array.from({ length: n }, (_, i) => ({
    staffEmail: 'huseyin@voldi.net',
    orgId: 'org1',
    createdAt: new Date(T0 + i * stepMs),
  }));

describe('buildSecurityEvidence', () => {
  it('counts a burst signal for ≥5 reads on one org within 15 minutes', async () => {
    const report = await buildSecurityEvidence(fakeDb(burst(BURST_READS, MIN)), WINDOW);
    expect(report.sections[0].items).toContainEqual({ label: 'Read-burst review signals', value: '1' });
  });

  it('spread-out reads produce no signal', async () => {
    const report = await buildSecurityEvidence(
      fakeDb(burst(BURST_READS, BURST_WINDOW_MS)), // her okuma 15 dk arayla
      WINDOW,
    );
    expect(report.sections[0].items).toContainEqual({ label: 'Read-burst review signals', value: '0' });
  });

  it('a pair counts once no matter how long the burst is', async () => {
    const report = await buildSecurityEvidence(fakeDb(burst(20, MIN)), WINDOW);
    expect(report.sections[0].items).toContainEqual({ label: 'Read-burst review signals', value: '1' });
  });

  it('tabulates reads and writes per staff member', async () => {
    const rows = [
      ...burst(2, MIN),
      { staffEmail: 'destek@voldi.net', orgId: 'org2', createdAt: new Date(T0) },
    ];
    const report = await buildSecurityEvidence(fakeDb(rows), WINDOW);

    expect(report.table?.columns).toEqual(['Staff', 'Sensitive reads', 'Privileged writes']);
    expect(report.table?.rows).toEqual([
      ['destek@voldi.net', 1, 0],
      ['huseyin@voldi.net', 2, 3],
    ]);
    const items = report.sections[0].items;
    expect(items).toContainEqual({ label: 'Sensitive reads', value: '3' });
    expect(items).toContainEqual({ label: 'Privileged writes', value: '3' });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm test -w apps/web -- report-builder-security
```

- [ ] **Step 3: Implement `apps/web/lib/reports/builders/security-evidence.ts`**

```ts
import type { ReportBuilder } from '../types';

/**
 * Güvenlik kanıt paketi — pencere içindeki StaffAccess/AdminAction sayımları.
 * İÇERİK SINIRI: yalnız Voldi personel e-postası + sayımlar; müşteri org
 * ADI bile gerekmez (orgId yalnız gruplama anahtarı, rapora yazılmaz).
 * KPI: sensitive-read-burst — aynı personel + aynı org, 15 dakikada ≥5
 * okuma. Sinyal = eşiği en az bir kez aşan (personel, org) çifti; "sinyal
 * kanıt değildir" guardrail'i digest metnine değil sayıya bağlıdır.
 */
export const BURST_READS = 5;
export const BURST_WINDOW_MS = 15 * 60 * 1000;

export const buildSecurityEvidence: ReportBuilder = async (db, window) => {
  const createdAt = { gte: window.start, lt: window.end };

  const [reads, writes, accessRows] = await Promise.all([
    db.staffAccess.groupBy({ by: ['staffEmail'], where: { createdAt }, _count: { _all: true } }),
    db.adminAction.groupBy({ by: ['staffEmail'], where: { createdAt }, _count: { _all: true } }),
    db.staffAccess.findMany({
      where: { createdAt },
      select: { staffEmail: true, orgId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const byPair = new Map<string, number[]>();
  for (const r of accessRows) {
    const key = `${r.staffEmail} ${r.orgId}`;
    const arr = byPair.get(key) ?? [];
    arr.push(r.createdAt.getTime());
    byPair.set(key, arr);
  }
  let burstSignals = 0;
  for (const times of byPair.values()) {
    for (let i = 0; i + BURST_READS - 1 < times.length; i++) {
      if (times[i + BURST_READS - 1] - times[i] <= BURST_WINDOW_MS) {
        burstSignals += 1;
        break;
      }
    }
  }

  const readByEmail = new Map(reads.map((g) => [g.staffEmail, g._count._all]));
  const writeByEmail = new Map(writes.map((g) => [g.staffEmail, g._count._all]));
  const emails = [...new Set([...readByEmail.keys(), ...writeByEmail.keys()])].sort();

  const totalReads = [...readByEmail.values()].reduce((n, c) => n + c, 0);
  const totalWrites = [...writeByEmail.values()].reduce((n, c) => n + c, 0);

  return {
    reportId: 'security-evidence',
    title: 'Security evidence pack',
    window,
    sections: [
      {
        heading: 'Window totals',
        items: [
          { label: 'Sensitive reads', value: String(totalReads) },
          { label: 'Privileged writes', value: String(totalWrites) },
          { label: 'Read-burst review signals', value: String(burstSignals) },
        ],
      },
    ],
    table: {
      columns: ['Staff', 'Sensitive reads', 'Privileged writes'],
      rows: emails.map((e) => [e, readByEmail.get(e) ?? 0, writeByEmail.get(e) ?? 0]),
    },
  };
};
```

- [ ] **Step 4: Run — expect PASS**, then commit

```bash
git add apps/web/lib/reports/builders/security-evidence.ts apps/web/test/report-builder-security.test.ts
git commit -m "feat(reports): security-evidence builder with read-burst signals"
```

---

### Task 10: Registry + orchestration (`run.ts`)

**Files:**
- Create: `apps/web/lib/reports/registry.ts`
- Create: `apps/web/lib/reports/run.ts`
- Test: `apps/web/test/report-run.test.ts`

**Interfaces:**
- Consumes: all five builders (Tasks 5–9), `renderDigest`/`renderCsv`/`csvFilename` (Task 4), `reportWindow` (Task 3), `countRows` (Task 3), `nextPlannedRun` from `../report-schedule` (existing), `Mailer` from `../mail/types` (Task 2 shape).
- Produces (used by Task 11):
  - `REPORT_BUILDERS: Record<string, ReportBuilder>` (registry — `support-operations` deliberately absent)
  - `runDueReports(deps: RunDeps): Promise<RunSummary>` where `RunDeps = { db: ReportsDb; mailer: Mailer; now: Date; dryRun?: boolean; builders?: Record<string, ReportBuilder> }` and `RunSummary = { processed: number; succeeded: number; failed: number }`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/test/report-run.test.ts
import { describe, expect, it } from 'vitest';

import { MemoryMailer } from '../lib/mail/memory';
import { runDueReports } from '../lib/reports/run';
import type { ReportBuilder, ReportsDb } from '../lib/reports/types';

const NOW = new Date(Date.UTC(2026, 7, 21, 7, 15));

const okBuilder: ReportBuilder = async (_db, window) => ({
  reportId: 'test-report',
  title: 'Test report',
  window,
  sections: [{ heading: 'S', items: [{ label: 'A', value: '1' }] }],
  table: { columns: ['C'], rows: [['x'], ['y']] },
});

const tablelessBuilder: ReportBuilder = async (_db, window) => ({
  reportId: 'test-report',
  title: 'Test report',
  window,
  sections: [{ heading: 'S', items: [{ label: 'A', value: '1' }] }],
});

interface Schedule {
  id: string;
  reportId: string;
  cadence: string;
  format: string;
  recipients: Array<{ email: string }>;
}

/** Rapor defterlerini kaydeden sahte db. */
function fakeDb(schedules: Schedule[]) {
  let seq = 0;
  const executions: Array<Record<string, unknown> & { id: string }> = [];
  const deliveries: Array<Record<string, unknown>> = [];
  const scheduleUpdates: Array<{ where: { id: string }; data: { nextRunAt: Date } }> = [];
  let findManyArgs: unknown;

  const db = {
    reportSchedule: {
      findMany: (args: unknown) => {
        findManyArgs = args;
        return Promise.resolve(schedules);
      },
      update: (args: { where: { id: string }; data: { nextRunAt: Date } }) => {
        scheduleUpdates.push(args);
        return Promise.resolve({});
      },
    },
    reportExecution: {
      create: (args: { data: Record<string, unknown> }) => {
        const row = { id: `e${++seq}`, ...args.data };
        executions.push(row);
        return Promise.resolve({ id: row.id });
      },
      update: (args: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = executions.find((e) => e.id === args.where.id);
        if (row) Object.assign(row, args.data);
        return Promise.resolve(row);
      },
    },
    reportDelivery: {
      create: (args: { data: Record<string, unknown> }) => {
        deliveries.push(args.data);
        return Promise.resolve(args.data);
      },
    },
  };
  return {
    db: db as unknown as ReportsDb,
    executions,
    deliveries,
    scheduleUpdates,
    getFindManyArgs: () => findManyArgs,
  };
}

const schedule = (over: Partial<Schedule> = {}): Schedule => ({
  id: 's1',
  reportId: 'test-report',
  cadence: 'weekly',
  format: 'digest',
  recipients: [{ email: 'mail@voldi.net' }],
  ...over,
});

const BUILDERS = { 'test-report': okBuilder };

describe('runDueReports', () => {
  it('selects only active schedules that are due or never planned', async () => {
    const f = fakeDb([]);
    await runDueReports({ db: f.db, mailer: new MemoryMailer(), now: NOW, builders: BUILDERS });

    expect(f.getFindManyArgs()).toMatchObject({
      where: { status: 'active', OR: [{ nextRunAt: null }, { nextRunAt: { lte: NOW } }] },
    });
  });

  it('runs a digest schedule end to end', async () => {
    const f = fakeDb([schedule()]);
    const mailer = new MemoryMailer();

    const summary = await runDueReports({ db: f.db, mailer, now: NOW, builders: BUILDERS });

    expect(summary).toEqual({ processed: 1, succeeded: 1, failed: 0 });
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].to).toBe('mail@voldi.net');
    expect(mailer.sent[0].kind).toBe('report');
    expect(mailer.sent[0].subject).toContain('Test report');
    expect(mailer.sent[0].attachments).toBeUndefined();

    expect(f.executions[0]).toMatchObject({ status: 'success', rowCount: 2, error: null });
    expect(f.deliveries).toEqual([
      { executionId: 'e1', recipientEmail: 'mail@voldi.net', status: 'sent', detail: null },
    ]);
    // nextRunAt her denemede ilerler — haftalık: bir sonraki Pazartesi 07:00 UTC.
    expect(f.scheduleUpdates).toHaveLength(1);
    expect(f.scheduleUpdates[0].data.nextRunAt.getTime()).toBeGreaterThan(NOW.getTime());
  });

  it('attaches the CSV for csv-format schedules', async () => {
    const f = fakeDb([schedule({ format: 'csv' })]);
    const mailer = new MemoryMailer();

    await runDueReports({ db: f.db, mailer, now: NOW, builders: BUILDERS });

    const att = mailer.sent[0].attachments;
    expect(att).toHaveLength(1);
    expect(att?.[0].filename).toBe('test-report-2026-08-21.csv');
    expect(att?.[0].contentType).toBe('text/csv');
    expect(att?.[0].content).toBe('C\r\nx\r\ny\r\n');
  });

  it('fails honestly: pdf format', async () => {
    const f = fakeDb([schedule({ format: 'pdf' })]);
    const summary = await runDueReports({ db: f.db, mailer: new MemoryMailer(), now: NOW, builders: BUILDERS });

    expect(summary.failed).toBe(1);
    expect(f.executions[0]).toMatchObject({ status: 'failed', error: 'format not implemented: pdf' });
    expect(f.scheduleUpdates).toHaveLength(1); // yine ilerler — fırtına yok
  });

  it('fails honestly: unknown report id', async () => {
    const f = fakeDb([schedule({ reportId: 'support-operations' })]);
    await runDueReports({ db: f.db, mailer: new MemoryMailer(), now: NOW, builders: BUILDERS });

    expect(f.executions[0]).toMatchObject({ status: 'failed', error: 'unknown report: support-operations' });
  });

  it('fails honestly: csv without tabular output', async () => {
    const f = fakeDb([schedule({ format: 'csv' })]);
    await runDueReports({
      db: f.db,
      mailer: new MemoryMailer(),
      now: NOW,
      builders: { 'test-report': tablelessBuilder },
    });

    expect(f.executions[0]).toMatchObject({ status: 'failed', error: 'report has no tabular output' });
  });

  it('fails honestly: no recipients', async () => {
    const f = fakeDb([schedule({ recipients: [] })]);
    await runDueReports({ db: f.db, mailer: new MemoryMailer(), now: NOW, builders: BUILDERS });

    expect(f.executions[0]).toMatchObject({ status: 'failed', error: 'schedule has no recipients' });
  });

  it('partial delivery failure marks the run failed but records every delivery', async () => {
    const f = fakeDb([
      schedule({ recipients: [{ email: 'iyi@voldi.net' }, { email: 'kotu@voldi.net' }] }),
    ]);
    const mailer = new MemoryMailer();
    const flaky = {
      kind: 'memory' as const,
      send: async (m: Parameters<MemoryMailer['send']>[0]) => {
        if (m.to === 'kotu@voldi.net') throw new Error('smtp down');
        return mailer.send(m);
      },
    };

    const summary = await runDueReports({ db: f.db, mailer: flaky, now: NOW, builders: BUILDERS });

    expect(summary.failed).toBe(1);
    expect(f.deliveries).toEqual([
      expect.objectContaining({ recipientEmail: 'iyi@voldi.net', status: 'sent' }),
      expect.objectContaining({ recipientEmail: 'kotu@voldi.net', status: 'failed', detail: 'smtp down' }),
    ]);
    expect(f.executions[0]).toMatchObject({ status: 'failed', error: '1 of 2 deliveries failed' });
  });

  it('isolates schedules: one failure does not stop the next', async () => {
    const f = fakeDb([schedule({ id: 's1', reportId: 'yok' }), schedule({ id: 's2' })]);
    const summary = await runDueReports({ db: f.db, mailer: new MemoryMailer(), now: NOW, builders: BUILDERS });

    expect(summary).toEqual({ processed: 2, succeeded: 1, failed: 1 });
    expect(f.executions.map((e) => e.status)).toEqual(['failed', 'success']);
    expect(f.scheduleUpdates.map((u) => u.where.id)).toEqual(['s1', 's2']);
  });

  it('dry-run builds but writes nothing and sends nothing', async () => {
    const f = fakeDb([schedule()]);
    const mailer = new MemoryMailer();

    const summary = await runDueReports({ db: f.db, mailer, now: NOW, dryRun: true, builders: BUILDERS });

    expect(summary).toEqual({ processed: 1, succeeded: 1, failed: 0 });
    expect(mailer.sent).toEqual([]);
    expect(f.executions).toEqual([]);
    expect(f.deliveries).toEqual([]);
    expect(f.scheduleUpdates).toEqual([]);
  });

  it('the default registry serves all five ready reports', async () => {
    const { REPORT_BUILDERS } = await import('../lib/reports/registry');
    expect(Object.keys(REPORT_BUILDERS).sort()).toEqual([
      'command-center',
      'customer-health',
      'product-activation',
      'revenue-collections',
      'security-evidence',
    ]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm test -w apps/web -- report-run
```

- [ ] **Step 3: Create `apps/web/lib/reports/registry.ts`**

```ts
import { buildCommandCenter } from './builders/command-center';
import { buildCustomerHealth } from './builders/customer-health';
import { buildProductActivation } from './builders/product-activation';
import { buildRevenueCollections } from './builders/revenue-collections';
import { buildSecurityEvidence } from './builders/security-evidence';
import type { ReportBuilder } from './types';

/**
 * Koşturulabilir raporlar — REPORT_LIBRARY'deki 5 'ready' rapor.
 * `support-operations` BİLİNÇLİ yok: kaynağı 'partial' (reporting-model.ts);
 * zamanlanırsa çalıştırıcı dürüstçe "unknown report" der.
 */
export const REPORT_BUILDERS: Record<string, ReportBuilder> = {
  'command-center': buildCommandCenter,
  'revenue-collections': buildRevenueCollections,
  'product-activation': buildProductActivation,
  'customer-health': buildCustomerHealth,
  'security-evidence': buildSecurityEvidence,
};
```

- [ ] **Step 4: Create `apps/web/lib/reports/run.ts`**

```ts
import type { Mailer } from '../mail/types';
import { nextPlannedRun } from '../report-schedule';
import { csvFilename, renderCsv, renderDigest } from './render';
import { REPORT_BUILDERS } from './registry';
import { countRows, type ReportBuilder, type ReportResult, type ReportsDb } from './types';
import { reportWindow } from './window';

/**
 * Rapor çalıştırıcısı — tasarım: docs/superpowers/specs/2026-08-21-report-runner-design.md
 *
 * Defter semantiği: builder başarılı VE TÜM teslimler 'sent' → 'success';
 * aksi hâlde 'failed' (kısmi teslim hatası da failed — panel rozeti güvenli
 * tarafta kalır). `nextRunAt` HER denemeden sonra ilerler: başarısız koşu
 * ertesi tike fırtına gibi yığılmaz, hata rozetle görünür. Desteklenmeyen
 * format/rapor sessizce atlanmaz — dürüst 'failed' satırı yazılır.
 *
 * Bağımlılıklar enjekte edilir (db/mailer/now/builders) — testler sahte
 * geçer, script gerçekleri bağlar.
 */
export interface RunDeps {
  db: ReportsDb;
  mailer: Mailer;
  now: Date;
  dryRun?: boolean;
  builders?: Record<string, ReportBuilder>;
}

export interface RunSummary {
  processed: number;
  succeeded: number;
  failed: number;
}

interface DueSchedule {
  id: string;
  reportId: string;
  cadence: string;
  format: string;
  recipients: Array<{ email: string }>;
}

const clip = (s: string) => s.slice(0, 500);
const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

async function buildReport(
  db: ReportsDb,
  builders: Record<string, ReportBuilder>,
  schedule: DueSchedule,
  now: Date,
): Promise<ReportResult> {
  if (schedule.format !== 'digest' && schedule.format !== 'csv') {
    throw new Error(`format not implemented: ${schedule.format}`);
  }
  const builder = builders[schedule.reportId];
  if (!builder) throw new Error(`unknown report: ${schedule.reportId}`);
  if (schedule.recipients.length === 0) throw new Error('schedule has no recipients');

  const report = await builder(db, reportWindow(schedule.cadence, now));
  if (schedule.format === 'csv' && !report.table) {
    throw new Error('report has no tabular output');
  }
  return report;
}

async function runOne(
  db: ReportsDb,
  mailer: Mailer,
  builders: Record<string, ReportBuilder>,
  schedule: DueSchedule,
  now: Date,
): Promise<boolean> {
  const execution = await db.reportExecution.create({
    data: { scheduleId: schedule.id, startedAt: now, status: 'running' },
    select: { id: true },
  });

  let status: 'success' | 'failed' = 'success';
  let error: string | null = null;
  let rowCount: number | null = null;

  try {
    const report = await buildReport(db, builders, schedule, now);
    rowCount = countRows(report);
    const digest = renderDigest(report);
    const attachments =
      schedule.format === 'csv' && report.table
        ? [
            {
              filename: csvFilename(schedule.reportId, now),
              content: renderCsv(report.table),
              contentType: 'text/csv',
            },
          ]
        : undefined;

    let failedDeliveries = 0;
    for (const { email } of schedule.recipients) {
      let deliveryStatus: 'sent' | 'failed' = 'sent';
      let detail: string | null = null;
      try {
        await mailer.send({ to: email, kind: 'report', ...digest, attachments });
      } catch (err) {
        deliveryStatus = 'failed';
        detail = clip(message(err));
        failedDeliveries += 1;
      }
      await db.reportDelivery.create({
        data: { executionId: execution.id, recipientEmail: email, status: deliveryStatus, detail },
      });
    }
    if (failedDeliveries > 0) {
      status = 'failed';
      error = clip(`${failedDeliveries} of ${schedule.recipients.length} deliveries failed`);
    }
  } catch (err) {
    status = 'failed';
    error = clip(message(err));
  }

  await db.reportExecution.update({
    where: { id: execution.id },
    data: { status, error, rowCount, finishedAt: now },
  });
  return status === 'success';
}

export async function runDueReports({
  db,
  mailer,
  now,
  dryRun = false,
  builders = REPORT_BUILDERS,
}: RunDeps): Promise<RunSummary> {
  const due = (await db.reportSchedule.findMany({
    where: { status: 'active', OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }] },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      reportId: true,
      cadence: true,
      format: true,
      recipients: { select: { email: true } },
    },
  })) as DueSchedule[];

  const summary: RunSummary = { processed: 0, succeeded: 0, failed: 0 };

  for (const schedule of due) {
    summary.processed += 1;
    let ok = false;
    try {
      if (dryRun) {
        const report = await buildReport(db, builders, schedule, now);
        const digest = renderDigest(report);
        console.info(
          `[dry-run] ${schedule.reportId} (${schedule.format}) → "${digest.subject}", ` +
            `${countRows(report)} rows, ${schedule.recipients.length} recipient(s)`,
        );
        ok = true;
      } else {
        ok = await runOne(db, mailer, builders, schedule, now);
        // Her denemeden sonra ilerlet — dry-run HARİÇ (o hiçbir şey yazmaz).
        await db.reportSchedule.update({
          where: { id: schedule.id },
          data: { nextRunAt: nextPlannedRun(schedule.cadence, now) },
        });
      }
    } catch (err) {
      // İzolasyon: bir zamanlamanın çökmesi diğerlerini durdurmaz.
      console.error(`[reports] schedule ${schedule.id} failed:`, message(err));
      if (!dryRun) {
        try {
          await db.reportSchedule.update({
            where: { id: schedule.id },
            data: { nextRunAt: nextPlannedRun(schedule.cadence, now) },
          });
        } catch {
          /* ilerletme de düştüyse ertesi koşu yine dener */
        }
      }
    }
    if (ok) summary.succeeded += 1;
    else summary.failed += 1;
  }

  return summary;
}
```

- [ ] **Step 5: Run — expect PASS** (all report-run tests), then typecheck:

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm test -w apps/web -- report-run && npm run typecheck -w apps/web
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/reports/registry.ts apps/web/lib/reports/run.ts apps/web/test/report-run.test.ts
git commit -m "feat(reports): due-schedule orchestration with honest execution ledgers"
```

---

### Task 11: CLI script, npm script, operations doc

**Files:**
- Create: `apps/web/scripts/run-reports.ts`
- Modify: `apps/web/package.json` (scripts block, after `"cleanup"`)
- Create: `docs/report-runner.md`

**Interfaces:**
- Consumes: `withJobRun` (Task 1), `getMailer` (existing), `runDueReports` (Task 10).
- Produces: `npm run reports [-- --dry-run]` — the command Plesk's scheduled task runs.

- [ ] **Step 1: Create `apps/web/scripts/run-reports.ts`**

```ts
import { withJobRun } from '../lib/job-run';
import { getMailer } from '../lib/mail';
import { runDueReports } from '../lib/reports/run';

/**
 * Zamanlanmış rapor koşusu — Plesk Scheduled Task her sabah çağırır
 * (kurulum: docs/report-runner.md). Elle de koşturulabilir:
 *   npm run reports -w apps/web            # gerçek koşu
 *   npm run reports -w apps/web -- --dry-run  # üretir, göndermez, defter yazmaz
 *
 * Zamanlama başarısızlığı JobRun'a 'failed' düşer (özet hatası fırlatılır)
 * ama teslim/koşu defterleri o noktaya kadar yazılmıştır — panel görür.
 */
async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const { prisma } = await import('../lib/db');

  const summary = await runDueReports({
    db: prisma,
    mailer: getMailer(),
    now: new Date(),
    dryRun,
  });

  console.log(
    `${dryRun ? '[dry-run] ' : ''}${summary.processed} schedule(s): ` +
      `${summary.succeeded} ok, ${summary.failed} failed`,
  );
  if (summary.failed > 0) throw new Error(`${summary.failed} schedule(s) failed`);
}

withJobRun('run-reports', 'scheduled', main).catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Add the npm script**

In `apps/web/package.json`, after the `"cleanup"` line add:

```json
    "reports": "tsx scripts/run-reports.ts",
```

- [ ] **Step 3: Create `docs/report-runner.md`**

```markdown
# Rapor çalıştırıcısı — işletme notu

Tasarım: `docs/superpowers/specs/2026-08-21-report-runner-design.md`

## Ne yapar

Vadesi gelen `ReportSchedule` satırlarını koşturur: raporu üretir, digest
(+ csv formatında CSV eki) olarak alıcılara e-postalar, `ReportExecution`/
`ReportDelivery` defterlerini yazar, `nextRunAt`'ı ilerletir. Tamamı
`run-reports` adlı `JobRun` kaydına sarılıdır.

## Çalıştırma

```bash
npm run reports -w apps/web              # gerçek koşu
npm run reports -w apps/web -- --dry-run # üretir; göndermez, defter yazmaz
```

`DATABASE_URL` ve `MAIL_*` ortam değişkenleri uygulamayla aynı yerden gelir.

## Plesk Scheduled Task (kurulum Hüseyin'de)

- Zaman: her gün **10:15 Europe/Istanbul**. Sebep: `nextPlannedRun`
  koşuları 07:00 **UTC**'ye (=10:00 İstanbul) planlar; daha erken bir görev
  (örn. 07:15 İstanbul = 04:15 UTC) o günün vadesini henüz gelmemiş bulur
  ve her rapor bir gün gecikir. 10:15'te koşan görev aynı sabah teslim eder.
- Komut: uygulama kökünde `npm run reports` (Plesk Node panelinden "Komut
  dosyası çalıştır" ile `reports`). ⚠️ Bilinen tuzak: "node PATH'te yok"
  hatası çıkarsa app kökünde `.npmrc` + `scripts-prepend-node-path=true`
  (deploy ritüelindeki notla aynı).

## Zamanlama açma (SQL — UI'da oluşturma bilinçli yok)

```sql
INSERT INTO ReportSchedule
  (id, reportId, cadence, timezone, format, status, ownerEmail, createdByEmail, createdAt)
VALUES
  ('sched-cmdcenter-weekly-1', 'command-center', 'weekly', 'Europe/Istanbul',
   'digest', 'active', 'mail@voldi.net', 'mail@voldi.net', NOW());

INSERT INTO ReportRecipient (id, scheduleId, email)
VALUES ('rcpt-cmdcenter-weekly-1', 'sched-cmdcenter-weekly-1', 'mail@voldi.net');
```

`nextRunAt` boş bırakılır — ilk koşuda çalışır ve kendini ilerletir.
Koşturulabilir raporlar: `command-center` (yalnız digest — tablosu yok) ·
`revenue-collections` · `product-activation` · `customer-health` ·
`security-evidence`. Format: `digest` | `csv` (`pdf` v1'de yok — dürüst
'failed' yazar).

## Gözlem

- **Jobs** ekranı: `run-reports` koşuları (JobRun)
- **Reports → Scheduled**: son koşu/teslim durumu; başarısız koşu
  "attention" rozeti verir
- **Platform → Mail**: `kind: 'report'` teslim defteri satırları
```

- [ ] **Step 4: Verify the script wires up (no DB needed — dry-run with no reachable DB exits via ledger best-effort + empty schedule fetch failing)**

The script needs a DB to list schedules, so local verification is compile + dry-run behavior against the dev DB if configured; otherwise verify with:

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm run typecheck -w apps/web && npm test -w apps/web
```

Expected: typecheck clean, full web suite green (565 existing + new report/job tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/scripts/run-reports.ts apps/web/package.json docs/report-runner.md
git commit -m "feat(reports): scheduled runner CLI, npm script and operations doc"
```

---

### Task 12: Final verification

**Files:** none new — whole-repo checks.

- [ ] **Step 1: Full test suite + typecheck from the repo root**

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm run typecheck && npm test
```

Expected: all three workspaces green (web: 565 + ~35 new, core: 51, renderer: 277), typecheck silent.

- [ ] **Step 2: Production build compiles**

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && npm run build -w apps/web
```

Expected: build succeeds (DATABASE_URL placeholder acceptable — build does not connect; established precedent).

- [ ] **Step 3: If anything failed, fix it before declaring done; then confirm `git status` is clean (all task commits made).**
