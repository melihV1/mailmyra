# Brand Settings (Merkezi Şablon) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/app/brand` screen where owner/admin set org-wide brand fields with per-field Locked/Default modes; locked values overlay every render output (builder, single export, zip); defaults seed new signatures.

**Architecture:** One `BrandSetting` row per org holding a single JSON document (`{ field: { value, mode } }`). Pure `applyBrand` runs at every render sink — the overlay IS the enforcement; disabled inputs are UX. Strict parse guard on the API boundary. Shared `ConfirmDialog` replaces ad-hoc dialogs (impact, zip export, publish).

**Tech Stack:** Next.js App Router · Prisma/MariaDB (FIRST schema change since Faz 2 — migration ritual returns) · `@mailmyra/renderer` (pure; exports `TEMPLATE_IDS`, `WebSafeFont`).

Spec: `docs/superpowers/specs/2026-08-12-brand-settings-design.md`

## Global Constraints

- Package manager **npm**; API mutations **POST only** (IIS); no native modules.
- Panel copy **English**; builder's existing copy stays **Turkish** (language migration is out of scope). Code comments Turkish, repo style.
- Permission key is the EXISTING `brand:manage` (packages/core/src/roles.ts — owner+admin). Do not add a permission.
- Anonymous `/builder` (no `?sig=`) behavior must not change at all.
- Stored `Signature.data` is NEVER rewritten by brand changes — overlay at render only.
- Unit tests: `apps/web` → `npx vitest run test/<file>`. DB tests: `npx vitest run --config vitest.db.config.ts test-db/<file>` (MariaDB local service). Typecheck: `npm run typecheck` repo root.
- Migration (local): `npx prisma migrate dev --name brand-setting` from `apps/web`.
- Every commit message ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Brand document type + parse guard — `lib/brand-doc.ts`

**Files:**
- Create: `apps/web/lib/brand-doc.ts`
- Modify: `apps/web/app/builder/steps/StyleStep.tsx:8` (FONTS list lifts to the shared module)
- Test: `apps/web/test/brand-doc.test.ts`

**Interfaces:**
- Produces (later tasks use verbatim):
  ```ts
  type BrandMode = 'locked' | 'default';
  interface BrandField<T> { value: T; mode: BrandMode }
  interface BrandDocument {
    templateId?: BrandField<string>;
    brandColor?: BrandField<string>;
    textColor?: BrandField<string>;
    mutedColor?: BrandField<string>;
    fontFamily?: BrandField<WebSafeFont>;
    logoUrl?: BrandField<string>;
    cta?: BrandField<{ label: string; url: string }>;
    disclaimer?: BrandField<string>;
  }
  WEB_SAFE_FONTS: readonly WebSafeFont[]
  parseBrandDocument(input: unknown): BrandDocument | null
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// apps/web/test/brand-doc.test.ts
import { describe, expect, it } from 'vitest';

import { parseBrandDocument } from '../lib/brand-doc';

const good = {
  brandColor: { value: '#7b9fd3', mode: 'locked' },
  fontFamily: { value: 'Georgia, serif', mode: 'default' },
  cta: { value: { label: 'Book a call', url: 'https://voldi.net' }, mode: 'default' },
};

describe('parseBrandDocument', () => {
  it('accepts a valid document and returns it typed', () => {
    const doc = parseBrandDocument(good);
    expect(doc?.brandColor).toEqual({ value: '#7b9fd3', mode: 'locked' });
    expect(doc?.cta?.value.url).toBe('https://voldi.net');
  });

  it('accepts the empty document — org yönetmiyor demek', () => {
    expect(parseBrandDocument({})).toEqual({});
  });

  it('rejects an unknown field name', () => {
    expect(parseBrandDocument({ evil: { value: 'x', mode: 'locked' } })).toBeNull();
  });

  it('rejects an unknown mode', () => {
    expect(parseBrandDocument({ brandColor: { value: '#123456', mode: 'suggested' } })).toBeNull();
  });

  it('rejects a malformed hex color', () => {
    expect(parseBrandDocument({ textColor: { value: 'mavi', mode: 'locked' } })).toBeNull();
  });

  it('rejects a font outside the web-safe list', () => {
    expect(parseBrandDocument({ fontFamily: { value: 'Comic Sans MS', mode: 'locked' } })).toBeNull();
  });

  it('rejects a template the renderer does not know', () => {
    expect(parseBrandDocument({ templateId: { value: 'fancy-neon', mode: 'locked' } })).toBeNull();
  });

  it('rejects a non-http(s) logo url', () => {
    expect(parseBrandDocument({ logoUrl: { value: 'javascript:alert(1)', mode: 'locked' } })).toBeNull();
  });

  it('rejects a cta missing its label', () => {
    expect(
      parseBrandDocument({ cta: { value: { label: ' ', url: 'https://voldi.net' }, mode: 'locked' } }),
    ).toBeNull();
  });

  it('rejects extra keys inside a field entry', () => {
    expect(
      parseBrandDocument({ brandColor: { value: '#123456', mode: 'locked', note: 'x' } }),
    ).toBeNull();
  });

  it('rejects non-object roots', () => {
    expect(parseBrandDocument(null)).toBeNull();
    expect(parseBrandDocument([])).toBeNull();
    expect(parseBrandDocument('x')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run (cwd `apps/web`): `npx vitest run test/brand-doc.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
// apps/web/lib/brand-doc.ts
import { TEMPLATE_IDS, type WebSafeFont } from '@mailmyra/renderer';

/**
 * Marka belgesi (spec §3). Her alan İSTEĞE BAĞLI { value, mode } — belgede
 * olmayan alanı org yönetmiyordur. Doğrulama SIKI (spec §6): belge org
 * genelini yönetir; imza kaydının gevşekliği burada geçerli değil.
 */

