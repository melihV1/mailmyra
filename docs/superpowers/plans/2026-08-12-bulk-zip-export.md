# Bulk Zip Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Export zip" on the Senders screen: server renders every live sender's assigned signatures with the pure renderer and returns one flat zip of `.htm` files.

**Architecture:** All business logic in `lib/repo/export.ts` (`collectExportBundle`), thin `POST /api/senders/export-zip` route zips with jszip. Client dialog derives its numbers from the already-rendered list via pure `exportPlan`. Single-source `.htm` wrapper shared with the existing single-file download.

**Tech Stack:** Next.js App Router · Prisma/MariaDB · `@mailmyra/renderer` (pure) · jszip (pure JS — no native modules, Mac→Windows deploy rule).

Spec: `docs/superpowers/specs/2026-08-12-bulk-zip-export-design.md`

## Global Constraints

- Package manager is **npm** (`npm i <pkg> -w apps/web`); never pnpm.
- API mutations use **POST only** (IIS eats other verbs).
- Panel copy is **English** (locked 2026-08-10). Code comments follow repo style: Turkish, explaining constraints.
- No native Node modules (build is cross-copied Mac→Windows).
- Unit tests: `apps/web` → `npx vitest run test/<file>` (cwd `apps/web`). DB tests: `npx vitest run --config vitest.db.config.ts test-db/<file>` (needs `brew services start mariadb@11.8`).
- Cap: **200** exportable senders per request (spec §4); zip name `mailmyra-imzalar-YYYY-MM-DD.zip`.
- Every commit message ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Shared `.htm` wrapper — `lib/export-htm.ts`

**Files:**
- Create: `apps/web/lib/export-htm.ts`
- Modify: `apps/web/components/ExportButtons.tsx:52`
- Test: `apps/web/test/export-htm.test.ts`

**Interfaces:**
- Produces: `wrapExportDoc(fragment: string): string` — the exact document string ExportButtons builds today; Tasks 4 uses it server-side.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/test/export-htm.test.ts
import { describe, expect, it } from 'vitest';

import { wrapExportDoc } from '../lib/export-htm';

