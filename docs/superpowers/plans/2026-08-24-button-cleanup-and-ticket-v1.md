# Dalga A — Düğme Temizliği + Müşteri Ticket v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 11 onaylı ölü-kontrol kararını uygular (3 bağla, 8 kaldır) ve müşteri panelinde Support sayfası açar: form → `SupportCase` (`channel:'form'`), kendi org'unun vakalarını listeler.

**Architecture:** Bölüm 1 saf UI düzeltmesi (kaldırmalar + `?new=1` auto-open + Suspense). Bölüm 2 üç katman: müşteri-kapılı repo modülü `lib/repo/support.ts` (admin.ts'e GİRMEZ — oradaki numaralandırma testi personel kapısı bekler) → ince `POST /api/support` ucu → sunucu-render `/app/support` sayfası. Migration YOK; `SupportCase` şeması olduğu gibi.

**Tech Stack:** Next.js App Router · Prisma/MariaDB · Vitest (node env, DOM testi yok) · Vuexy markup (kopyala, uydurma).

**Spec:** `docs/superpowers/specs/2026-08-24-button-cleanup-and-ticket-v1-design.md`

## Global Constraints

- Paket yöneticisi **npm** (pnpm/corepack YASAK). Komutlar kökten: `npm test`, `npm run typecheck`; tek dosya test: `npm test -w apps/web -- test/<dosya>.test.ts`.
- Prod build doğrulaması: `DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder" npm run build -w apps/web`.
- UI dili **İngilizce** (ürün dili; TR/EN ayrı dalga). Kod yorumları mevcut dosya normuna uyar (Türkçe gerekçe yorumları).
- Panel markup'ı **Vuexy kopyası** — kendi markup'ını uydurma, emsal sayfadan/bileşenden kopyala.
- Yeni bağımlılık YOK · migration YOK · renderer'a dokunulmaz.
- Müşteri yazması personel sözleşmesine TABİ DEĞİL: AdminAction/StaffAccess yazılmaz; `ActivityEvent` (`support.case_opened`) yazılır.
- Commit mesajları İngilizce, conventional (`feat:`/`chore:`), sonunda `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Ölü kontrol kaldırmaları (K4–K9, K11)

**Files:**
- Modify: `apps/web/app/(admin)/ui/SupportOperationsViews.tsx` (~75, ~161)
- Modify: `apps/web/app/(admin)/ui/GrowthOperationsViews.tsx` (~148-149, ~162)
- Modify: `apps/web/app/(admin)/ui/PlatformOperationsViews.tsx` (~153)
- Modify: `apps/web/app/(app)/navbar/ShortcutsMenu.tsx` (~59-67)

**Interfaces:** Yok — saf silme; hiçbir export imzası değişmez.

- [ ] **Step 1: Testlerin kaldırılacaklara referans vermediğini doğrula**

Run: `grep -rn "Open procedure\|Add note for\|column actions\|lane.label} actions\|dropdown-shortcuts-add\|>Reply<" apps/web/test/`
Expected: çıktı YOK (exit 1). Çıktı varsa DUR, ana oturuma bildir.

- [ ] **Step 2: K4 — SupportOperationsViews "Reply" düğmesi**

Konuşma başlığındaki (`mm-support-conversation__header` içinde) şu düğmeyi sil; saran `d-flex gap-2` div'i ve `SupportActionButtons` KALIR:

```tsx
<button className="btn btn-sm btn-primary" type="button">Reply<i className="icon-base ti tabler-send ms-1" /></button>
```

- [ ] **Step 3: K5 — SupportOperationsViews "Open procedure"**

`SupportPlaybooksView` içindeki playbook kartının sonundaki bloğu SARAN div'iyle birlikte sil:

```tsx
<div className="d-flex justify-content-end mt-4"><button className={`btn btn-sm btn-label-${playbook.tone}`} type="button">Open procedure<i className="icon-base ti tabler-arrow-up-right ms-1" /></button></div>
```

- [ ] **Step 4: K6+K7 — GrowthOperationsViews lead kartı düğmeleri**

`LeadCard` footer'ındaki iki düğmeyi SARAN `d-flex gap-1` div'iyle birlikte sil (tarih `<small>` KALIR):

```tsx
<div className="d-flex gap-1">
  <button className="btn btn-sm btn-icon btn-text-secondary rounded-pill" type="button" aria-label={`Add note for ${lead.company}`}><i className="icon-base ti tabler-message-circle" /></button>
  <button className={`btn btn-sm btn-icon btn-label-${tone} rounded-pill`} type="button" aria-label={`Open ${lead.company}`}><i className="icon-base ti tabler-arrow-up-right" /></button>
</div>
```

- [ ] **Step 5: K8 — GrowthOperationsViews sütun başlığı üç-nokta**

`LeadsView` sütun `<header>`ındaki şu düğmeyi sil (başlıktaki avatar/rozet bloğu KALIR):

```tsx
<button className="btn btn-sm btn-icon btn-text-secondary rounded-pill" type="button" aria-label={`${meta.label} column actions`}><i className="icon-base ti tabler-dots" /></button>
```

- [ ] **Step 6: K9 — PlatformOperationsViews jobs şeridi üç-nokta**

Jobs lane `<header>`ındaki şu düğmeyi sil:

```tsx
<button className="btn btn-sm btn-icon btn-text-secondary rounded-pill" type="button" aria-label={`${lane.label} actions`}><i className="icon-base ti tabler-dots" /></button>
```

- [ ] **Step 7: K11 — ShortcutsMenu sahte "+"**

`dropdown-header` içindeki şu `<span>` bloğunu tamamen sil (`<h6>` ve saran div KALIR):

```tsx
<span
  className="dropdown-shortcuts-add py-2 btn btn-text-secondary rounded-pill btn-icon"
  title="Customization coming soon"
>
  <i className="icon-base ti tabler-plus icon-20px text-heading" aria-hidden="true" />
</span>
```

- [ ] **Step 8: Doğrula**

Run: `npm run typecheck` → PASS. Sonra `npm test -w apps/web` → tümü PASS (silinenlere test referansı yoktu, Step 1 bunu kanıtladı).
Run: `grep -rn "Open procedure\|dropdown-shortcuts-add" apps/web/app/` → çıktı YOK.

- [ ] **Step 9: Commit**

```bash
git add "apps/web/app/(admin)/ui/SupportOperationsViews.tsx" "apps/web/app/(admin)/ui/GrowthOperationsViews.tsx" "apps/web/app/(admin)/ui/PlatformOperationsViews.tsx" "apps/web/app/(app)/navbar/ShortcutsMenu.tsx"
git commit -m "chore(ui): remove dead controls — reply, open procedure, lead note/open, dots menus, fake shortcut add

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Quick create bağlama (K1–K3, K10)

**Files:**
- Modify: `apps/web/app/(admin)/AdminNavbarTools.tsx` (`CREATE_ACTIONS`)
- Modify: `apps/web/app/(admin)/ui/SupportActions.tsx` (`NewSupportCaseButton`)
- Modify: `apps/web/app/(admin)/ui/KvkkActions.tsx` (`NewKvkkButton`)
- Modify: `apps/web/app/(admin)/admin/support/cases/page.tsx` (~74)
- Modify: `apps/web/app/(admin)/admin/support/queue/page.tsx` (~74)
- Modify: `apps/web/app/(admin)/admin/security/data-requests/page.tsx` (~70)

**Interfaces:** Buton bileşenlerinin props'u DEĞİŞMEZ (prop eklenmiyor; davranış içeriden `useSearchParams` ile geliyor).

- [ ] **Step 1: K3+K10 — CREATE_ACTIONS düzenle**

`AdminNavbarTools.tsx` içinde "New content draft" girdisini (href `/admin/growth/content/pages?new=1`) TAMAMEN sil; invoice girdisini şuna çevir:

```ts
{
  href: '/admin/orgs',
  label: 'Create invoice',
  detail: 'Pick the customer first — invoices are issued from the org page.',
  icon: 'tabler-file-dollar',
  tone: 'success',
},
```

- [ ] **Step 2: K1 — NewSupportCaseButton auto-open**

`SupportActions.tsx` import'larını genişlet: `useRouter` yanına `usePathname, useSearchParams` (`next/navigation`), `useState` yanına `useEffect` (`react`). `NewSupportCaseButton` gövdesinde state tanımlarından sonra ekle:

```tsx
/* Navbar'daki Quick create `?new=1` ile gelir (Dalga A, K1): diyaloğu aç
   ve parametreyi URL'den düşür — yenileme yeniden açmasın; navbar'dan
   ikinci tıklama parametreyi geri getirip effect'i yeniden tetiklesin. */
const pathname = usePathname();
const searchParams = useSearchParams();
useEffect(() => {
  if (searchParams.get('new') === '1') {
    setOpen(true);
    router.replace(pathname, { scroll: false });
  }
}, [searchParams, pathname, router]);
```

- [ ] **Step 3: K2 — NewKvkkButton aynı ekleme**

`KvkkActions.tsx`'te aynı import genişletmesi + `NewKvkkButton` gövdesine (state tanımlarından sonra) Step 2'deki effect bloğunun AYNISI (yorum satırında K1 yerine K2).

- [ ] **Step 4: Üç sayfada Suspense sarmalı**

`useSearchParams` Suspense sınırı ister (`(app)/app/guides/page.tsx` emsali; sınır yoksa `next build` prerender hatası verir). Üç sayfada da `import { Suspense } from 'react';` ekle ve `right={...}` içindeki butonu sar:

`admin/support/cases/page.tsx` ve `admin/support/queue/page.tsx`:

```tsx
right={
  <>
    <Suspense fallback={null}>
      <NewSupportCaseButton />
    </Suspense>
    <RefreshButton />
  </>
}
```

`admin/security/data-requests/page.tsx` (aynı desen, `NewKvkkButton` ile):

```tsx
right={
  <>
    <Suspense fallback={null}>
      <NewKvkkButton />
    </Suspense>
    <RefreshButton />
  </>
}
```

- [ ] **Step 5: Doğrula (build şart — Suspense hatasını yalnız build yakalar)**

Run: `npm run typecheck` → PASS.
Run: `DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder" npm run build -w apps/web` → hatasız biter; `missing-suspense-with-csr-bailout` uyarısı YOK.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/(admin)/AdminNavbarTools.tsx" "apps/web/app/(admin)/ui/SupportActions.tsx" "apps/web/app/(admin)/ui/KvkkActions.tsx" "apps/web/app/(admin)/admin/support/cases/page.tsx" "apps/web/app/(admin)/admin/support/queue/page.tsx" "apps/web/app/(admin)/admin/security/data-requests/page.tsx"
git commit -m "feat(admin-ui): wire quick-create — auto-open case/kvkk dialogs via ?new=1, honest invoice entry, drop content draft

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Müşteri destek repo modülü + ActivityEvent genişletmesi (TDD)

**Files:**
- Create: `apps/web/lib/repo/support.ts`
- Modify: `apps/web/lib/repo/activity.ts` (`ActivityType` birliği + `recordActivity.targetType`)
- Modify: `apps/web/app/(app)/activity-looks.ts` (`ACTIVITY_LOOKS` yeni girdi)
- Test: `apps/web/test/support-repo.test.ts`

**Interfaces:**
- Consumes: `primaryOrgId(userId): Promise<string|null>` (`lib/repo/senders.ts`) · `slaDueDate(from: Date, 'normal'): Date` (`lib/support-sla.ts`) · `recordActivity(input)` (`lib/repo/activity.ts`).
- Produces (Task 4 ve 5 bunlara yaslanır):

```ts
export const CUSTOMER_CASE_CATEGORIES = ['billing', 'builder', 'export', 'access', 'account'] as const;
export type CustomerCaseCategory = (typeof CUSTOMER_CASE_CATEGORIES)[number];
export type CustomerCaseStatus = 'open' | 'waiting_customer' | 'escalated' | 'resolved';
export type OpenCaseResult =
  | { ok: true; id: string; reference: string }
  | { ok: false; reason: 'no_org' | 'invalid_input' };
export interface CustomerCaseRow {
  id: string; reference: string; subject: string;
  category: CustomerCaseCategory; status: CustomerCaseStatus;
  createdAt: Date; updatedAt: Date;
}
export async function openSupportCase(
  userId: string,
  input: { subject: string; category: string; message: string },
): Promise<OpenCaseResult>;
export async function listOwnSupportCases(userId: string): Promise<CustomerCaseRow[] | null>;
```

- [ ] **Step 1: Başarısız testleri yaz** — `apps/web/test/support-repo.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Müşteri destek repo sözleşmesi (Dalga A, ticket v1): kapı = oturum + org
 * üyeliği · referans OTOMATİK (SUP-<yıl>-<sıra>, P2002'de +1 ile yeniden) ·
 * channel/priority sabit ('form'/'normal') · slaDueAt kod hesaplar ·
 * requesterEmail/org oturumdan · günlük yazılamazsa vaka YİNE açılır ·
 * listeleme yalnız kendi org'u.
 */

const membershipFindFirst = vi.fn();
const userFindUnique = vi.fn();
const orgFindUnique = vi.fn();
const caseCount = vi.fn();
const caseCreate = vi.fn();
const caseFindMany = vi.fn();
const activityCreate = vi.fn();

vi.mock('../lib/db', () => ({
  prisma: {
    membership: {
      findFirst: (...a: unknown[]) => membershipFindFirst(...a),
      findUnique: vi.fn(),
    },
    user: { findUnique: (...a: unknown[]) => userFindUnique(...a) },
    organization: { findUnique: (...a: unknown[]) => orgFindUnique(...a) },
    supportCase: {
      count: (...a: unknown[]) => caseCount(...a),
      create: (...a: unknown[]) => caseCreate(...a),
      findMany: (...a: unknown[]) => caseFindMany(...a),
    },
    activityEvent: { create: (...a: unknown[]) => activityCreate(...a) },
  },
}));

const support = await import('../lib/repo/support');

const NOW = new Date(Date.UTC(2026, 7, 24, 9, 0));
const VALID = { subject: 'Export fails', category: 'export', message: 'Copy button does nothing.' };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
  membershipFindFirst.mockResolvedValue({ orgId: 'org1' });
  userFindUnique.mockResolvedValue({ email: 'owner@acme.com' });
  orgFindUnique.mockResolvedValue({ name: 'Acme' });
  caseCount.mockResolvedValue(6);
  caseCreate.mockImplementation(async (args: { data: { reference: string } }) => ({
    id: 'case1',
    reference: args.data.reference,
  }));
  activityCreate.mockResolvedValue({});
});

afterEach(() => {
  vi.useRealTimers();
});

const p2002 = () => Object.assign(new Error('dup'), { code: 'P2002' });

describe('openSupportCase', () => {
  it('org üyeliği yoksa no_org döner, hiçbir yazma olmaz', async () => {
    membershipFindFirst.mockResolvedValue(null);
    const r = await support.openSupportCase('u1', VALID);
    expect(r).toEqual({ ok: false, reason: 'no_org' });
    expect(caseCreate).not.toHaveBeenCalled();
    expect(activityCreate).not.toHaveBeenCalled();
  });

  it.each([
    ['boş konu', { ...VALID, subject: '   ' }],
    ['boş mesaj', { ...VALID, message: '' }],
    ['geçersiz kategori', { ...VALID, category: 'weird' }],
  ])('%s → invalid_input', async (_name, input) => {
    const r = await support.openSupportCase('u1', input);
    expect(r).toEqual({ ok: false, reason: 'invalid_input' });
    expect(caseCreate).not.toHaveBeenCalled();
  });

  it('vakayı sabitler ve oturum verisiyle açar; referans sayımdan türer', async () => {
    const r = await support.openSupportCase('u1', VALID);
    expect(r).toEqual({ ok: true, id: 'case1', reference: 'SUP-2026-0007' });
    const data = caseCreate.mock.calls[0][0].data;
    expect(data).toMatchObject({
      reference: 'SUP-2026-0007',
      subject: 'Export fails',
      orgId: 'org1',
      orgName: 'Acme',
      requesterEmail: 'owner@acme.com',
      channel: 'form',
      category: 'export',
      priority: 'normal',
      summary: 'Copy button does nothing.',
    });
    // SLA: normal = 48 saat, now'dan.
    expect(data.slaDueAt).toEqual(new Date(NOW.getTime() + 48 * 60 * 60 * 1000));
  });

  it('konu/mesaj kırpılır ve sınırlanır (200/500)', async () => {
    await support.openSupportCase('u1', {
      ...VALID,
      subject: `  ${'a'.repeat(300)}  `,
      message: 'b'.repeat(600),
    });
    const data = caseCreate.mock.calls[0][0].data;
    expect(data.subject).toBe('a'.repeat(200));
    expect(data.summary).toBe('b'.repeat(500));
  });

  it('P2002 çakışmasında sırayı +1 artırıp yeniden dener', async () => {
    caseCreate.mockRejectedValueOnce(p2002());
    const r = await support.openSupportCase('u1', VALID);
    expect(r.ok).toBe(true);
    expect(caseCreate.mock.calls[0][0].data.reference).toBe('SUP-2026-0007');
    expect(caseCreate.mock.calls[1][0].data.reference).toBe('SUP-2026-0008');
  });

  it('5 çakışmada pes eder ve fırlatır', async () => {
    caseCreate.mockRejectedValue(p2002());
    await expect(support.openSupportCase('u1', VALID)).rejects.toThrow();
    expect(caseCreate).toHaveBeenCalledTimes(5);
  });

  it('P2002 olmayan hata aynen fırlar, yeniden denenmez', async () => {
    caseCreate.mockRejectedValue(new Error('db down'));
    await expect(support.openSupportCase('u1', VALID)).rejects.toThrow('db down');
    expect(caseCreate).toHaveBeenCalledTimes(1);
  });

  it("org günlüğüne support.case_opened düşer", async () => {
    await support.openSupportCase('u1', VALID);
    expect(activityCreate).toHaveBeenCalledTimes(1);
    expect(activityCreate.mock.calls[0][0].data).toMatchObject({
      orgId: 'org1',
      actorUserId: 'u1',
      type: 'support.case_opened',
      targetType: 'support',
      targetId: 'case1',
      payload: { reference: 'SUP-2026-0007', subject: 'Export fails', category: 'export' },
    });
  });

  it('günlük yazılamazsa vaka yine açılır (recordActivity yutar)', async () => {
    activityCreate.mockRejectedValue(new Error('ledger down'));
    const r = await support.openSupportCase('u1', VALID);
    expect(r.ok).toBe(true);
  });
});

describe('listOwnSupportCases', () => {
  it('org yoksa null', async () => {
    membershipFindFirst.mockResolvedValue(null);
    expect(await support.listOwnSupportCases('u1')).toBeNull();
    expect(caseFindMany).not.toHaveBeenCalled();
  });

  it('yalnız kendi org’unu, yeniden eskiye, 50 tavanla sorgular', async () => {
    caseFindMany.mockResolvedValue([
      {
        id: 'c1', reference: 'SUP-2026-0007', subject: 'Export fails',
        category: 'export', status: 'open',
        createdAt: NOW, updatedAt: NOW,
      },
    ]);
    const rows = await support.listOwnSupportCases('u1');
    expect(caseFindMany.mock.calls[0][0]).toMatchObject({
      where: { orgId: 'org1' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    expect(rows).toEqual([
      {
        id: 'c1', reference: 'SUP-2026-0007', subject: 'Export fails',
        category: 'export', status: 'open',
        createdAt: NOW, updatedAt: NOW,
      },
    ]);
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npm test -w apps/web -- test/support-repo.test.ts`
Expected: FAIL — `Cannot find module '../lib/repo/support'` (ya da eşdeğeri).

- [ ] **Step 3: `ActivityType` genişlet** — `apps/web/lib/repo/activity.ts`:

Birliğin sonuna (`'support.invoice_status_changed'`den sonra) ekle:

```ts
  /* Müşterinin kendi açtığı destek vakası (ticket v1) — kanal 'form'. */
  | 'support.case_opened';
```

`recordActivity` input'undaki `targetType` birliğine `'support'` ekle:

```ts
targetType?: 'sender' | 'signature' | 'member' | 'invitation' | 'brand' | 'export' | 'support';
```

- [ ] **Step 4: `ACTIVITY_LOOKS` girdisi** — `apps/web/app/(app)/activity-looks.ts`, `'support.invoice_status_changed'` girdisinden sonra (Record<ActivityType,…> olduğundan eklenmezse typecheck kırılır — bilerek):

```ts
  'support.case_opened': {
    icon: 'tabler-headset',
    tone: 'info',
    title: 'Support case opened',
    body: (p) => `Case ${str(p.reference, '?')} was opened — ${str(p.subject, 'no subject')}.`,
  },
```

- [ ] **Step 5: `lib/repo/support.ts` yaz**

```ts
import { prisma } from '../db';
import { slaDueDate } from '../support-sla';
import { recordActivity } from './activity';
import { primaryOrgId } from './senders';

/**
 * MÜŞTERİ destek yazmaları (ticket v1, spec 2026-08-24). `admin.ts`e
 * bilerek girmez: oradaki numaralandırma testi her export'tan PERSONEL
 * kapısı bekler; buradaki kapı oturum + org üyeliğidir. Personel
 * sözleşmesi (AdminAction/StaffAccess) müşteri yazması için geçerli
 * değil — org'un kendi günlüğüne `ActivityEvent` düşülür.
 *
 * Panel içi yazışma YOK (v2 migration işi) — mesaj `summary`ye yazılır,
 * yanıt e-postayla döner.
 */

export const CUSTOMER_CASE_CATEGORIES = ['billing', 'builder', 'export', 'access', 'account'] as const;
export type CustomerCaseCategory = (typeof CUSTOMER_CASE_CATEGORIES)[number];

export type CustomerCaseStatus = 'open' | 'waiting_customer' | 'escalated' | 'resolved';

export type OpenCaseResult =
  | { ok: true; id: string; reference: string }
  | { ok: false; reason: 'no_org' | 'invalid_input' };

export interface CustomerCaseRow {
  id: string;
  reference: string;
  subject: string;
  category: CustomerCaseCategory;
  status: CustomerCaseStatus;
  createdAt: Date;
  updatedAt: Date;
}

const LIST_LIMIT = 50;
/** P2002 yarışında kaç sıra denenir — sonsuz döngü emniyeti. */
const REFERENCE_ATTEMPTS = 5;

export async function openSupportCase(
  userId: string,
  input: { subject: string; category: string; message: string },
): Promise<OpenCaseResult> {
  const subject = input.subject.trim().slice(0, 200);
  const message = input.message.trim().slice(0, 500);
  const category = input.category as CustomerCaseCategory;
  if (!subject || !message || !CUSTOMER_CASE_CATEGORIES.includes(category)) {
    return { ok: false, reason: 'invalid_input' };
  }

  const orgId = await primaryOrgId(userId);
  if (!orgId) return { ok: false, reason: 'no_org' };

  const [user, org] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
  ]);
  if (!user || !org) return { ok: false, reason: 'no_org' };

  const now = new Date();
  const prefix = `SUP-${now.getFullYear()}-`;
  const existing = await prisma.supportCase.count({
    where: { reference: { startsWith: prefix } },
  });

  let created: { id: string; reference: string } | null = null;
  for (let attempt = 0; attempt < REFERENCE_ATTEMPTS && !created; attempt++) {
    const reference = `${prefix}${String(existing + 1 + attempt).padStart(4, '0')}`;
    try {
      created = await prisma.supportCase.create({
        data: {
          reference,
          subject,
          orgId,
          orgName: org.name,
          requesterEmail: user.email,
          channel: 'form',
          // Müşteriye sorulmaz — staff panelden yükseltir (onaylı kapsam).
          priority: 'normal',
          slaDueAt: slaDueDate(now, 'normal'),
          summary: message,
        },
        select: { id: true, reference: true },
      });
    } catch (err) {
      // Duck-typing (admin createSupportCase emsali): yarışta aynı sıra
      // üretilmiş olabilir — bir sonrakiyle yeniden dene.
      if ((err as { code?: string })?.code !== 'P2002') throw err;
    }
  }
  if (!created) throw new Error('Referans üretilemedi — art arda çakışma.');

  // Transaction dışı ve hata yutar — günlük yüzünden vaka açma devrilmez.
  await recordActivity({
    orgId,
    actorUserId: userId,
    type: 'support.case_opened',
    targetType: 'support',
    targetId: created.id,
    payload: { reference: created.reference, subject, category },
  });

  return { ok: true, id: created.id, reference: created.reference };
}

export async function listOwnSupportCases(userId: string): Promise<CustomerCaseRow[] | null> {
  const orgId = await primaryOrgId(userId);
  if (!orgId) return null;

  const rows = await prisma.supportCase.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    take: LIST_LIMIT,
    select: {
      id: true,
      reference: true,
      subject: true,
      category: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return rows.map((r) => ({
    ...r,
    category: r.category as CustomerCaseCategory,
    status: r.status as CustomerCaseStatus,
  }));
}
```

- [ ] **Step 6: Testler geçsin**

Run: `npm test -w apps/web -- test/support-repo.test.ts`
Expected: PASS (12 test).

- [ ] **Step 7: Tüm takım + typecheck**

Run: `npm run typecheck` → PASS (ACTIVITY_LOOKS girdisi unutulduysa burada kırılır).
Run: `npm test -w apps/web` → tümü PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/repo/support.ts apps/web/lib/repo/activity.ts "apps/web/app/(app)/activity-looks.ts" apps/web/test/support-repo.test.ts
git commit -m "feat(support): customer support repo — auto reference, fixed priority/SLA, org activity event

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `POST /api/support` ucu (TDD)

**Files:**
- Create: `apps/web/app/api/support/route.ts`
- Test: `apps/web/test/api-customer-support-route.test.ts`

**Interfaces:**
- Consumes: `openSupportCase(userId, { subject, category, message })` (Task 3) · `currentSession()` (`lib/auth/current`) · `field/json/readJsonBody` (`app/api/auth/_shared`).
- Produces: `POST /api/support` — gövde `{ subject, category, message }`; cevaplar: 401 `{error:'unauthenticated'}` · 403 `{error:'no_org'}` · 400 `{error:'invalid_input'}` · 200 `{ ok: true, reference }`. Task 5 formu buna POST atar.

- [ ] **Step 1: Başarısız route testini yaz** — `apps/web/test/api-customer-support-route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Route seviyesinde smoke — HTTP gövdesinden repo çağrısına tip çevirisi
 * (api-support-route emsali). Repo davranışı support-repo.test.ts'te.
 */

const openSupportCase = vi.fn();

vi.mock('../lib/repo/support', () => ({
  openSupportCase: (...args: unknown[]) => openSupportCase(...args),
}));

let session: { user: { id: string } } | null = null;

vi.mock('../lib/auth/current', () => ({
  currentSession: async () => session,
}));

const { POST } = await import('../app/api/support/route');

function jsonReq(body: unknown): Request {
  return new Request('http://test.local/api/support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  session = { user: { id: 'u1' } };
  openSupportCase.mockResolvedValue({ ok: true, id: 'case1', reference: 'SUP-2026-0007' });
});

describe('POST /api/support', () => {
  it('oturumsuz 401, repo hiç çağrılmaz', async () => {
    session = null;
    const res = await POST(jsonReq({ subject: 'x', category: 'billing', message: 'y' }));
    expect(res.status).toBe(401);
    expect(openSupportCase).not.toHaveBeenCalled();
  });

  it('gövdeyi repo argümanlarına çevirir ve referans döner', async () => {
    const res = await POST(jsonReq({ subject: 'Export fails', category: 'export', message: 'Nothing copies.' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, reference: 'SUP-2026-0007' });
    expect(openSupportCase).toHaveBeenCalledWith('u1', {
      subject: 'Export fails',
      category: 'export',
      message: 'Nothing copies.',
    });
  });

  it('string olmayan alanlar boş stringe düşer (field sözleşmesi)', async () => {
    openSupportCase.mockResolvedValue({ ok: false, reason: 'invalid_input' });
    const res = await POST(jsonReq({ subject: 42, category: null, message: ['x'] }));
    expect(res.status).toBe(400);
    expect(openSupportCase).toHaveBeenCalledWith('u1', { subject: '', category: '', message: '' });
  });

  it('no_org 403 olur', async () => {
    openSupportCase.mockResolvedValue({ ok: false, reason: 'no_org' });
    const res = await POST(jsonReq({ subject: 'x', category: 'billing', message: 'y' }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'no_org' });
  });

  it('invalid_input 400 olur', async () => {
    openSupportCase.mockResolvedValue({ ok: false, reason: 'invalid_input' });
    const res = await POST(jsonReq({ subject: '', category: 'billing', message: '' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_input' });
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npm test -w apps/web -- test/api-customer-support-route.test.ts`
Expected: FAIL — `Cannot find module '../app/api/support/route'` (ya da eşdeğeri).

- [ ] **Step 3: Route'u yaz** — `apps/web/app/api/support/route.ts`:

```ts
import { currentSession } from '../../../lib/auth/current';
import { openSupportCase } from '../../../lib/repo/support';
import { field, json, readJsonBody } from '../auth/_shared';

/**
 * Müşteri ticket v1 — ince uç (senders emsali): gövdeyi oku, repo'yu
 * çağır, sonucu statüye çevir. Kapı ve doğrulama repo'da. Listeleme için
 * GET yok — sayfa sunucu tarafında repo'dan okur.
 */
export async function POST(req: Request): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const body = await readJsonBody(req);
  const result = await openSupportCase(session.user.id, {
    subject: field(body, 'subject'),
    category: field(body, 'category'),
    message: field(body, 'message'),
  });

  if (!result.ok) {
    return json(result.reason === 'no_org' ? 403 : 400, { error: result.reason });
  }
  return json(200, { ok: true, reference: result.reference });
}
```

- [ ] **Step 4: Testler geçsin**

Run: `npm test -w apps/web -- test/api-customer-support-route.test.ts`
Expected: PASS (5 test).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/support/route.ts apps/web/test/api-customer-support-route.test.ts
git commit -m "feat(api): POST /api/support — customer opens a case for own org

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: `/app/support` sayfası + panel menüsü

**Files:**
- Create: `apps/web/app/(app)/app/support/support-labels.ts`
- Create: `apps/web/app/(app)/app/support/NewTicketForm.tsx`
- Create: `apps/web/app/(app)/app/support/page.tsx`
- Modify: `apps/web/app/(app)/PanelShell.tsx` (MENU, Tools bölümü)

**Interfaces:**
- Consumes: `listOwnSupportCases`, `CustomerCaseCategory`, `CustomerCaseStatus` (Task 3) · `POST /api/support` (Task 4) · `currentSession` · `useToast` (`(app)/ToastProvider`).
- Produces: `/app/support` rotası; menüde `Support` girdisi.

- [ ] **Step 1: `support-labels.ts`** (saf veri — hem sunucu sayfası hem istemci formu kullanır):

```ts
import type { CustomerCaseCategory, CustomerCaseStatus } from '../../../../lib/repo/support';

/**
 * Ticket v1 etiketleri. Durumun MÜŞTERİ dili dürüst ama iç jargonsuz:
 * `escalated` müşteriye "In progress" — vaka işleniyor gerçeği söylenir,
 * iç eskalasyon mutfağı anlatılmaz (spec §2.4).
 */
export const TICKET_CATEGORIES: ReadonlyArray<{ value: CustomerCaseCategory; label: string }> = [
  { value: 'billing', label: 'Billing' },
  { value: 'builder', label: 'Builder' },
  { value: 'export', label: 'Export' },
  { value: 'access', label: 'Access' },
  { value: 'account', label: 'Account' },
];

export const CASE_STATUS_LOOKS: Record<CustomerCaseStatus, { label: string; tone: string }> = {
  open: { label: 'Open', tone: 'info' },
  waiting_customer: { label: 'Awaiting your reply', tone: 'warning' },
  escalated: { label: 'In progress', tone: 'primary' },
  resolved: { label: 'Resolved', tone: 'success' },
};
```

- [ ] **Step 2: `NewTicketForm.tsx`** (istemci; `AddSenderForm`/`SupportActions` form deseni):

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useToast } from '../../ToastProvider';
import { TICKET_CATEGORIES } from './support-labels';