export type BrandMode = 'locked' | 'default';
export interface BrandField<T> {
  value: T;
  mode: BrandMode;
}
export interface BrandDocument {
  templateId?: BrandField<string>;
  brandColor?: BrandField<string>;
  textColor?: BrandField<string>;
  mutedColor?: BrandField<string>;
  fontFamily?: BrandField<WebSafeFont>;
  logoUrl?: BrandField<string>;
  cta?: BrandField<{ label: string; url: string }>;
  disclaimer?: BrandField<string>;
}

/** Tek runtime listesi — StyleStep de burayı kullanır. `satisfies` tip
 *  birliğinden saparsa derlemede yakalar. */
export const WEB_SAFE_FONTS = [
  'Arial, Helvetica, sans-serif',
  'Georgia, serif',
  'Times New Roman, serif',
  'Verdana, Geneva, sans-serif',
  'Tahoma, Geneva, sans-serif',
  'Trebuchet MS, sans-serif',
] as const satisfies readonly WebSafeFont[];

const MODES: readonly string[] = ['locked', 'default'];
const HEX = /^#[0-9a-f]{6}$/i;

function httpUrl(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function entry(raw: unknown): { value: unknown; mode: BrandMode } | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (Object.keys(raw).length !== 2) return null; // fazla anahtar da ret
  const { value, mode } = raw as { value?: unknown; mode?: unknown };
  if (typeof mode !== 'string' || !MODES.includes(mode)) return null;
  if (value === undefined) return null;
  return { value, mode: mode as BrandMode };
}

export function parseBrandDocument(input: unknown): BrandDocument | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const out: BrandDocument = {};
  for (const [key, raw] of Object.entries(input)) {
    const f = entry(raw);
    if (!f) return null;
    switch (key) {
      case 'templateId':
        if (typeof f.value !== 'string' || !(TEMPLATE_IDS as readonly string[]).includes(f.value))
          return null;
        out.templateId = { value: f.value, mode: f.mode };
        break;
      case 'brandColor':
      case 'textColor':
      case 'mutedColor':
        if (typeof f.value !== 'string' || !HEX.test(f.value)) return null;
        out[key] = { value: f.value, mode: f.mode };
        break;
      case 'fontFamily':
        if (typeof f.value !== 'string' || !(WEB_SAFE_FONTS as readonly string[]).includes(f.value))
          return null;
        out.fontFamily = { value: f.value as WebSafeFont, mode: f.mode };
        break;
      case 'logoUrl':
        if (!httpUrl(f.value)) return null;
        out.logoUrl = { value: f.value, mode: f.mode };
        break;
      case 'cta': {
        const v = f.value as { label?: unknown; url?: unknown } | null;
        if (!v || typeof v !== 'object') return null;
        if (Object.keys(v).length !== 2) return null;
        if (typeof v.label !== 'string' || !v.label.trim() || !httpUrl(v.url)) return null;
        out.cta = { value: { label: v.label, url: v.url }, mode: f.mode };
        break;
      }
      case 'disclaimer':
        if (typeof f.value !== 'string') return null;
        out.disclaimer = { value: f.value, mode: f.mode };
        break;
      default:
        return null; // tanınmayan alan adı
    }
  }
  return out;
}
```

- [ ] **Step 4: Run to verify pass**

`npx vitest run test/brand-doc.test.ts` → PASS (11 tests).

- [ ] **Step 5: StyleStep FONTS listesini ortak kaynağa bağla**

`apps/web/app/builder/steps/StyleStep.tsx` — satır 8'deki yerel `const FONTS: WebSafeFont[] = [...]` bloğunu sil, yerine:

```ts
import { WEB_SAFE_FONTS } from '../../../lib/brand-doc';

const FONTS: readonly WebSafeFont[] = WEB_SAFE_FONTS;
```

(`FONTS.map` kullanımı readonly ile de çalışır; typecheck hakem.)

- [ ] **Step 6: Full unit suite + typecheck**

`npx vitest run` (apps/web) → all pass · `npm run typecheck` (root) → 0.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/brand-doc.ts apps/web/test/brand-doc.test.ts apps/web/app/builder/steps/StyleStep.tsx
git commit -m "feat(brand): brand document type with a strict parse guard"
```

---

### Task 2: Overlay + seed — `lib/brand-apply.ts`

**Files:**
- Create: `apps/web/lib/brand-apply.ts`
- Test: `apps/web/test/brand-apply.test.ts`