describe('wrapExportDoc', () => {
  it('wraps the fragment in the exact document the single download always produced', () => {
    // Bayt bayt aynı kalmalı: tekli indirme ile zip aynı kaynaktan çıkar.
    expect(wrapExportDoc('<table>x</table>')).toBe(
      '<!doctype html><html><head><meta charset="utf-8"></head><body><table>x</table></body></html>',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (cwd `apps/web`): `npx vitest run test/export-htm.test.ts`
Expected: FAIL — `wrapExportDoc is not a function` / cannot resolve module.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/lib/export-htm.ts
/**
 * Tekli ".htm indir" ile toplu zip'in ORTAK sarmalayıcısı. İki üretim yolu
 * birbirinden sapamasın diye tek kaynak (spec §5). İçerik e-posta kuralı
 * taşımıyor — dosya tarayıcı/istemciye açılan basit bir kabuk.
 */
export function wrapExportDoc(fragment: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"></head><body>${fragment}</body></html>`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/export-htm.test.ts` → PASS.

- [ ] **Step 5: Point ExportButtons at the helper**

In `apps/web/components/ExportButtons.tsx`: add import and replace line 52.

```ts
import { wrapExportDoc } from '../lib/export-htm';
```

```ts
// ÖNCE (satır 52):
const doc = `<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
// SONRA:
const doc = wrapExportDoc(html);
```

- [ ] **Step 6: Full unit suite still green**

Run: `npx vitest run` → all pass (guardrails untouched).

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/export-htm.ts apps/web/test/export-htm.test.ts apps/web/components/ExportButtons.tsx
git commit -m "refactor(export): single source for the .htm document wrapper"
```

---

### Task 2: File naming — `lib/export-filename.ts`

**Files:**
- Create: `apps/web/lib/export-filename.ts`
- Test: `apps/web/test/export-filename.test.ts`

**Interfaces:**
- Produces:
  `slugify(value: string): string`
  `nameExportFiles(inputs: ReadonlyArray<{ senderName: string; senderEmail: string; signatureName: string; senderSignatureCount: number }>): string[]` — `.htm` names, deterministic, collision-suffixed. Task 4 calls it with entries in render order.

- [ ] **Step 1: Write the failing tests**

```ts
// apps/web/test/export-filename.test.ts
import { describe, expect, it } from 'vitest';

import { nameExportFiles, slugify } from '../lib/export-filename';

const one = (senderName: string, over: Partial<Parameters<typeof nameExportFiles>[0][number]> = {}) => ({
  senderName,
  senderEmail: 'kisi@voldi.net',
  signatureName: 'Default',
  senderSignatureCount: 1,
  ...over,
});

describe('slugify', () => {
  it('transliterates Turkish letters and lowercases', () => {
    // Zip açıcıların UTF-8 bayrağı sorunu (spec §6): ASCII'ye ineriz.
    expect(slugify('Şükrü Ilgın ÇÖĞÜŞ')).toBe('sukru-ilgin-cogus');
  });
  it('collapses whitespace and strips leftovers', () => {
    expect(slugify('  Ali   & Veli! ')).toBe('ali-veli');
  });
});

describe('nameExportFiles', () => {
  it('names a single-signature sender by the person alone', () => {
    expect(nameExportFiles([one('Ali Yılmaz')])).toEqual(['ali-yilmaz.htm']);
  });

  it('appends the signature name with a double dash when the sender has several', () => {
    expect(
      nameExportFiles([
        one('Ali Yılmaz', { signatureName: 'Satış İmzası', senderSignatureCount: 2 }),
        one('Ali Yılmaz', { signatureName: 'Destek', senderSignatureCount: 2 }),
      ]),
    ).toEqual(['ali-yilmaz--satis-imzasi.htm', 'ali-yilmaz--destek.htm']);
  });

  it('suffixes colliding names deterministically in list order', () => {
    expect(nameExportFiles([one('Ali Yılmaz'), one('Ali Yilmaz')])).toEqual([
      'ali-yilmaz.htm',
      'ali-yilmaz-2.htm',
    ]);
  });

  it('falls back to the email local part when the name slugs to nothing', () => {
    expect(nameExportFiles([one('🎉🎉', { senderEmail: 'parti@voldi.net' })])).toEqual([
      'parti.htm',
    ]);
  });

  it('falls back to "imza" when even the email gives nothing', () => {
    expect(nameExportFiles([one('🎉', { senderEmail: '🎉@voldi.net' })])).toEqual(['imza.htm']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/export-filename.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
// apps/web/lib/export-filename.ts
/**
 * Zip girdi adları (spec §6). ASCII'ye indirgenir: UTF-8 bayrağını yok
 * sayan zip açıcılar (özellikle eski Windows) Türkçe adları bozuyor;
 * dağıtılacak dosyada bu risk alınmaz.
 */

export interface ExportNameInput {
  senderName: string;
  senderEmail: string;
  signatureName: string;
  /** Göndericinin zip'e girecek imza sayısı — 1 ise imza adı eklenmez. */
  senderSignatureCount: number;
}

const TR: Record<string, string> = { ş: 's', ı: 'i', ğ: 'g', ü: 'u', ö: 'o', ç: 'c' };

export function slugify(value: string): string {
  return value
    .toLocaleLowerCase('tr')
    .replace(/[şığüöç]/g, (ch) => TR[ch] ?? ch)
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function nameExportFiles(inputs: ReadonlyArray<ExportNameInput>): string[] {
  const used = new Map<string, number>();
  return inputs.map((f) => {
    let base = slugify(f.senderName) || slugify(f.senderEmail.split('@')[0] ?? '') || 'imza';
    if (f.senderSignatureCount > 1) {
      const sig = slugify(f.signatureName);
      if (sig) base = `${base}--${sig}`;
    }
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    return n === 1 ? `${base}.htm` : `${base}-${n}.htm`;
  });
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/export-filename.test.ts` → PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/export-filename.ts apps/web/test/export-filename.test.ts
git commit -m "feat(export): deterministic ascii-safe zip entry names"
```

---

### Task 3: Dialog numbers — `lib/export-plan.ts`

**Files:**
- Create: `apps/web/lib/export-plan.ts`
- Test: `apps/web/test/export-plan.test.ts`

**Interfaces:**
- Consumes: row shape mirrors `SenderRowData` from `lib/repo/senders.ts` (`status: 'draft' | 'active' | 'inactive'`, `signatureNames: string[]`).
- Produces: `exportPlan(rows, selectedIds): { senderCount; fileCount; unassigned; unpublished }` — Task 7's dialog reads exactly these four numbers.

- [ ] **Step 1: Write the failing tests**

```ts
// apps/web/test/export-plan.test.ts
import { describe, expect, it } from 'vitest';

import { exportPlan } from '../lib/export-plan';

const row = (
  id: string,
  status: 'draft' | 'active' | 'inactive',
  signatureNames: string[] = [],
) => ({ id, status, signatureNames });

describe('exportPlan', () => {
  it('with no selection, scopes to live senders and counts their files', () => {
    const plan = exportPlan(
      [row('a', 'active', ['X']), row('b', 'active', ['X', 'Y']), row('c', 'draft', ['X'])],
      [],
    );
    // Taslak kapsama hiç girmez (kapı: export yalnız yayındakine).
    expect(plan).toEqual({ senderCount: 2, fileCount: 3, unassigned: 0, unpublished: 0 });
  });

  it('counts live-but-unassigned senders as skipped', () => {
    const plan = exportPlan([row('a', 'active', ['X']), row('b', 'active')], []);
    expect(plan).toEqual({ senderCount: 1, fileCount: 1, unassigned: 1, unpublished: 0 });
  });

  it('with a selection, scopes to it and reports non-live picks', () => {
    const plan = exportPlan(
      [row('a', 'active', ['X']), row('b', 'draft', ['X']), row('c', 'inactive', ['X'])],
      ['a', 'b', 'c'],
    );
    expect(plan).toEqual({ senderCount: 1, fileCount: 1, unassigned: 0, unpublished: 2 });
  });

  it('ignores unselected rows entirely when a selection exists', () => {
    const plan = exportPlan([row('a', 'active', ['X']), row('b', 'active', ['X'])], ['a']);
    expect(plan).toEqual({ senderCount: 1, fileCount: 1, unassigned: 0, unpublished: 0 });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/export-plan.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
// apps/web/lib/export-plan.ts
/**
 * "Zip dışa aktar" diyaloğunun rakamları — ekrandaki listeden türetilir,
 * ikinci bir "say" ucu yoktur (spec §3). Sunucu POST'ta kendi süzgecini
 * yeniden uygular; fark oluşmuşsa sunucununki geçer.
 */

export interface ExportPlanRow {
  id: string;
  status: 'draft' | 'active' | 'inactive';
  signatureNames: string[];
}

export interface ExportPlan {
  /** Dosya üretecek gönderici sayısı. */
  senderCount: number;
  fileCount: number;
  /** Kapsamda, yayında ama imzasız — sebep söylenerek atlanır. */
  unassigned: number;
  /** Yalnız seçili kapsamda anlamlı: seçilmiş ama yayında olmayan. */
  unpublished: number;
}

export function exportPlan(
  rows: readonly ExportPlanRow[],
  selectedIds: readonly string[],
): ExportPlan {
  const scope =
    selectedIds.length > 0
      ? rows.filter((r) => selectedIds.includes(r.id))
      : rows.filter((r) => r.status === 'active');
  const live = scope.filter((r) => r.status === 'active');
  const withSig = live.filter((r) => r.signatureNames.length > 0);
  return {
    senderCount: withSig.length,
    fileCount: withSig.reduce((n, r) => n + r.signatureNames.length, 0),
    unassigned: live.length - withSig.length,
    unpublished: scope.length - live.length,
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/export-plan.test.ts` → PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/export-plan.ts apps/web/test/export-plan.test.ts
git commit -m "feat(export): dialog numbers derived from the on-screen list"
```

---

### Task 4: Server bundle — `lib/repo/export.ts` (DB tests)

**Files:**
- Modify: `apps/web/lib/repo/senders.ts` (export three private helpers)
- Create: `apps/web/lib/repo/export.ts`
- Test: `apps/web/test-db/export-zip.test.ts`

**Interfaces:**
- Consumes: `wrapExportDoc` (Task 1), `nameExportFiles` (Task 2), `canExport`/`can` from `@mailmyra/core`, `renderSignature` from `@mailmyra/renderer`, `mergeWithEmpty` from `app/builder/reducer` (pure module, no 'use client' — server-import is safe).
- Produces:
  ```ts
  collectExportBundle(userId: string, senderIds?: string[], cap = 200, iconBaseUrl?: string):
    Promise<
      | { ok: true; files: Array<{ filename: string; html: string }>;
          skipped: { unassigned: number; unpublished: number } }
      | { ok: false; reason: 'forbidden' | 'not_found' | 'no_exportable' | 'too_many' }>
  ```
  Also re-exports from `senders.ts`: `roleFor`, `primaryOrgId`, `resolveBillingOrgId` become exported (signatures unchanged). Task 6 and 7 rely on these.

- [ ] **Step 1: Export the three helpers from senders.ts**

In `apps/web/lib/repo/senders.ts` add the `export` keyword to the existing declarations (bodies unchanged):

```ts
export async function resolveBillingOrgId(db: Db, orgId: string): Promise<string> { ... }
export async function roleFor(userId: string, orgId: string): Promise<Role | null> { ... }
export async function primaryOrgId(userId: string): Promise<string | null> { ... }
```

Run: `npm run typecheck` (repo root) → exit 0.

- [ ] **Step 2: Write the failing DB tests**

```ts
// apps/web/test-db/export-zip.test.ts
/**
 * Toplu zip'in veri ucu (spec §5). Zip'leme route'ta; burada sınanan şey
 * kapsam, kapı, izolasyon ve dosya listesi — zip açmadan.
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { mergeWithEmpty } from '../app/builder/reducer';
import { prisma } from '../lib/db';
import { MemoryMailer } from '../lib/mail';
import { collectExportBundle } from '../lib/repo/export';
import { publishSender } from '../lib/repo/senders';
import { truncateAll } from './helpers';

beforeEach(truncateAll);
afterAll(async () => {
  await truncateAll();
  await prisma.$disconnect();
});

const mail = new MemoryMailer();

async function orgWithOwner(entitledSeats = 10) {
  const user = await prisma.user.create({
    data: { email: `sahip${Date.now()}${Math.random()}@voldi.net`.replace(/\W/g, (c) => (c === '@' || c === '.' ? c : '')), passwordHash: 'x' },
  });
  const org = await prisma.organization.create({ data: { name: 'Voldi', entitledSeats } });
  await prisma.membership.create({ data: { userId: user.id, orgId: org.id, role: 'owner' } });
  return { userId: user.id, orgId: org.id };
}

let n = 0;
async function liveSender(orgId: string, displayName = `Kisi ${++n}`) {
  const s = await prisma.senderIdentity.create({
    data: { orgId, displayName, email: `kisi${n}@voldi.net` },
  });
  const r = await publishSender(s.id, mail);
  if (!r.allowed) throw new Error('kurgu: publish reddedildi');
  return s;
}

async function assign(orgId: string, senderIdentityId: string, name = 'Default') {
  return prisma.signature.create({
    data: {
      orgId,
      senderIdentityId,
      name,
      data: mergeWithEmpty({ identity: { fullName: 'Ali Yılmaz' } }) as object,
    },
  });
}

describe('what goes into the bundle', () => {
  test('a live sender with an assigned signature produces a rendered file', async () => {
    const { userId, orgId } = await orgWithOwner();
    const s = await liveSender(orgId, 'Ali Yılmaz');
    await assign(orgId, s.id);

    const r = await collectExportBundle(userId);

    if (!r.ok) throw new Error(r.reason);
    expect(r.files).toHaveLength(1);
    expect(r.files[0]?.filename).toBe('ali-yilmaz.htm');
    expect(r.files[0]?.html).toContain('<table');
    expect(r.files[0]?.html).toContain('Ali Yılmaz');
    expect(r.files[0]?.html).toContain('<!doctype html>');
  });

  test('drafts and deactivated senders are skipped and counted', async () => {
    const { userId, orgId } = await orgWithOwner();
    const live = await liveSender(orgId);
    await assign(orgId, live.id);
    const draft = await prisma.senderIdentity.create({
      data: { orgId, displayName: 'Taslak', email: 'taslak@voldi.net' },
    });
    await assign(orgId, draft.id);
    const gone = await liveSender(orgId);
    await assign(orgId, gone.id);
    await prisma.senderIdentity.update({ where: { id: gone.id }, data: { deactivatedAt: new Date() } });

    const r = await collectExportBundle(userId);

    if (!r.ok) throw new Error(r.reason);
    expect(r.files).toHaveLength(1);
    expect(r.skipped.unpublished).toBe(2);
  });

  test('a live sender without a signature is skipped as unassigned', async () => {
    const { userId, orgId } = await orgWithOwner();
    const a = await liveSender(orgId);
    await assign(orgId, a.id);
    await liveSender(orgId); // imzasız

    const r = await collectExportBundle(userId);

    if (!r.ok) throw new Error(r.reason);
    expect(r.files).toHaveLength(1);
    expect(r.skipped.unassigned).toBe(1);
  });

  test('several signatures on one sender become several files', async () => {
    const { userId, orgId } = await orgWithOwner();
    const s = await liveSender(orgId, 'Ali Yılmaz');
    await assign(orgId, s.id, 'Satış');
    await assign(orgId, s.id, 'Destek');

    const r = await collectExportBundle(userId);

    if (!r.ok) throw new Error(r.reason);
    expect(r.files.map((f) => f.filename).sort()).toEqual([
      'ali-yilmaz--destek.htm',
      'ali-yilmaz--satis.htm',
    ]);
  });
});

describe('scope and isolation', () => {
  test('a selection exports only the selected senders', async () => {
    const { userId, orgId } = await orgWithOwner();
    const a = await liveSender(orgId, 'Secilen');
    await assign(orgId, a.id);
    const b = await liveSender(orgId, 'Disarida');
    await assign(orgId, b.id);

    const r = await collectExportBundle(userId, [a.id]);

    if (!r.ok) throw new Error(r.reason);
    expect(r.files.map((f) => f.filename)).toEqual(['secilen.htm']);
  });

  test("a foreign or unknown id fails the whole request with not_found", async () => {
    const { userId, orgId } = await orgWithOwner();
    const mine = await liveSender(orgId);
    await assign(orgId, mine.id);
    const other = await orgWithOwner();
    const theirs = await liveSender(other.orgId);

    expect(await collectExportBundle(userId, [mine.id, theirs.id])).toEqual({
      ok: false,
      reason: 'not_found',
    });
  });

  test("another org's senders never leak into the default scope", async () => {
    const { userId, orgId } = await orgWithOwner();
    const mine = await liveSender(orgId, 'Bizim');
    await assign(orgId, mine.id);
    const other = await orgWithOwner();
    const theirs = await liveSender(other.orgId, 'Onlarin');
    await assign(other.orgId, theirs.id);

    const r = await collectExportBundle(userId);

    if (!r.ok) throw new Error(r.reason);
    expect(r.files.map((f) => f.filename)).toEqual(['bizim.htm']);
  });
});

describe('gates', () => {
  test('a viewer is refused, an editor passes — the matrix line', async () => {
    const { orgId } = await orgWithOwner();
    const s = await liveSender(orgId);
    await assign(orgId, s.id);
    const viewer = await prisma.user.create({ data: { email: 'v@voldi.net', passwordHash: 'x' } });
    await prisma.membership.create({ data: { userId: viewer.id, orgId, role: 'viewer' } });
    const editor = await prisma.user.create({ data: { email: 'e@voldi.net', passwordHash: 'x' } });
    await prisma.membership.create({ data: { userId: editor.id, orgId, role: 'editor' } });

    expect(await collectExportBundle(viewer.id)).toEqual({ ok: false, reason: 'forbidden' });
    expect((await collectExportBundle(editor.id)).ok).toBe(true);
  });

  test('a cancelled workspace exports nothing', async () => {
    const { userId, orgId } = await orgWithOwner();
    const s = await liveSender(orgId);
    await assign(orgId, s.id);
    await prisma.organization.update({
      where: { id: orgId },
      data: { entitlementState: 'cancelled' },
    });

    expect(await collectExportBundle(userId)).toEqual({ ok: false, reason: 'no_exportable' });
  });

  test('an org with nothing exportable is told so', async () => {
    const { userId, orgId } = await orgWithOwner();
    await prisma.senderIdentity.create({
      data: { orgId, displayName: 'Taslak', email: 'taslak@voldi.net' },
    });

    expect(await collectExportBundle(userId)).toEqual({ ok: false, reason: 'no_exportable' });
  });

  test('the cap refuses before rendering anything', async () => {
    const { userId, orgId } = await orgWithOwner();
    for (let i = 0; i < 3; i++) {
      const s = await liveSender(orgId);
      await assign(orgId, s.id);
    }

    expect(await collectExportBundle(userId, undefined, 2)).toEqual({
      ok: false,
      reason: 'too_many',
    });
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run --config vitest.db.config.ts test-db/export-zip.test.ts`
Expected: FAIL — cannot resolve `../lib/repo/export`.

- [ ] **Step 4: Implement `lib/repo/export.ts`**

```ts
// apps/web/lib/repo/export.ts
import { can, canExport } from '@mailmyra/core';
import { renderSignature } from '@mailmyra/renderer';

import { mergeWithEmpty } from '../../app/builder/reducer';
import { prisma } from '../db';
import { nameExportFiles, type ExportNameInput } from '../export-filename';
import { wrapExportDoc } from '../export-htm';
import { primaryOrgId, resolveBillingOrgId, roleFor } from './senders';

/**
 * Toplu zip'in veri ucu (spec §5). Süzgeç sırası: üyelik + izin → kapsam
 * (yabancı id → not_found, kısmi zip yok) → tavan → gönderici başına
 * `canExport` (taslak/pasif/entitlement core'da elenir) → saf renderer.
 * Render arızasında kısmi-sessiz başarı YOK: fırlatır, route 500 döner —
 * dağıtılan zipte bir kişinin sessizce eksik olması en pahalı hata.
 */

export type ExportBundleResult =
  | {
      ok: true;
      files: Array<{ filename: string; html: string }>;
      skipped: { unassigned: number; unpublished: number };
    }
  | { ok: false; reason: 'forbidden' | 'not_found' | 'no_exportable' | 'too_many' };

export async function collectExportBundle(
  userId: string,
  senderIds?: string[],
  cap = 200,
  iconBaseUrl?: string,
): Promise<ExportBundleResult> {
  const orgId = await primaryOrgId(userId);
  if (!orgId) return { ok: false, reason: 'forbidden' };
  const role = await roleFor(userId, orgId);
  if (!role || !can(role, 'signature:export')) return { ok: false, reason: 'forbidden' };

  const selected = senderIds && senderIds.length > 0 ? [...new Set(senderIds)] : null;
  const senders = await prisma.senderIdentity.findMany({
    where: selected ? { orgId, id: { in: selected } } : { orgId },
    orderBy: { createdAt: 'asc' },
  });
  if (selected && senders.length !== selected.length) {
    return { ok: false, reason: 'not_found' };
  }

  // Entitlement fatura org'undan okunur — ajans ağacında iptal, müşteriyi
  // de kapatır (core'daki kilitli yetenek tablosu).
  const billingOrgId = await resolveBillingOrgId(prisma, orgId);
  const billing = await prisma.organization.findUniqueOrThrow({ where: { id: billingOrgId } });
  const entitlement = { entitledSeats: billing.entitledSeats, state: billing.entitlementState };

  const exportable = senders.filter((s) => canExport({ entitlement, target: s }).allowed);
  const unpublished = senders.length - exportable.length;

  if (exportable.length > cap) return { ok: false, reason: 'too_many' };

  const signatures = await prisma.signature.findMany({
    where: { senderIdentityId: { in: exportable.map((s) => s.id) } },
    orderBy: { createdAt: 'asc' },
  });
  const bySender = new Map<string, typeof signatures>();
  for (const sig of signatures) {
    const key = sig.senderIdentityId!;
    bySender.set(key, [...(bySender.get(key) ?? []), sig]);
  }

  const names: ExportNameInput[] = [];
  const htmls: string[] = [];
  let unassigned = 0;
  for (const s of exportable) {
    const sigs = bySender.get(s.id) ?? [];
    if (sigs.length === 0) {
      unassigned += 1;
      continue;
    }
    for (const sig of sigs) {
      // Kayıt gevşek doğrulanır; render öncesi builder'la aynı savunma.
      const data = mergeWithEmpty(sig.data);
      const fragment = renderSignature(
        data,
        data.layout.templateId,
        iconBaseUrl ? { iconBaseUrl } : undefined,
      );
      names.push({
        senderName: s.displayName,
        senderEmail: s.email,
        signatureName: sig.name,
        senderSignatureCount: sigs.length,
      });
      htmls.push(wrapExportDoc(fragment));
    }
  }

  if (htmls.length === 0) return { ok: false, reason: 'no_exportable' };

  const filenames = nameExportFiles(names);
  return {
    ok: true,
    files: htmls.map((html, i) => ({ filename: filenames[i]!, html })),
    skipped: { unassigned, unpublished },
  };
}
```

Note for the test helper e-mail uniqueness: if the `orgWithOwner` email
generator above proves awkward, simplify it to a module counter
(`sahip${++ownerN}@voldi.net`) — the intent is only per-test uniqueness.

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run --config vitest.db.config.ts test-db/export-zip.test.ts` → PASS (11 tests).

- [ ] **Step 6: Whole DB suite + typecheck**

Run: `npm run test:db` (repo root) → all pass. `npm run typecheck` → exit 0.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/repo/export.ts apps/web/lib/repo/senders.ts apps/web/test-db/export-zip.test.ts
git commit -m "feat(export): server-side bundle collection behind the export gate"
```

---

### Task 5: Zip helper — jszip

**Files:**
- Modify: `apps/web/package.json` (dependency)
- Create: `apps/web/lib/zip.ts`
- Test: `apps/web/test/zip.test.ts`

**Interfaces:**
- Produces: `buildZip(files: ReadonlyArray<{ filename: string; content: string }>): Promise<Buffer>` — Task 6 streams this back as the response body.

- [ ] **Step 1: Install jszip**

Run (repo root): `npm i jszip@^3.10.1 -w apps/web`
jszip saf JS'tir ve kendi tip bildirimlerini taşır — native modül yasağına takılmaz, `@types` gerekmez.

- [ ] **Step 2: Write the failing test**

```ts
// apps/web/test/zip.test.ts
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { buildZip } from '../lib/zip';

describe('buildZip', () => {
  it('round-trips every file byte for byte', async () => {
    const buffer = await buildZip([
      { filename: 'ali-yilmaz.htm', content: '<!doctype html>A' },
      { filename: 'veli.htm', content: '<!doctype html>V' },
    ]);

    const zip = await JSZip.loadAsync(buffer);
    expect(Object.keys(zip.files).sort()).toEqual(['ali-yilmaz.htm', 'veli.htm']);
    expect(await zip.file('ali-yilmaz.htm')!.async('string')).toBe('<!doctype html>A');
    expect(await zip.file('veli.htm')!.async('string')).toBe('<!doctype html>V');
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run test/zip.test.ts` → FAIL (`../lib/zip` missing).

- [ ] **Step 4: Implement**

```ts
// apps/web/lib/zip.ts
import JSZip from 'jszip';

/** files → tek zip buffer'ı. Saf JS (jszip) — Mac→Windows hattında güvenli. */
export async function buildZip(
  files: ReadonlyArray<{ filename: string; content: string }>,
): Promise<Buffer> {
  const zip = new JSZip();
  for (const f of files) zip.file(f.filename, f.content);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run test/zip.test.ts` → PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json package-lock.json apps/web/lib/zip.ts apps/web/test/zip.test.ts
git commit -m "feat(export): zip assembly helper on jszip"
```

---

### Task 6: Route — `POST /api/senders/export-zip`

**Files:**
- Create: `apps/web/app/api/senders/export-zip/route.ts`

**Interfaces:**
- Consumes: `collectExportBundle` (Task 4), `buildZip` (Task 5), `currentSession`, `json`/`readJsonBody` from `app/api/auth/_shared`.
- Produces: the HTTP contract of spec §4 — Task 7's client POSTs here.

- [ ] **Step 1: Implement the route** (thin — behavior is proven at the repo layer; no dedicated route test, same pattern as publish)

```ts
// apps/web/app/api/senders/export-zip/route.ts
import { currentSession } from '../../../../lib/auth/current';
import { collectExportBundle } from '../../../../lib/repo/export';
import { buildZip } from '../../../../lib/zip';
import { json, readJsonBody } from '../../auth/_shared';

/** Spec §4. Salt-okunur; kilit yok. Statü eşlemesi bire bir spec tablosu. */
const STATUS: Record<string, number> = {
  forbidden: 403,
  not_found: 404,
  no_exportable: 409,
  too_many: 413,
};

export async function POST(req: Request): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const body = await readJsonBody(req);
  const raw = (body as { senderIds?: unknown }).senderIds;
  const senderIds = Array.isArray(raw)
    ? raw.filter((x): x is string => typeof x === 'string')
    : undefined;

  const bundle = await collectExportBundle(
    session.user.id,
    senderIds,
    200,
    process.env.CDN_PUBLIC_URL || undefined,
  );
  if (!bundle.ok) return json(STATUS[bundle.reason] ?? 400, { error: bundle.reason });

  const zip = await buildZip(
    bundle.files.map((f) => ({ filename: f.filename, content: f.html })),
  );
  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(zip), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="mailmyra-imzalar-${date}.zip"`,
    },
  });
}
```

Import derinliği: bu route publish route'undan (`[id]/publish`, beş seviye) bir seviye yukarıda — `lib` yolu **dört** seviyedir (`../../../../lib/...`), yukarıdaki blok doğrusunu gösterir. Şüphede typecheck hakem.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck` → exit 0 (yol derinliği dahil).

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/api/senders/export-zip/route.ts"
git commit -m "feat(api): POST /api/senders/export-zip streams the bundle"
```

---

### Task 7: UI — selection + dialog on the Senders screen

**Files:**
- Create: `apps/web/app/(app)/app/senders/SenderTable.tsx`
- Modify: `apps/web/app/(app)/app/senders/page.tsx` (rows move into SenderTable; page fetches role), `apps/web/app/(app)/app/senders/senders.module.css` (checkbox + toolbar styles), `docs/superpowers/specs/2026-08-12-bulk-zip-export-design.md` (one-line note: panel copy is English; spec §3 examples were illustrative Turkish)
- Test: none new — dialog numbers are `exportPlan` (Task 3); UI verified in the browser (Task 8)

**Interfaces:**
- Consumes: `SenderRowData` rows from `listSenders`, `exportPlan` (Task 3), `POST /api/senders/export-zip` (Task 6), `roleFor`/`primaryOrgId` (Task 4), `can` from `@mailmyra/core`.
- Produces: `SenderTable({ rows, showExport }: { rows: SenderRowData[]; showExport: boolean })` client component.

- [ ] **Step 1: Page fetches the role and delegates rows**

In `page.tsx`: add imports and compute `showExport`; replace the `senders.length === 0 ? ... : <ul>...</ul>` branch's list side with `<SenderTable rows={senders} showExport={showExport} />` (empty-state branch stays as is). The `BADGE` map and row JSX move to SenderTable unchanged.

```ts
import { can } from '@mailmyra/core';
import { primaryOrgId, roleFor } from '../../../../lib/repo/senders';
import { SenderTable } from './SenderTable';
```

```ts
const orgId = await primaryOrgId(session.user.id);
const role = orgId ? await roleFor(session.user.id, orgId) : null;
const showExport = Boolean(role && can(role, 'signature:export'));
```

- [ ] **Step 2: SenderTable component**

```tsx
// apps/web/app/(app)/app/senders/SenderTable.tsx
'use client';

import { useState } from 'react';

import type { SenderRowData } from '../../../../lib/repo/senders';
import { exportPlan } from '../../../../lib/export-plan';
import { SenderActions } from './SenderActions';
import styles from './senders.module.css';

const BADGE: Record<string, { label: string; cls: 'draft' | 'active' | 'inactive' }> = {
  draft: { label: 'Draft', cls: 'draft' },
  active: { label: 'Live', cls: 'active' },
  inactive: { label: 'Inactive', cls: 'inactive' },
};

/** Hata gövdesi → panel dilinde (İngilizce) açıklama. */
const ERRORS: Record<string, string> = {
  too_many: 'Up to 200 senders per export — contact us for larger runs.',
  not_found: 'The list changed under you — reload the page and try again.',
  no_exportable: 'No live senders with an assigned signature yet.',
  forbidden: 'You do not have permission to export.',
};

export function SenderTable({
  rows,
  showExport,
}: {
  rows: SenderRowData[];
  showExport: boolean;
}) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = exportPlan(rows, [...selected]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)));
  }

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/senders/export-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected.size > 0 ? { senderIds: [...selected] } : {}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(ERRORS[body.error ?? ''] ?? 'Export failed — try again.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mailmyra-imzalar-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setDialogOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const skips: string[] = [];
  if (plan.unassigned > 0)
    skips.push(
      `${plan.unassigned} sender${plan.unassigned === 1 ? ' has' : 's have'} no assigned signature`,
    );
  if (plan.unpublished > 0)
    skips.push(
      `${plan.unpublished} selected sender${plan.unpublished === 1 ? ' is' : 's are'} not live`,
    );

  return (
    <div>
      {showExport && (
        <div className={styles.exportBar}>
          <label className={styles.selectAll}>
            <input
              type="checkbox"
              checked={rows.length > 0 && selected.size === rows.length}
              onChange={toggleAll}
            />
            Select all
          </label>
          <button type="button" onClick={() => setDialogOpen(true)}>
            Export zip{selected.size > 0 ? ` (${selected.size} selected)` : ''}
          </button>
        </div>
      )}

      <ul className={styles.list}>
        {rows.map((s) => {
          const badge = BADGE[s.status]!;
          return (
            <li key={s.id} className={styles.row}>
              {showExport && (
                <input
                  type="checkbox"
                  aria-label={`Select ${s.displayName}`}
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                />
              )}
              {/* — mevcut satır içeriği page.tsx'ten AYNEN taşınır:
                  ad, e-posta, ünvan, rozet, atanmış imza adları, SenderActions — */}
            </li>
          );
        })}
      </ul>

      {dialogOpen && (
        <div role="dialog" aria-modal="true" className={styles.exportDialog}>
          <h2>Export zip</h2>
          {plan.fileCount > 0 ? (
            <>
              <p>
                <strong>
                  {plan.fileCount} signature file{plan.fileCount === 1 ? '' : 's'}
                </strong>{' '}
                will be generated ({plan.senderCount} sender
                {plan.senderCount === 1 ? '' : 's'}).
              </p>
              {skips.length > 0 && <p>Skipped: {skips.join(' · ')}.</p>}
            </>
          ) : (
            <p>
              No live senders with an assigned signature yet — assign a signature and publish
              first.
            </p>
          )}
          {error && <p className={styles.exportError}>{error}</p>}
          <div className={styles.exportDialogActions}>
            <button type="button" onClick={() => setDialogOpen(false)} disabled={busy}>
              Cancel
            </button>
            {plan.fileCount > 0 && (
              <button type="button" onClick={download} disabled={busy}>
                {busy ? 'Preparing…' : 'Download'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

Satır içeriği taşınırken page.tsx'teki mevcut JSX birebir kopyalanır
(rozet sınıfları `styles.badge`/`badge.cls`, imza adları, `SenderActions`)
— yeni stil uydurulmaz. `senders.module.css`'e yalnız üç sınıf eklenir:

```css
.exportBar { display: flex; justify-content: space-between; align-items: center; margin: 12px 0; }
.selectAll { display: flex; gap: 6px; align-items: center; font-size: 14px; }
.exportDialog { position: fixed; inset: 0; margin: auto; height: fit-content; max-width: 420px; background: #fff; border: 1px solid #d5d5d5; border-radius: 8px; padding: 20px 24px; box-shadow: 0 8px 32px rgba(0,0,0,.18); }
.exportDialogActions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
.exportError { color: #b3261e; font-size: 14px; }
```

(Mevcut publish onayı nasıl bir diyalog deseni kullanıyorsa —
`SenderActions.tsx`'e bak — oradaki desen bu sınıfların YERİNE geçer;
ekranda iki farklı diyalog görünümü olmasın.)

- [ ] **Step 3: Spec'e panel dili notu**

`docs/superpowers/specs/2026-08-12-bulk-zip-export-design.md` §3'ün sonuna:

```
Not: panel dili İngilizce (karar 2026-08-10) — §3'teki diyalog metinleri
anlatım içindir, üründeki kopya İngilizcedir ("Export zip", "N signature
files will be generated…", "Skipped: …").
```

- [ ] **Step 4: Typecheck + unit suite**

Run: `npm run typecheck` → 0 · `npx vitest run` (apps/web) → all pass.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(app)/app/senders/" docs/superpowers/specs/2026-08-12-bulk-zip-export-design.md
git commit -m "feat(panel): sender selection and zip export dialog"
```

---

### Task 8: Full verification + browser proof

**Files:** none new.

- [ ] **Step 1: Whole suite**

Run (repo root): `npm test` → all green · `npm run test:db` → all green · `npm run typecheck` → 0.

- [ ] **Step 2: Browser verification (dev server, Browser pane — never Bash)**

1. `preview_start {name:"web"}` → login with local dev account (`hesap-test@voldi.net / panel testi icin sifre`), go to `/app/senders`.
2. Create two senders, assign a signature to one (via signatures screen), publish both.
3. "Export zip" with no selection → dialog says 1 file (1 sender), skipped: 1 no signature → Download → zip arrives; open it: one `.htm`, content renders the signature (table-based, name visible).
4. Select only the unassigned sender → dialog shows zero-state copy.
5. Draft sender selected → counted as "not live".
6. Screenshot the dialog for Hüseyin.

- [ ] **Step 3: Commit any fixes, then ff-merge to main**

```bash
git -C /Users/mmacstudio/Desktop/mailmyra-work merge --ff-only claude/seat-alert-email-e6c7a6
```

(Önce main'in kirli dosyalarıyla kesişim kontrolü — bugünkü ritüel.)

---

## Self-review notu

- Spec §3–§7 kapsandı: UI (T7), API (T6), bundle+kapılar (T4), adlandırma (T2), sayılar (T3), ortak sarmalayıcı (T1), zip (T5), test planı (T2–T5 birim, T4 DB, T8 tarayıcı+canlı kabul deploy'da).
- Tip tutarlılığı: `ExportNameInput`/`nameExportFiles` (T2) ↔ T4 kullanımı; `ExportBundleResult` (T4) ↔ T6 statü eşlemesi; `SenderRowData` ↔ T3/T7.
- Bilinçli boşluk yok; T6'daki import-derinliği uyarısı bilinçli (typecheck yakalar).