/**
 * Vaka açma formu — öncelik SORULMAZ ('normal' sabit, staff panelden
 * yükseltir); org + e-posta oturumdan gelir, kullanıcı yazmaz (onaylı
 * kapsam). Başarıda referans toast'ta söylenir, liste refresh'le tazelenir.
 */
export function NewTicketForm() {
  const router = useRouter();
  const toast = useToast();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<(typeof TICKET_CATEGORIES)[number]['value']>('billing');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, category, message }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Could not open the case — check the fields and try again.');
      return;
    }
    const data = (await res.json()) as { reference?: string };
    toast('success', `Case ${data.reference ?? ''} opened. We'll reply by email.`);
    setSubject('');
    setCategory('billing');
    setMessage('');
    router.refresh();
  };

  return (
    <form className="row g-4" onSubmit={submit}>
      <div className="col-12">
        <label className="form-label" htmlFor="ticketSubject">
          Subject <span className="text-danger">*</span>
        </label>
        <input
          id="ticketSubject"
          className="form-control"
          maxLength={200}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
      </div>
      <div className="col-12">
        <label className="form-label" htmlFor="ticketCategory">Category</label>
        <select
          id="ticketCategory"
          className="form-select"
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
        >
          {TICKET_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div className="col-12">
        <label className="form-label" htmlFor="ticketMessage">
          Message <span className="text-danger">*</span>
        </label>
        <textarea
          id="ticketMessage"
          className="form-control"
          rows={4}
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <small className="text-body-secondary">{message.length}/500</small>
      </div>
      {error && (
        <div className="col-12">
          <div className="alert alert-danger mb-0" role="alert">{error}</div>
        </div>
      )}
      <div className="col-12">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />}
          Open case
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: `page.tsx`** (sunucu; senders/activity sayfa deseni):

```tsx
import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { listOwnSupportCases } from '../../../../lib/repo/support';
import { NewTicketForm } from './NewTicketForm';
import { CASE_STATUS_LOOKS, TICKET_CATEGORIES } from './support-labels';

export const metadata = { title: 'Support — Mailmyra' };

/**
 * Müşteri ticket v1 (spec 2026-08-24). Panel içi yazışma YOK — yanıt
 * e-postayla döner ve sayfa bunu açıkça söyler. Liste sunucu tarafında
 * repo'dan (GET ucu yok, senders emsali); başka org'un vakası sorguya
 * zaten giremez.
 */
export default async function SupportPage() {
  // Layout korumasına GÜVENME (paralel render — canlıda 500 görüldü, 2026-08-11).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/support');

  const cases = await listOwnSupportCases(session.user.id);

  if (cases === null) {
    return (
      <section>
        <h4 className="mb-4">Support</h4>
        <div className="card">
          <div className="card-body text-center py-5">
            <div className="avatar avatar-lg mx-auto mb-3">
              <span className="avatar-initial rounded-circle bg-label-secondary">
                <i className="icon-base ti tabler-headset icon-26px" aria-hidden="true" />
              </span>
            </div>
            <h5>No workspace yet</h5>
            <p className="text-body-secondary mb-0">
              Join or create a workspace to open a support case.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const categoryLabel = (value: string) =>
    TICKET_CATEGORIES.find((c) => c.value === value)?.label ?? value;

  return (
    <section>
      <h4 className="mb-1">Support</h4>
      <p className="text-body-secondary mb-4">
        Replies arrive by email — this page tracks case status.
      </p>

      <div className="row g-6">
        <div className="col-lg-5">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Open a support case</h5>
            </div>
            <div className="card-body">
              <NewTicketForm />
            </div>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Your cases</h5>
            </div>
            {cases.length ? (
              <div className="table-responsive text-nowrap">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Subject</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Opened</th>
                    </tr>
                  </thead>
                  <tbody className="table-border-bottom-0">
                    {cases.map((row) => {
                      const status = CASE_STATUS_LOOKS[row.status];
                      return (
                        <tr key={row.id}>
                          <td><code>{row.reference}</code></td>
                          <td className="text-heading">{row.subject}</td>
                          <td>{categoryLabel(row.category)}</td>
                          <td>
                            <span className={`badge bg-label-${status.tone}`}>{status.label}</span>
                          </td>
                          <td>
                            {row.createdAt.toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card-body text-center py-5">
                <p className="text-body-secondary mb-0">No support cases yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Menü girdisi** — `PanelShell.tsx` MENU dizisinde `Setup guides` satırından HEMEN sonra (builder girdisinden önce):

```ts
  { type: 'item', href: '/app/support', label: 'Support', icon: 'tabler-headset' },
```

- [ ] **Step 5: Doğrula**

Run: `npm run typecheck` → PASS.
Run: `DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder" npm run build -w apps/web` → hatasız; rota listesinde `/app/support` ve `/api/support` görünür.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/(app)/app/support" "apps/web/app/(app)/PanelShell.tsx"
git commit -m "feat(app): Support page — open-case form, own-org case list, menu entry

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Tam doğrulama

**Files:** Yok (yalnız komut koşar; bulgu çıkarsa ana oturuma raporlanır).

- [ ] **Step 1:** `npm run typecheck` → PASS.
- [ ] **Step 2:** `npm test` (kök — tüm workspaces) → tümü PASS; toplamın önceki tabana (1176) yeni testler kadar arttığını raporla.
- [ ] **Step 3:** `DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder" npm run build -w apps/web` → hatasız; build kimliğini raporla.
- [ ] **Step 4:** Kalıntı taraması: `grep -rn "content/pages?new=1\|Open procedure\|dropdown-shortcuts-add" apps/web/app/` → çıktı YOK.
- [ ] **Step 5:** Commit YOK (değişiklik üretmez). Sonuçları rapor et.

---

## Self-Review Notu

- Spec kapsaması: K1–K11 → Task 1-2 · repo/API/sayfa/menü → Task 3-5 · doğrulama → Task 6. Spec'in "açık karar bayrakları" plana iş üretmez (Hüseyin'e rapor edilecek).
- Tip tutarlılığı: `CustomerCaseCategory/Status/Row`, `openSupportCase`, `listOwnSupportCases` adları Task 3'te tanımlı, Task 4-5 aynı adları kullanıyor.
- Dev sunucu görsel doğrulaması worktree'de env yoksa atlanabilir — test+build kanıtı yeterli, canlı duman Hüseyin ritüelinde (spec §2.7).