**Interfaces:**
- Consumes: `BrandDocument`/`BrandField` (Task 1), `SignatureData` from `@mailmyra/renderer`.
- Produces:
  ```ts
  applyBrand(data: SignatureData, brand: BrandDocument | null): SignatureData
  seedBrandDefaults(empty: SignatureData, brand: BrandDocument | null): SignatureData
  ```
  (`seedBrandDefaults` girdiyi DEĞİŞTİRMEZ, yeni nesne döner; `empty` çağıranın `createEmptyData()`/`mergeWithEmpty({})` çıktısıdır — lib, app/builder'a bağımlanmaz.)

- [ ] **Step 1: Write the failing tests**

```ts
// apps/web/test/brand-apply.test.ts
import { describe, expect, it } from 'vitest';
import type { SignatureData } from '@mailmyra/renderer';

import { applyBrand, seedBrandDefaults } from '../lib/brand-apply';
import type { BrandDocument } from '../lib/brand-doc';

function data(over: Partial<SignatureData['visuals']> = {}): SignatureData {
  return {
    identity: { fullName: 'Ali Yılmaz' },
    contact: {},
    visuals: {
      brandColor: '#111111',
      iconColor: '#111111',
      textColor: '#222222',
      mutedColor: '#666666',
      fontFamily: 'Arial, Helvetica, sans-serif',
      ...over,
    },
    social: [],
    layout: { templateId: 'classic-horizontal', size: 'medium', iconStyle: 'mono', showDividers: true },
  } as SignatureData;
}

describe('applyBrand', () => {
  it('is the identity function without a brand', () => {
    const d = data();
    expect(applyBrand(d, null)).toEqual(d);
  });

  it('overlays every locked field onto its SignatureData path', () => {
    const brand: BrandDocument = {
      brandColor: { value: '#7b9fd3', mode: 'locked' },
      fontFamily: { value: 'Georgia, serif', mode: 'locked' },
      cta: { value: { label: 'Book', url: 'https://voldi.net' }, mode: 'locked' },
      disclaimer: { value: 'Legal.', mode: 'locked' },
    };
    const out = applyBrand(data(), brand);
    expect(out.visuals.brandColor).toBe('#7b9fd3');
    expect(out.visuals.fontFamily).toBe('Georgia, serif');
    expect(out.extras?.ctaLabel).toBe('Book');
    expect(out.extras?.ctaUrl).toBe('https://voldi.net');
    expect(out.extras?.disclaimer).toBe('Legal.');
  });

  it('does NOT overlay default-mode fields — kişi kazanır', () => {
    const out = applyBrand(data(), { brandColor: { value: '#7b9fd3', mode: 'default' } });
    expect(out.visuals.brandColor).toBe('#111111');
  });

  it('leaves unmanaged fields untouched', () => {
    const out = applyBrand(data(), { brandColor: { value: '#7b9fd3', mode: 'locked' } });
    expect(out.visuals.textColor).toBe('#222222');
    expect(out.layout.templateId).toBe('classic-horizontal');
  });

  it('does not mutate the input — kilit kalkınca kişisel değer geri gelir', () => {
    const d = data();
    applyBrand(d, { brandColor: { value: '#7b9fd3', mode: 'locked' } });
    expect(d.visuals.brandColor).toBe('#111111');
  });
});

describe('seedBrandDefaults', () => {
  it('seeds BOTH locked and default values into a fresh signature', () => {
    const out = seedBrandDefaults(data(), {
      brandColor: { value: '#7b9fd3', mode: 'locked' },
      textColor: { value: '#333333', mode: 'default' },
    });
    expect(out.visuals.brandColor).toBe('#7b9fd3');
    expect(out.visuals.textColor).toBe('#333333');
  });

  it('leaves unmanaged fields at their empty defaults', () => {
    const out = seedBrandDefaults(data(), { brandColor: { value: '#7b9fd3', mode: 'locked' } });
    expect(out.visuals.mutedColor).toBe('#666666');
  });
});
```

- [ ] **Step 2: Run to verify failure**

`npx vitest run test/brand-apply.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
// apps/web/lib/brand-apply.ts
import type { SignatureData } from '@mailmyra/renderer';

import type { BrandDocument, BrandField } from './brand-doc';

/**
 * Zorlamanın gerçek yeri (spec §4): kilitli input UX'tir, bindirme kapıdır.
 * Kayıtlı veri DEĞİŞMEZ — bindirme çıktıya işler; kilit kalkınca altta
 * duran kişisel değer geri görünür.
 */

function pick<T>(f: BrandField<T> | undefined, wantLockedOnly: boolean): T | undefined {
  if (!f) return undefined;
  if (wantLockedOnly && f.mode !== 'locked') return undefined;
  return f.value;
}

function overlay(data: SignatureData, brand: BrandDocument, lockedOnly: boolean): SignatureData {
  const visuals = { ...data.visuals };
  const layout = { ...data.layout };
  const extras = { ...(data.extras ?? {}) };

  const t = pick(brand.templateId, lockedOnly);
  if (t !== undefined) layout.templateId = t;
  const bc = pick(brand.brandColor, lockedOnly);
  if (bc !== undefined) visuals.brandColor = bc;
  const tc = pick(brand.textColor, lockedOnly);
  if (tc !== undefined) visuals.textColor = tc;
  const mc = pick(brand.mutedColor, lockedOnly);
  if (mc !== undefined) visuals.mutedColor = mc;
  const ff = pick(brand.fontFamily, lockedOnly);
  if (ff !== undefined) visuals.fontFamily = ff;
  const lg = pick(brand.logoUrl, lockedOnly);
  if (lg !== undefined) visuals.logoUrl = lg;
  const cta = pick(brand.cta, lockedOnly);
  if (cta !== undefined) {
    extras.ctaLabel = cta.label;
    extras.ctaUrl = cta.url;
  }
  const dc = pick(brand.disclaimer, lockedOnly);
  if (dc !== undefined) extras.disclaimer = dc;

  return { ...data, visuals, layout, extras };
}

/** Her render ÇIKIŞINDA koşar — yalnız kilitliler biner. */
export function applyBrand(data: SignatureData, brand: BrandDocument | null): SignatureData {
  if (!brand) return data;
  return overlay(data, brand, true);
}

/** YENİ imza tohumu — kilitli + varsayılan birlikte biner (spec §3). */
export function seedBrandDefaults(
  empty: SignatureData,
  brand: BrandDocument | null,
): SignatureData {
  if (!brand) return empty;
  return overlay(empty, brand, false);
}
```

- [ ] **Step 4: Run to verify pass**

`npx vitest run test/brand-apply.test.ts` → PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/brand-apply.ts apps/web/test/brand-apply.test.ts
git commit -m "feat(brand): pure overlay and seed for the brand document"
```

---

### Task 3: Schema + repo — `BrandSetting` and `lib/repo/brand.ts` (DB tests)

**Files:**
- Modify: `apps/web/prisma/schema.prisma` (model + Organization relation)
- Create: migration via `npx prisma migrate dev --name brand-setting` (apps/web)
- Create: `apps/web/lib/repo/brand.ts`
- Modify: `apps/web/test-db/helpers.ts` (truncate listesine `brandSetting`)
- Test: `apps/web/test-db/brand.test.ts`

**Interfaces:**
- Consumes: `parseBrandDocument`/`BrandDocument` (Task 1), `primaryOrgId`/`roleFor` from `lib/repo/senders.ts`, `can` from core.
- Produces:
  ```ts
  getBrand(orgId: string): Promise<BrandDocument | null>
  saveBrandAs(userId: string, doc: BrandDocument):
    Promise<{ ok: true } | { ok: false; reason: 'forbidden' }>
  ```

- [ ] **Step 1: Schema**

`schema.prisma`'ya (Signature modelinden sonra) ekle; `Organization` modeline `brandSetting BrandSetting?` ilişki satırı ekle:

```prisma
/// Org geneli marka belgesi (spec §3). Signature.data emsali: bütün belge
/// olarak okunup yazılan JSON; içine indeks atılmaz.
model BrandSetting {
  id        String   @id @default(cuid())
  orgId     String   @unique
  data      Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  org Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
}
```

Run (cwd `apps/web`): `npx prisma migrate dev --name brand-setting`
Expected: yeni migration klasörü + client yeniden üretildi. `git status` migration dosyasını gösterir.

- [ ] **Step 2: helpers.ts truncate**

`apps/web/test-db/helpers.ts` — transaction listesine, `prisma.signature.deleteMany()` satırının YANINA:

```ts
    prisma.brandSetting.deleteMany(),
```

- [ ] **Step 3: Write the failing DB tests**

```ts
// apps/web/test-db/brand.test.ts
/**
 * Marka deposu: rol kapısı + org başına tek satır. Bindirmenin uçtan uca
 * kanıtı Task 4'ün export testinde.
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { prisma } from '../lib/db';
import { getBrand, saveBrandAs } from '../lib/repo/brand';
import { truncateAll } from './helpers';

beforeEach(truncateAll);
afterAll(async () => {
  await truncateAll();
  await prisma.$disconnect();
});

let n = 0;
async function member(role: 'owner' | 'admin' | 'editor' | 'viewer') {
  const user = await prisma.user.create({
    data: { email: `uye${++n}@voldi.net`, passwordHash: 'x' },
  });
  const org = await prisma.organization.create({ data: { name: 'Voldi', entitledSeats: 5 } });
  await prisma.membership.create({ data: { userId: user.id, orgId: org.id, role } });
  return { userId: user.id, orgId: org.id };
}

const DOC = { brandColor: { value: '#7b9fd3', mode: 'locked' as const } };

describe('saveBrandAs', () => {
  test('an owner saves; getBrand reads the same document back', async () => {
    const { userId, orgId } = await member('owner');
    expect(await saveBrandAs(userId, DOC)).toEqual({ ok: true });
    expect(await getBrand(orgId)).toEqual(DOC);
  });

  test('an admin passes, editor and viewer are refused — the matrix line', async () => {
    const admin = await member('admin');
    expect(await saveBrandAs(admin.userId, DOC)).toEqual({ ok: true });
    const editor = await member('editor');
    expect(await saveBrandAs(editor.userId, DOC)).toEqual({ ok: false, reason: 'forbidden' });
    const viewer = await member('viewer');
    expect(await saveBrandAs(viewer.userId, DOC)).toEqual({ ok: false, reason: 'forbidden' });
  });

  test('a second save updates the single row instead of adding one', async () => {
    const { userId, orgId } = await member('owner');
    await saveBrandAs(userId, DOC);
    await saveBrandAs(userId, { textColor: { value: '#333333', mode: 'default' } });

    expect(await prisma.brandSetting.count({ where: { orgId } })).toBe(1);
    const doc = await getBrand(orgId);
    expect(doc?.textColor?.value).toBe('#333333');
    expect(doc?.brandColor).toBeUndefined(); // belge BÜTÜN olarak değişir
  });
});

describe('getBrand', () => {
  test('returns null when the org has no brand record', async () => {
    const { orgId } = await member('owner');
    expect(await getBrand(orgId)).toBeNull();
  });

  test('returns null instead of a corrupt document — okuma sınırı da bekçili', async () => {
    const { orgId } = await member('owner');
    await prisma.brandSetting.create({
      data: { orgId, data: { evil: { value: 'x', mode: 'locked' } } },
    });
    expect(await getBrand(orgId)).toBeNull();
  });
});
```

- [ ] **Step 4: Run to verify failure**

`npx vitest run --config vitest.db.config.ts test-db/brand.test.ts` → FAIL (`../lib/repo/brand` missing).

- [ ] **Step 5: Implement**

```ts
// apps/web/lib/repo/brand.ts
import { can } from '@mailmyra/core';
import type { Prisma } from '@prisma/client';

import { parseBrandDocument, type BrandDocument } from '../brand-doc';
import { prisma } from '../db';
import { primaryOrgId, roleFor } from './senders';

/**
 * Marka deposu (spec §3/§6). Org başına tek satır; belge BÜTÜN olarak
 * okunur/yazılır. Okuma sınırı da bekçili: DB'ye elle yazılmış bozuk belge
 * null sayılır — tüketiciler "marka yok" gibi davranır, render çökmez.
 */

export async function getBrand(orgId: string): Promise<BrandDocument | null> {
  const row = await prisma.brandSetting.findUnique({ where: { orgId } });
  if (!row) return null;
  return parseBrandDocument(row.data);
}

export type SaveBrandResult = { ok: true } | { ok: false; reason: 'forbidden' };

export async function saveBrandAs(userId: string, doc: BrandDocument): Promise<SaveBrandResult> {
  const orgId = await primaryOrgId(userId);
  if (!orgId) return { ok: false, reason: 'forbidden' };
  const role = await roleFor(userId, orgId);
  if (!role || !can(role, 'brand:manage')) return { ok: false, reason: 'forbidden' };

  const data = doc as Prisma.InputJsonValue;
  await prisma.brandSetting.upsert({
    where: { orgId },
    create: { orgId, data },
    update: { data },
  });
  return { ok: true };
}
```

- [ ] **Step 6: Run to verify pass, then whole DB suite + typecheck**

`npx vitest run --config vitest.db.config.ts test-db/brand.test.ts` → PASS (6 tests).
`npm run test:db` (root) → all pass · `npm run typecheck` → 0.

- [ ] **Step 7: Commit**

```bash
git add apps/web/prisma apps/web/lib/repo/brand.ts apps/web/test-db/brand.test.ts apps/web/test-db/helpers.ts
git commit -m "feat(brand): BrandSetting schema and role-gated repo"
```

---

### Task 4: Overlay at the sinks — zip export + `templateId` column fix (DB tests)

**Files:**
- Modify: `apps/web/lib/repo/export.ts` (brand fetch + applyBrand before render)
- Modify: `apps/web/lib/repo/signatures.ts` (`saveSignature` writes the `templateId` column)
- Test: `apps/web/test-db/export-zip.test.ts` (bir test eklenir), `apps/web/test-db/signatures.test.ts` (bir regresyon testi eklenir)

**Interfaces:**
- Consumes: `applyBrand` (Task 2), `getBrand` (Task 3).
- Produces: davranış — zip çıktısı markalı; `Signature.templateId` kolonu `data.layout.templateId`'yi yansıtır.

- [ ] **Step 1: Failing test — zip çıktısı markalı**

`test-db/export-zip.test.ts`'e (mevcut yardımcıları kullanarak) yeni describe:

```ts
describe('brand overlay at the export sink', () => {
  test("a locked brand color replaces the person's color in the output", async () => {
    const { userId, orgId } = await orgWithOwner();
    const s = await liveSender(orgId, 'Ali Yılmaz');
    await prisma.signature.create({
      data: {
        orgId,
        senderIdentityId: s.id,
        name: 'Kisisel',
        data: mergeWithEmpty({
          identity: { fullName: 'Ali Yılmaz' },
          visuals: { brandColor: '#ff0000' }, // kişisel seçim
        }) as object,
      },
    });
    await prisma.brandSetting.create({
      data: { orgId, data: { brandColor: { value: '#7b9fd3', mode: 'locked' } } },
    });

    const r = await collectExportBundle(userId);

    if (!r.ok) throw new Error(r.reason);
    expect(r.files[0]?.html).toContain('#7b9fd3');
    expect(r.files[0]?.html).not.toContain('#ff0000');
  });
});
```

Run: `npx vitest run --config vitest.db.config.ts test-db/export-zip.test.ts` → yeni test FAIL (`#ff0000` hâlâ çıktıda), eski 11 PASS.

- [ ] **Step 2: Implement — export.ts**

`collectExportBundle` içinde, fatura org'u okunduğu bloğun yanına marka okuması; render satırında bindirme:

```ts
import { applyBrand } from '../brand-apply';
import { getBrand } from './brand';
```

```ts
  // Marka bir kez okunur; bindirme render ÇIKIŞINDA (spec §4 — zorlamanın yeri).
  const brand = await getBrand(orgId);
```

Render satırı değişir:

```ts
      const data = applyBrand(mergeWithEmpty(sig.data as Partial<SignatureData>), brand);
      const fragment = renderSignature(
        data,
        data.layout.templateId,
        iconBaseUrl ? { iconBaseUrl } : undefined,
      );
```

Run: aynı test dosyası → 12/12 PASS.

- [ ] **Step 3: Failing test — templateId kolonu**

`test-db/signatures.test.ts`'e (dosyanın mevcut yardımcılarıyla; `saveSignature` zaten import'lu) ekle:

```ts
  test('saveSignature mirrors data.layout.templateId into the column', async () => {
    // Backlog borcu: kolon hiç yazılmıyordu; ikinci şablon gelince liste
    // ekranı bayat gösterecekti. Kolon HAM veriyi yansıtır (bindirme değil).
    const { userId, orgId } = await member('owner'); // dosyadaki mevcut kurulum yardımcısı ne ise onu kullan
    const result = await saveSignature(userId, {
      orgId,
      name: 'X',
      data: { layout: { templateId: 'classic-horizontal' } },
    });
    if (!result.ok) throw new Error('unreachable');
    const row = await prisma.signature.findUniqueOrThrow({ where: { id: result.id } });
    expect(row.templateId).toBe('classic-horizontal');
  });
```

(Dosyanın gerçek kurulum yardımcısının adı/imzası farklıysa ona uy — niyet:
org üyesi bir kullanıcıyla kayıt.) Run → FAIL beklenir ANCAK kolonun
`@default("classic-horizontal")` olduğu için bu değerle geçebilir; o zaman
testte `'classic-horizontal'` yerine İKİNCİ bir değerle sına: `TEMPLATE_IDS`
tek elemanlıysa `data.layout.templateId`'ye `'classic-horizontal'` dışı
değer yazmak sahte olur — bu durumda testi şöyle kur: kolonu elle `''`
yapıp (`prisma.signature.update`) sonra `saveSignature` update yolunu koş,
kolonun `data.layout.templateId`'ye DÖNDÜĞÜNÜ doğrula.

- [ ] **Step 4: Implement — signatures.ts**

`saveSignature` içinde create ve update `data:` bloklarına `templateId` ekle:

```ts
/** Kolon liste ekranı içindir; gerçek kaynak data.layout.templateId. */
function templateIdOf(data: unknown): string {
  const t = (data as { layout?: { templateId?: unknown } } | null)?.layout?.templateId;
  return typeof t === 'string' && t ? t : 'classic-horizontal';
}
```

create/update çağrılarında: `templateId: templateIdOf(input.data),`

Run: signatures test dosyası → PASS.

- [ ] **Step 5: Whole DB suite + typecheck + commit**

`npm run test:db` → all pass · `npm run typecheck` → 0.

```bash
git add apps/web/lib/repo/export.ts apps/web/lib/repo/signatures.ts apps/web/test-db/export-zip.test.ts apps/web/test-db/signatures.test.ts
git commit -m "feat(brand): overlay at the zip sink and honest templateId column"
```

---

### Task 5: Route — `POST /api/brand`

**Files:**
- Create: `apps/web/app/api/brand/route.ts`

**Interfaces:**
- Consumes: `parseBrandDocument` (Task 1), `saveBrandAs` (Task 3), `currentSession`, `json`/`readJsonBody`.

- [ ] **Step 1: Implement** (thin; davranış repo katmanında kanıtlı — publish/export-zip deseni, route testi yok)

```ts
// apps/web/app/api/brand/route.ts
import { currentSession } from '../../../lib/auth/current';
import { parseBrandDocument } from '../../../lib/brand-doc';
import { saveBrandAs } from '../../../lib/repo/brand';
import { json, readJsonBody } from '../auth/_shared';

/** Spec §6. Doğrulama SIKI: belge org genelini yönetir. */
export async function POST(req: Request): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const body = await readJsonBody(req);
  const doc = parseBrandDocument((body as { data?: unknown }).data);
  if (!doc) return json(400, { error: 'invalid_input' });

  const result = await saveBrandAs(session.user.id, doc);
  if (!result.ok) return json(403, { error: result.reason });
  return json(200, { ok: true });
}
```

- [ ] **Step 2: Typecheck + commit**

`npm run typecheck` → 0.

```bash
git add apps/web/app/api/brand/route.ts
git commit -m "feat(api): POST /api/brand saves the validated brand document"
```

---

### Task 6: Shared dialog — `components/ui/ConfirmDialog.tsx` + iki mevcut diyaloğun taşınması

**Files:**
- Create: `apps/web/components/ui/ConfirmDialog.tsx`
- Modify: `apps/web/app/(app)/app/senders/SenderTable.tsx` (zip diyaloğu bileşene taşınır — mevcut metinler AYNEN korunur)
- Modify: `apps/web/app/(app)/app/senders/SenderActions.tsx` (`window.confirm` publish/deactivate onayları bileşene taşınır — mevcut rakamlı metinler AYNEN korunur)

**Interfaces:**
- Produces:
  ```tsx
  <ConfirmDialog
    title: string
    onCancel: () => void
    onConfirm?: () => void        // yoksa yalnız Cancel görünür (bilgi kipi)
    confirmLabel?: string          // varsayılan 'Confirm'
    cancelLabel?: string           // varsayılan 'Cancel'
    busy?: boolean
    children: ReactNode
  />
  ```

- [ ] **Step 1: Component**

```tsx
// apps/web/components/ui/ConfirmDialog.tsx
'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import styles from './ConfirmDialog.module.css';

/**
 * Panelin tek onay diyaloğu (backlog borcu: zip diyaloğunda odak/Escape
 * yoktu, publish window.confirm idi). Odak açılışta panele gelir, Tab
 * içeride döner, Escape = Cancel. Metinler çağıranın işi — bileşen kabuk.
 */
export function ConfirmDialog({
  title,
  children,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.focus();
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && !busy) {
      e.stopPropagation();
      onCancel();
      return;
    }
    if (e.key !== 'Tab') return;
    // Küçük odak tuzağı: içerideki odaklanabilirler arasında döngü.
    const nodes = panel.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!nodes || nodes.length === 0) return;
    const first = nodes[0]!;
    const last = nodes[nodes.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={styles.panel}
        ref={panel}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.body}>{children}</div>
        <div className={styles.actions}>
          <button type="button" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          {onConfirm && (
            <button type="button" onClick={onConfirm} disabled={busy}>
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

`ConfirmDialog.module.css`: `senders.module.css`'teki `exportDialog/exportDialogActions` stillerinin genelleştirilmiş kopyası + `.overlay { position: fixed; inset: 0; background: rgba(0,16,43,.35); display: grid; place-items: center; z-index: 50; }` · `.panel` eski `exportDialog` kutusu · `.title/.body/.actions`. Eski `exportDialog*` sınıfları taşındıktan sonra `senders.module.css`'ten SİLİNİR.

- [ ] **Step 2: SenderTable zip diyaloğunu taşı**

Mevcut `role="dialog"` bloğu `ConfirmDialog`'a çevrilir: `title="Export zip"`, gövde aynen (rakamlar/Skipped/hata), `onConfirm={plan.fileCount > 0 ? download : undefined}` `confirmLabel={busy ? 'Preparing…' : 'Download'}` — davranış ve METİNLER birebir aynı kalır.

- [ ] **Step 3: SenderActions onaylarını taşı**

`window.confirm(...)` çağrıları: mevcut onay METNİ AYNEN `ConfirmDialog` gövdesine; state (`open` alanı) eklenir. Publish onayının rakamlı cümlesi ve tavan-dolu açıklaması değişmez — kabuk değişir.

- [ ] **Step 4: Verify + commit**

`npx vitest run` (apps/web) → all pass · `npm run typecheck` → 0.
(Odak/Escape davranışı Task 9 tarayıcı turunda doğrulanır.)

```bash
git add apps/web/components/ui/ConfirmDialog.tsx apps/web/components/ui/ConfirmDialog.module.css "apps/web/app/(app)/app/senders/"
git commit -m "feat(ui): shared ConfirmDialog; export and publish dialogs move in"
```

---

### Task 7: Brand screen — `/app/brand`

**Files:**
- Create: `apps/web/app/(app)/app/brand/page.tsx`, `BrandClient.tsx`, `brand.module.css`
- Modify: panel nav'ına link (senders/signatures linklerinin yaşadığı dosyayı bul: `grep -rn "app/senders" apps/web/app/\(app\)` — Members/Senders linkleri hangi layout/nav bileşenindeyse oraya `Brand` linki aynı desenle eklenir)

**Interfaces:**
- Consumes: `getBrand` (T3), `parseBrandDocument` tipleri (T1), `seedBrandDefaults`/`applyBrand` (T2), `Preview` (builder), `renderSignature` + `fixtures` from `@mailmyra/renderer` (örnek kimlik: `fixtures`'daki ilk örnek veri kullanılır — elle demo veri uydurma), `ConfirmDialog` (T6), `WEB_SAFE_FONTS`, `TEMPLATE_IDS`.

- [ ] **Step 1: Server page**

```tsx
// apps/web/app/(app)/app/brand/page.tsx
import { redirect } from 'next/navigation';
import { can } from '@mailmyra/core';

import { currentSession } from '../../../../lib/auth/current';
import { prisma } from '../../../../lib/db';
import { getBrand } from '../../../../lib/repo/brand';
import { primaryOrgId, roleFor } from '../../../../lib/repo/senders';
import { BrandClient } from './BrandClient';

export const metadata = { title: 'Brand — Mailmyra' };

export default async function BrandPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/brand');
  const orgId = await primaryOrgId(session.user.id);
  const role = orgId ? await roleFor(session.user.id, orgId) : null;

  // Ölü uç yok: yetkisiz rol sayfayı görür ama açıklamayla.
  if (!orgId || !role || !can(role, 'brand:manage')) {
    return (
      <section>
        <h1>Brand</h1>
        <p>Brand settings are managed by workspace owners and admins.</p>
      </section>
    );
  }

  const [brand, liveSignatures] = await Promise.all([
    getBrand(orgId),
    // Etki diyaloğunun sayısı: yayındaki göndericilere atanmış imzalar.
    prisma.signature.count({
      where: { orgId, sender: { publishedAt: { not: null }, deactivatedAt: null } },
    }),
  ]);

  return (
    <BrandClient
      initialBrand={brand}
      liveSignatures={liveSignatures}
      iconBaseUrl={process.env.CDN_PUBLIC_URL ?? ''}
    />
  );
}
```

- [ ] **Step 2: BrandClient**

`'use client'`. State: `doc: BrandDocument` (başlangıç `initialBrand ?? {}`) + `dialogOpen/busy/error/savedAt`. Yapı:

- Sol sütun: 8 alan satırı. Her satır: etiket · alan kontrolü · mod seçici
  (`<select>`: `Not managed / Default / Locked`). "Not managed" seçilince
  alan `doc`'tan SİLİNİR; diğer modlarda `{ value, mode }` yazılır. Alan
  kontrolleri:
  - templateId: `<select>` `TEMPLATE_IDS`'ten
  - brandColor/textColor/mutedColor: `<input type="color">` + yanına hex
    metni (builder StyleStep'in renk deseni neyse ONU aynen kullan — bak
    ve kopyala, yeni desen icat etme)
  - fontFamily: `<select>` `WEB_SAFE_FONTS`'tan
  - logoUrl: dosya seçici — `VisualsStep`'in yükleme handler'ı AYNEN
    (POST /api/upload → CDN URL). VisualsStep'e bak, deseni kopyala.
  - cta: iki input (label + url)
  - disclaimer: `<textarea>`
- Sağ sütun: `Preview` bileşeni;
  `html = renderSignature(applyBrand(seedBrandDefaults(mergeWithEmpty(fixtures[0]!.data), doc), doc), effTemplate, iconBaseUrl ? { iconBaseUrl } : undefined)`
  — `fixtures[0]` renderer'ın kendi örnek verisi; `effTemplate` bindirilmiş
  verinin `layout.templateId`'si. `textColor` prop'una bindirilmiş
  `visuals.textColor` verilir. (fixtures'ın gerçek şekli `packages/renderer/src/fixtures/samples.ts` —
  implementer bakar; `data` alanının adı farklıysa uyarlar.)
- Save düğmesi → `ConfirmDialog`:
  `title="Save brand settings"` · gövde: `This will affect {liveSignatures} live signature{s}.` + `Changes apply from the next export — e-mails already sent do not change.` · Confirm → `POST /api/brand {data: doc}` → başarıda diyalog kapanır, "Saved" ibaresi; 400/403'te İngilizce hata satırı.

- [ ] **Step 3: Nav link**

Senders/Signatures linklerinin bulunduğu nav dosyasına `Brand` linki (`/app/brand`) aynı desenle. Rol gizlemesi YOK — sayfanın kendisi açıklıyor (Step 1).

- [ ] **Step 4: Verify + commit**

`npm run typecheck` → 0 · `npx vitest run` → all pass.

```bash
git add "apps/web/app/(app)/app/brand/" <nav dosyası>
git commit -m "feat(panel): brand settings screen with live preview and impact dialog"
```

---

### Task 8: Builder integration — locked controls + seeded new signatures

**Files:**
- Modify: `apps/web/app/builder/page.tsx` (düzenleme kipinde marka çek + prop)
- Modify: `apps/web/app/builder/BuilderClient.tsx` (brand prop; önizleme/export HTML'i `applyBrand` ile; kilitli alan bilgisini adımlara geçir)
- Modify: `apps/web/app/builder/steps/StyleStep.tsx`, `VisualsStep.tsx`, `InfoStep.tsx` (yalnız KİLİTLİ alanların kontrolleri: `disabled` + 🔒 + "Marka ayarlarından yönetiliyor" — builder'ın bugünkü dili Türkçe, bu metin Türkçe)
- Modify: `apps/web/app/(app)/app/signatures/NewSignatureButton.tsx` + `signatures/page.tsx` (yeni imza `seedBrandDefaults` tohumlu)
- Test: `apps/web/test/builder-brand.test.ts` (saf yardımcı için)

**Interfaces:**
- Consumes: `applyBrand`/`seedBrandDefaults` (T2), `getBrand` (T3), `BrandDocument` (T1).
- Produces: `lockedBrandFields(brand): Set<'templateId'|'brandColor'|'textColor'|'mutedColor'|'fontFamily'|'logoUrl'|'cta'|'disclaimer'>` — saf yardımcı, `lib/brand-apply.ts`'e eklenir; adımlar `locked.has('brandColor')` diye bakar.

- [ ] **Step 1: Failing test — lockedBrandFields**

```ts
// apps/web/test/builder-brand.test.ts
import { describe, expect, it } from 'vitest';

import { lockedBrandFields } from '../lib/brand-apply';

describe('lockedBrandFields', () => {
  it('lists exactly the locked field names', () => {
    expect(
      lockedBrandFields({
        brandColor: { value: '#7b9fd3', mode: 'locked' },
        textColor: { value: '#333333', mode: 'default' },
      }),
    ).toEqual(new Set(['brandColor']));
  });
  it('is empty without a brand', () => {
    expect(lockedBrandFields(null)).toEqual(new Set());
  });
});
```

Run → FAIL. Implement in `lib/brand-apply.ts`:

```ts
export type BrandFieldName = keyof BrandDocument;

export function lockedBrandFields(brand: BrandDocument | null): Set<BrandFieldName> {
  const out = new Set<BrandFieldName>();
  if (!brand) return out;
  for (const key of Object.keys(brand) as BrandFieldName[]) {
    if (brand[key]?.mode === 'locked') out.add(key);
  }
  return out;
}
```

Run → PASS. (Bu, adımlardaki tek karar noktası — UI'da mod mantığı tekrar yazılmaz.)

- [ ] **Step 2: page.tsx — düzenleme kipinde marka**

`editing` bloğunun yanına: `const brand = session && editing ? await getBrand((await primaryOrgId(session.user.id)) ?? '') : null;`
(boş orgId durumunda `getBrand('')` null döner — `findUnique` eşleşmez; yine de `?? ''` yerine erken null tercih edilebilir, typecheck hakem). `BuilderClient`'a `brand={brand}` prop'u. Anonim kip: prop `null` → davranış değişmez.

- [ ] **Step 3: BuilderClient**

- Prop: `brand?: BrandDocument | null` (varsayılan null).
- `const locked = lockedBrandFields(brand ?? null);`
- `html` memo'su: `renderSignature(applyBrand(data, brand ?? null), applied.layout.templateId, ...)` — bindirilmiş verinin şablonu kullanılır (kilitli şablon senaryosu).
- Adım bileşenlerine `locked` Set'i prop olarak geçir (yalnız panel kipinde dolu).

- [ ] **Step 4: Adımlar — kilitli kontroller**

Her adımda ilgili kontrol için desen (örnek StyleStep brandColor):

```tsx
disabled={locked.has('brandColor')}
```

ve kontrolün yanında koşullu ipucu: `{locked.has('brandColor') && <span className={styles.lockHint}>🔒 Marka ayarlarından yönetiliyor</span>}` — adım dosyalarının mevcut düzenine uyarak (stil sınıfı builder.module.css'e bir kez eklenir). Kapsanan kontroller: şablon seçici + üç renk + font (StyleStep) · logo yükleme (VisualsStep) · CTA label/url + disclaimer (hangi adımdaysa — InfoStep/SocialStep'e bak, `ctaLabel` nerede render ediliyorsa orası).

- [ ] **Step 5: Yeni imza tohumu**

`signatures/page.tsx` sunucuda `getBrand(orgId)` + `seedBrandDefaults(mergeWithEmpty({}), brand)` hesaplar ve `NewSignatureButton`'a `seedData` prop'u verir; buton POST gövdesindeki `data`'yı bu tohumla gönderir (bugün ne gönderiyorsa yapısına bak, yalnız `data` alanı değişir).

- [ ] **Step 6: Verify + commit**

`npx vitest run` → all pass · `npm run typecheck` → 0 · `npm run test:db` → all pass.

```bash
git add apps/web/app/builder apps/web/lib/brand-apply.ts apps/web/test/builder-brand.test.ts "apps/web/app/(app)/app/signatures/"
git commit -m "feat(builder): locked brand controls, overlaid preview, seeded new signatures"
```

---

### Task 9: Full verification + browser proof + final review + merge

- [ ] **Step 1: Suites**

`npm test` · `npm run test:db` · `npm run typecheck` — hepsi yeşil.

- [ ] **Step 2: Browser (dev server, Browser pane — asla Bash)**

1. `preview_start {name:"web"}`; yerel dev hesabı `hesap-test@voldi.net / panel testi icin sifre`.
2. `/app/brand`: brandColor'ı kilitle (#7b9fd3), textColor'a default ver, Save → etki diyaloğu sayı + cümle → kaydet.
3. `/app/signatures` → yeni imza → builder açılışta marka renginde (tohum); brandColor kontrolü pasif + 🔒 ipucu; textColor değiştirilebilir.
4. Önizleme kilitli rengi gösteriyor; kişisel renk girilemiyor.
5. Zip export (senders) → `.htm` içinde kilitli renk.
6. Üç diyalogda Escape + odak tuzağı çalışıyor (brand impact, zip, publish).
7. Ekran görüntüleri.

- [ ] **Step 3: Final whole-branch review**

`scripts/review-package $(git merge-base main HEAD) HEAD` → en yetkin modelle bütün-dal incelemesi (superpowers:requesting-code-review şablonu); ledger'daki Minor listesi triyaj için verilir. Bulgular TEK fix subagent'la kapatılır.

- [ ] **Step 4: Merge + backlog**

Main kirli-dosya kesişim kontrolü → `git -C <ana-ağaç> merge --ff-only <dal>`. Kapanan backlog maddeleri (ortak diyalog, templateId) işaretlenir; kalanlar not edilir.

**DEPLOY NOTU (Hüseyin'le):** Bu tur ŞEMA DEĞİŞTİRİYOR — ritüelin tam hâli:
build + `.next` VE `prisma/` FTPS → Plesk'te DURDUR → yükle → panelde
`exec -- prisma migrate deploy` → `exec -- prisma generate` → BAŞLAT.

---

## Self-review notu

- Spec kapsaması: §3→T1/T2/T3 · §4→T4/T8 · §5→T7 · §6→T5/T6/T7 · §7→testler T1-T4/T8 + T9 tarayıcı · §8 kapsam dışına sadık (retrofit yok, kalıtım yok).
- Tip tutarlılığı: `BrandDocument/BrandField/BrandMode` (T1) her tüketicide aynı; `applyBrand/seedBrandDefaults/lockedBrandFields` imzaları T2/T7/T8'de birebir; `getBrand/saveBrandAs` (T3) T4/T5/T7/T8'de birebir.
- Bilinçli esneklikler (placeholder değil, mevcut koda uyum talimatı): T4/3'te kolon-default tuzağı için alternatif test yolu tarif edildi; T7/T8'de "VisualsStep/StyleStep desenini kopyala" yönergeleri mevcut dosyaya bakmayı şart koşuyor — desen adları ve dosyalar named.
