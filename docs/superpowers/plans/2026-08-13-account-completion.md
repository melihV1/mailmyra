# Account Completion + Legal Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the panel's last gaps: plan box, e-mail change (verify new + notify old), two-stage account deletion (full cleanup incl. CDN files), and the three legal pages with drafts.

**Architecture:** Flows in `lib/auth` (change-email beside the existing verify/reset patterns in `flows.ts`; deletion beside password change in `account.ts` using core's `canRemoveMember`), thin POST routes, UI additions on the existing Account screen, `legal-links.ts` as the single legal source.

**Tech Stack:** Next.js App Router · Prisma/MariaDB (migration: `email_change` enum + `EmailToken.newEmail`) · nodemailer abstraction (`Mailer`).

Spec: `docs/superpowers/specs/2026-08-13-account-completion-design.md`

## Global Constraints

- npm only · API mutations POST only (IIS) · no native modules.
- Panel copy **English**; code comments Turkish, repo style.
- Legal pages: `/kvkk` **Turkish**, `/terms` + `/privacy` **English**; every draft carries a visible "lawyer review required before launch" note (EN pages in English, KVKK page in Turkish).
- Deletion is FULL cleanup per Hüseyin's decision: CDN files unlinked best-effort, asset rows explicitly deleted, org + user cascade. `LegalAcceptance` survives null-linked.
- Unit tests: `apps/web` → `npx vitest run test/<file>`. DB tests: `npx vitest run --config vitest.db.config.ts test-db/<file>`. Typecheck from root.
- Migration (local): `npx prisma migrate dev --name email-change-token` from `apps/web`.
- Commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Schema — `email_change` token type + `newEmail` column

**Files:**
- Modify: `apps/web/prisma/schema.prisma`
- Create: migration via `npx prisma migrate dev --name email-change-token`

**Interfaces:**
- Produces: `EmailTokenType.email_change`; `EmailToken.newEmail: String?` — Task 3 reads/writes both.

- [ ] **Step 1:** `enum EmailTokenType` gains `email_change` as the last value; `model EmailToken` gains, next to `type`:

```prisma
  /// Yalnız email_change: bekleyen yeni adres token'da durur, kullanıcıda
  /// değil — onaylanmamış adres hesabın hiçbir yerine sızmaz.
  newEmail String? @db.VarChar(255)
```

- [ ] **Step 2:** Run (cwd `apps/web`): `npx prisma migrate dev --name email-change-token` → new migration folder; run `npx prisma generate` if the client looks stale.

- [ ] **Step 3:** `npm run typecheck` (root) → 0 · `npm run test:db` → all pass (no behavior change yet).

- [ ] **Step 4: Commit**

```bash
git add apps/web/prisma
git commit -m "feat(auth): email_change token type with a pending-address column"
```

---

### Task 2: Mail templates — change-verify + changed-notice (TDD)

**Files:**
- Modify: `apps/web/lib/mail/templates/index.ts`, `apps/web/lib/mail/index.ts` (re-exports)
- Test: `apps/web/test/mail-templates.test.ts`

**Interfaces:**
- Produces: `emailChangeVerifyEmail({ actionUrl }: ActionInput): MailBody` · `emailChangedNoticeEmail({ actionUrl, newEmail }: ActionInput & { newEmail: string }): MailBody`. Task 3 sends both.

- [ ] **Step 1: Failing tests.** In `mail-templates.test.ts`: add both to the structural `all` list (they carry an actionUrl) and `emailChangeVerifyEmail` to the `expiring` list (24h). Plus a dedicated describe:

```ts
const URL_CHANGE = 'https://app.mailmyra.com/confirm-email-change?token=jkl012';
const URL_APP = 'https://app.mailmyra.com';

// `all` listesine:
//   ['email-change verify', emailChangeVerifyEmail({ actionUrl: URL_CHANGE }), URL_CHANGE],
//   ['email-changed notice', emailChangedNoticeEmail({ actionUrl: URL_APP, newEmail: 'yeni@voldi.net' }), URL_APP],
// `expiring` listesine:
//   ['email-change verify', emailChangeVerifyEmail({ actionUrl: URL_CHANGE })],

describe('the email-change pair', () => {
  it('the notice names the new address in both bodies', () => {
    const mail = emailChangedNoticeEmail({ actionUrl: URL_APP, newEmail: 'yeni@voldi.net' });
    expect(mail.html).toContain('yeni@voldi.net');
    expect(mail.text).toContain('yeni@voldi.net');
  });

  it('the notice tells the reader what to do if it was not them', () => {
    // Eski adres sahibinin tek savunma anı bu mail — kaçış yolu yazılı olmalı.
    expect(emailChangedNoticeEmail({ actionUrl: URL_APP, newEmail: 'x@voldi.net' }).text.toLowerCase())
      .toContain('contact us');
  });

  it('the verify mail makes clear nothing changes until confirmed', () => {
    expect(emailChangeVerifyEmail({ actionUrl: URL_CHANGE }).text.toLowerCase()).toContain('nothing changes');
  });
});
```

Run: `npx vitest run test/mail-templates.test.ts` → FAIL (functions missing).

- [ ] **Step 2: Implement** in `templates/index.ts` (repo idiom; escape user-supplied `newEmail` in HTML):

```ts
export function emailChangeVerifyEmail({ actionUrl }: ActionInput): MailBody {
  return {
    subject: 'Confirm your new e-mail address',
    html: renderLayout({
      heading: 'Confirm your new address',
      paragraphs: [
        'You asked to move your Mailmyra account to this address. Confirm it and the switch is done.',
      ],
      actionUrl,
      actionLabel: 'Confirm new address',
      footnote:
        'This link is good for 24 hours. If you did not ask for this change, ignore this message — nothing changes.',
    }),
    text: renderText(
      [
        'Confirm your new address',
        '',
        'You asked to move your Mailmyra account to this address. Confirm it and the switch is done.',
      ],
      actionUrl,
      'This link is good for 24 hours. If you did not ask for this change, ignore this message — nothing changes.',
    ),
  };
}

export interface ChangedNoticeInput extends ActionInput {
  newEmail: string;
}

export function emailChangedNoticeEmail({ actionUrl, newEmail }: ChangedNoticeInput): MailBody {
  const contact = 'If you did not make this change, contact us immediately.';
  return {
    subject: 'Your Mailmyra e-mail address was changed',
    html: renderLayout({
      heading: 'Your e-mail address was changed',
      paragraphs: [
        `Your Mailmyra account now signs in with <strong>${escapeHtml(newEmail)}</strong>. This address no longer has access.`,
      ],
      actionUrl,
      actionLabel: 'Open Mailmyra',
      footnote: contact,
    }),
    text: renderText(
      [
        'Your e-mail address was changed',
        '',
        `Your Mailmyra account now signs in with ${newEmail}. This address no longer has access.`,
      ],
      actionUrl,
      contact,
    ),
  };
}
```

Re-export both from `lib/mail/index.ts`.

- [ ] **Step 3:** `npx vitest run test/mail-templates.test.ts` → PASS · full `npx vitest run` → pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/mail apps/web/test/mail-templates.test.ts
git commit -m "feat(mail): e-mail change verification and notice templates"
```

---

### Task 3: Flows — request + confirm e-mail change (DB tests)

**Files:**
- Modify: `apps/web/lib/auth/flows.ts`
- Test: `apps/web/test-db/account.test.ts` (READ its existing helpers first; extend, don't restructure)

**Interfaces:**
- Consumes: `verifyPassword` (`lib/auth/password.ts`), `newSessionToken`/`hashToken`, `normalizeEmail`/`EMAIL_SHAPE`/`appUrl`/`issueEmailToken`-style patterns already inside `flows.ts` (mirror `register`/`verifyEmailToken`), templates from Task 2.
- Produces:
  ```ts
  requestEmailChange(userId: string, input: { newEmail: string; password: string }, mailer: Mailer):
    Promise<{ ok: true } | { ok: false; reason: 'invalid_email' | 'email_taken' | 'invalid_credentials' }>
  confirmEmailChange(token: string, mailer: Mailer):
    Promise<{ ok: true } | { ok: false; reason: 'invalid_token' | 'email_taken' }>
  ```

- [ ] **Step 1: Failing DB tests.** In `test-db/account.test.ts` (its setup creates users via `register` — reuse; a `MemoryMailer` exists or add one per file idiom). Cases, with the intent code:

```ts
describe('requestEmailChange', () => {
  test('sends a 24h verification to the NEW address and changes nothing yet', async () => {
    // kayıt → requestEmailChange(user, {newEmail:'yeni@voldi.net', password: DOĞRU}) → ok
    // mailer.sent son maili: to === 'yeni@voldi.net'; user.email hâlâ eski;
    // emailToken satırı: type 'email_change', newEmail 'yeni@voldi.net'
  });
  test('refuses the wrong password', async () => { /* invalid_credentials; mail yok */ });
  test('refuses a malformed or same address', async () => { /* 'yeni@' ve mevcut adres → invalid_email */ });
  test('refuses an address another account holds', async () => { /* ikinci kayıt → email_taken */ });
});

describe('confirmEmailChange', () => {
  test('switches the address, refreshes verification, notifies the old one', async () => {
    // token linkten ayıklanır (auth-flows.test.ts'teki linkFromLastMail deseni);
    // confirm → ok; user.email yeni; emailVerifiedAt not null;
    // mailer.sent SON maili eski adrese ve yeni adresi içeriyor
  });
  test('a used or foreign token is invalid', async () => { /* ikinci tüketim → invalid_token */ });
  test('loses the race if the address was taken meanwhile', async () => {
    // request A→x@; sonra x@ ile ÜÇÜNCÜ hesap kaydolur; confirm → email_taken; A.email değişmedi
  });
  test('a broken notice mailer does not undo the switch', async () => {
    // confirm'e kırık mailer ver: ok dönmeli, email değişmeli, console.error spy çağrılmalı
  });
});
```

Write them as REAL tests with the file's actual helpers; run → FAIL (functions missing).

- [ ] **Step 2: Implement** in `flows.ts` (mirror the file's own idioms — `EMAIL_SHAPE`, `normalizeEmail`, token issuing, `appUrl`):

```ts
const EMAIL_CHANGE_TTL_MS = 24 * 60 * 60 * 1000; // doğrulama ile aynı süre

export type EmailChangeRequestResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_email' | 'email_taken' | 'invalid_credentials' };

export async function requestEmailChange(
  userId: string,
  input: { newEmail: string; password: string },
  mailer: Mailer,
): Promise<EmailChangeRequestResult> {
  const email = normalizeEmail(input.newEmail);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  // Adres hesabın anahtarı — değişiklik yeniden kimlik doğrulaması ister.
  if (!(await verifyPassword(input.password, user.passwordHash))) {
    return { ok: false, reason: 'invalid_credentials' };
  }
  if (!EMAIL_SHAPE.test(email) || email === user.email) {
    return { ok: false, reason: 'invalid_email' };
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    return { ok: false, reason: 'email_taken' };
  }

  const token = newSessionToken();
  await prisma.emailToken.create({
    data: {
      userId,
      type: 'email_change',
      newEmail: email,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + EMAIL_CHANGE_TTL_MS),
    },
  });
  await mailer.send({
    to: email,
    ...emailChangeVerifyEmail({ actionUrl: `${appUrl()}/confirm-email-change?token=${token}` }),
  });
  return { ok: true };
}

export type EmailChangeConfirmResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_token' | 'email_taken' };

export async function confirmEmailChange(
  token: string,
  mailer: Mailer,
): Promise<EmailChangeConfirmResult> {
  const record = await prisma.emailToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (
    !record ||
    record.type !== 'email_change' ||
    !record.newEmail ||
    record.usedAt ||
    record.expiresAt <= new Date()
  ) {
    return { ok: false, reason: 'invalid_token' };
  }
  // Yarış: adres istekle onay arasında başkasına gitmiş olabilir.
  const holder = await prisma.user.findUnique({ where: { email: record.newEmail } });
  if (holder && holder.id !== record.userId) return { ok: false, reason: 'email_taken' };

  const before = await prisma.user.findUniqueOrThrow({ where: { id: record.userId } });
  await prisma.$transaction([
    prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({
      where: { id: record.userId },
      // Yeni adres az önce kanıtlandı — doğrulama damgası tazelenir.
      data: { email: record.newEmail, emailVerifiedAt: new Date() },
    }),
  ]);

  // Eski adresin tek savunma anı. Arıza değişikliği geri almaz, sessiz de kalmaz.
  try {
    await mailer.send({
      to: before.email,
      ...emailChangedNoticeEmail({ actionUrl: appUrl(), newEmail: record.newEmail }),
    });
  } catch (error) {
    console.error('[mail] adres-değişti bilgilendirmesi gönderilemedi:', error);
  }
  return { ok: true };
}
```

Add the needed imports (`verifyPassword`, both templates).

- [ ] **Step 3:** `npx vitest run --config vitest.db.config.ts test-db/account.test.ts` → PASS · full `npm run test:db` + typecheck → green.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/auth/flows.ts apps/web/test-db/account.test.ts
git commit -m "feat(auth): e-mail change flow — verify the new address, notify the old"
```

---

### Task 4: Deletion flow — `deleteAccount` (DB tests)

**Files:**
- Modify: `apps/web/lib/auth/account.ts` (password change lives here — deletion joins it)
- Test: `apps/web/test-db/account.test.ts`

**Interfaces:**
- Consumes: `verifyPassword`, `canRemoveMember` + `Member` from `@mailmyra/core`, `primaryOrgId` (`lib/repo/senders.ts`), `normalizeEmail` (import or replicate the one-liner from flows.ts — check what account.ts already has).
- Produces:
  ```ts
  deleteAccount(userId: string, input: { password: string; emailConfirm: string },
    opts?: { cdnWritePath?: string }):
    Promise<{ ok: true } | { ok: false; reason: 'invalid_credentials' | 'email_mismatch' | 'workspace_has_members' }>
  ```
  (`opts.cdnWritePath` testlerde geçici dizin vermek için; varsayılan `process.env.CDN_WRITE_PATH`.)

- [ ] **Step 1: Failing DB tests** (in `account.test.ts`; file assets with `fs.mkdtemp` + `writeFile`, pass the temp dir as `cdnWritePath`):

```ts
describe('deleteAccount', () => {
  test('a sole member takes the workspace and its CDN files with them', async () => {
    // kayıt → org'una 2 Asset satırı yaz (filename'ler geçici dizinde GERÇEK dosya)
    // deleteAccount(user, {password: DOĞRU, emailConfirm: adres}, {cdnWritePath: tmp}) → ok
    // user yok · org yok · asset satırları yok · tmp'deki iki dosya da yok
    // legalAcceptance satırı DURUYOR (userId null)
  });
  test('a missing CDN file does not stop the deletion', async () => {
    // asset satırı var, dosya diskte yok → yine ok; console.error spy çağrıldı
  });
  test('an invited member leaves without touching the org', async () => {
    // owner + davetli editor; editor kendini siler → org ve owner duruyor
  });
  test('the last owner with members is refused', async () => {
    // owner + editor; owner siler → workspace_has_members; hiçbir şey silinmedi
  });
  test('the wrong password or wrong typed e-mail is refused', async () => {
    // invalid_credentials · email_mismatch (büyük/küçük harf normalize edilir)
  });
});
```

Run → FAIL (function missing).

- [ ] **Step 2: Implement** in `lib/auth/account.ts`:

```ts
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

import { canRemoveMember, type Member } from '@mailmyra/core';

import { prisma } from '../db';
import { primaryOrgId } from '../repo/senders';
import { verifyPassword } from './password';

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_credentials' | 'email_mismatch' | 'workspace_has_members' };

/**
 * Hesap silme (spec §4). Karar (2026-08-13, Hüseyin): TAM temizlik — CDN
 * dosyaları dahil. Sahadaki imzalar kırılır; uyarı metni bunu açıkça söyler.
 * Kural core'daki `canRemoveMember` ile: tek üye → org da gider; ayrılabilir
 * üye → yalnız kullanıcı; son owner + üyeler → engel.
 */
export async function deleteAccount(
  userId: string,
  input: { password: string; emailConfirm: string },
  opts: { cdnWritePath?: string } = {},
): Promise<DeleteAccountResult> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(input.password, user.passwordHash))) {
    return { ok: false, reason: 'invalid_credentials' };
  }
  if (input.emailConfirm.trim().toLowerCase() !== user.email) {
    return { ok: false, reason: 'email_mismatch' };
  }

  const orgId = await primaryOrgId(userId);
  if (!orgId) {
    await prisma.user.delete({ where: { id: userId } });
    return { ok: true };
  }

  const members = (await prisma.membership.findMany({
    where: { orgId },
    select: { userId: true, role: true },
  })) as Member[];

  if (members.length > 1) {
    if (!canRemoveMember(members, userId)) {
      return { ok: false, reason: 'workspace_has_members' };
    }
    // Ayrılabilir üye: org başkalarına kalır, yalnız kullanıcı gider.
    await prisma.user.delete({ where: { id: userId } });
    return { ok: true };
  }

  // Tek üye: çalışma alanı sahibiyle birlikte gider — CDN dosyaları dahil.
  const assets = await prisma.asset.findMany({ where: { orgId }, select: { filename: true } });
  const writePath = opts.cdnWritePath ?? process.env.CDN_WRITE_PATH;
  if (writePath) {
    for (const a of assets) {
      try {
        await unlink(join(writePath, a.filename));
      } catch (error) {
        // Tek dosya arızası silmeyi durduramaz; iz log'da kalır.
        console.error('[account] CDN dosyası silinemedi:', a.filename, error);
      }
    }
  }
  await prisma.$transaction([
    // Org silinince Asset.orgId SetNull olurdu — yetim satır bırakmıyoruz.
    prisma.asset.deleteMany({ where: { orgId } }),
    prisma.organization.delete({ where: { id: orgId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
  return { ok: true };
}
```

(`Member` şekli core'da `{ userId; role }` — uyuşmazsa typecheck hakem;
`canRemoveMember(members, targetUserId)` imzası `packages/core/src/roles.ts:64`.)

- [ ] **Step 3:** account DB tests PASS · `npm run test:db` + typecheck green.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/auth/account.ts apps/web/test-db/account.test.ts
git commit -m "feat(auth): two-proof account deletion with full CDN cleanup"
```

---

### Task 5: Routes + confirm page

**Files:**
- Create: `apps/web/app/api/account/change-email/route.ts`, `apps/web/app/api/account/confirm-email-change/route.ts`, `apps/web/app/api/account/delete/route.ts`
- Create: `apps/web/app/(auth)/confirm-email-change/page.tsx` (+ küçük client bileşeni gerekiyorsa)
- READ FIRST: `apps/web/app/(auth)/verify-email/` — the confirm page mirrors ITS pattern exactly (how it takes ?token, calls its API, shows outcome). Also `app/api/auth/logout/route.ts` for the cookie-clearing header used on delete success.

**Interfaces:**
- Consumes: Task 3/4 flows, `getMailer`, `currentSession`, `json`/`readJsonBody`.
- Produces the HTTP contract:
  - `POST /api/account/change-email {newEmail,password}` → 401 · 400 `invalid_email` · 409 `email_taken` · 403 `invalid_credentials` · 200
  - `POST /api/account/confirm-email-change {token}` → 400 `invalid_token` · 409 `email_taken` · 200 (oturum GEREKMEZ — linke tıklayan farklı tarayıcıda olabilir; token yeter)
  - `POST /api/account/delete {password,emailConfirm}` → 401 · 403 `invalid_credentials` · 400 `email_mismatch` · 409 `workspace_has_members` · 200 + oturum çerezini temizleyen Set-Cookie (logout'un başlığı)

- [ ] **Step 1:** Implement the three thin routes (publish/export-zip idiom: session → body → flow → status map; `getMailer()` where a mail goes). Import depth: `app/api/account/<x>/route.ts` → `../../../../lib/...`.

- [ ] **Step 2:** Confirm page mirrors verify-email's structure: reads `?token`, POSTs its API, renders success ("Your address is updated — sign in continues to work") / failure ("This link is no longer valid") with a link to `/app/account`.

- [ ] **Step 3:** `npm run typecheck` → 0 · quick collateral `npx vitest run` → green.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/account "apps/web/app/(auth)/confirm-email-change"
git commit -m "feat(api): e-mail change and account deletion endpoints"
```

---

### Task 6: Account UI — plan box, change form, danger zone

**Files:**
- Modify: `apps/web/app/(app)/app/account/page.tsx`, `AccountForms.tsx`, `account.module.css`
- READ FIRST: `AccountForms.tsx` (mevcut form deseni — şifre değiştirme), `components/ui/ConfirmDialog.tsx`, `lib/repo/senders.ts` (`seatSummary`), `packages/core/src/pricing.ts` (`PRICING` alan adları — bak, uydurma).

- [ ] **Step 1: Plan box** (server, page.tsx): `seatSummary(session.user.id)` + billing org'un `entitlementState`/`trialEndsAt` (page zaten prisma kullanıyor; `primaryOrgId`+`resolveBillingOrgId` ile oku). Render:
  "**{active} / {entitled}** active senders · {state === 'trial' ? `Trial ends {date}` : state} · **${PRICING.<yıllık koltuk alanı>}** per active sender / year · To add seats, contact us." (PRICING alan adını dosyadan doğrula.)

- [ ] **Step 2: Change e-mail form** (AccountForms içine, şifre formunun deseniyle): new address + current password → POST change-email → success notu "Check {newEmail} — the switch happens when you confirm." · hata eşlemesi: `email_taken` "That address already has an account." · `invalid_credentials` "Wrong password." · `invalid_email` "Enter a valid address (or it is already yours)."

- [ ] **Step 3: Danger zone** (sayfa dibi): kırmızımsı çerçeveli bölüm + "Delete account" → `ConfirmDialog`:
  - Gövde (uyarı, spec §4 metni AYNEN):
    "This permanently deletes your workspace: senders, signatures and **all uploaded images**. Signatures already pasted into e-mail clients **will show broken images**. This cannot be undone."
  - İçinde iki input: "Type your e-mail to confirm" + "Your password"; Confirm (`confirmLabel="Delete forever"`) yalnız e-posta birebir eşleşince aktif.
  - POST delete → 200'de `window.location.href = 'https://mailmyra.com'` (çerez sunucuda temizlendi) · hatalar İngilizce satırla: `workspace_has_members` → "Your workspace still has other members — remove them or transfer ownership first." + Members linki.

- [ ] **Step 4:** typecheck + unit suite → green. Commit:

```bash
git add "apps/web/app/(app)/app/account/"
git commit -m "feat(panel): plan box, e-mail change and the danger zone"
```

---

### Task 7: Legal — single source, three pages, drafts

**Files:**
- Create/Modify: `apps/web/lib/legal-links.ts` (tek kaynak; bugün placeholder — bak, şekline uy), `apps/web/app/(marketing)/terms/page.tsx`, `privacy/page.tsx`, `kvkk/page.tsx`
- Modify: `apps/web/app/(auth)/signup/SignupForm.tsx` (termsVersion artık legal-links'ten), Account sayfasının Legal listesi (docType → sayfa linki), pazarlama footer'ı VARSA (bak; yoksa dokunma)
- Test: `apps/web/test/legal-links.test.ts`

- [ ] **Step 1:** `legal-links.ts`:

```ts
/** Hukuki sayfaların tek kaynağı. Sürüm = yürürlük günü; metin değişince
 *  burası güncellenir, kabul kayıtları hangi sürüme onay verildiğini tutar. */
export const LEGAL = {
  terms: { path: '/terms', version: '2026-08-13', title: 'Terms of Service' },
  privacy: { path: '/privacy', version: '2026-08-13', title: 'Privacy Policy' },
  kvkk: { path: '/kvkk', version: '2026-08-13', title: 'KVKK Aydınlatma Metni' },
} as const;
```

Test (`legal-links.test.ts`): her girdinin `path` `/` ile başlıyor, `version` `YYYY-MM-DD` deseninde; `terms.version` signup'ın gönderdiği değerle aynı kaynak (SignupForm import edecek — test yalnız modül şeklini sınar).

- [ ] **Step 2:** SignupForm: gövdedeki `termsVersion` alanı `LEGAL.terms.version` olur; kayıt onay satırındaki linkler `LEGAL.terms.path`/`LEGAL.privacy.path`/`LEGAL.kvkk.path`.

- [ ] **Step 3: Üç sayfa.** Düz tipografik sunucu bileşenleri (başlık + tarihli sürüm satırı + bölümler; pazarlama grubunun mevcut sayfa kabuğuna uy — (marketing) altındaki bir sayfaya bak). Her sayfanın EN ÜSTÜNDE görünür kutu:
  - EN sayfalarda: "**Draft** — this document has not yet been reviewed by counsel."
  - KVKK'da: "**Taslak** — bu metin henüz hukukçu incelemesinden geçmemiştir."

  İçerik çapaları (üçüne dağıt, ürün gerçekleriyle birebir — spec §5):
  - **Terms (EN):** service description (signature builder+hosting) · seat = published sender, $1/active sender/year, annual only, 7-day trial, manual invoicing (no self-serve checkout) · acceptable use · IP (your content stays yours; our engine ours) · termination & deletion effects (workspace incl. images irreversibly deleted; signatures in the field break) · liability limits · governing law: Türkiye.
  - **Privacy (EN):** data collected (account e-mail/password hash; sender names/titles/e-mails you enter — your team's data, you are the controller, we process it; uploaded images hosted at cdn.mailmyra.com; session cookie only, no analytics/tracking) · purposes · retention (until deletion) · deletion = full removal incl. CDN files · processors: hosting provider (Türkiye) · contact.
  - **KVKK (TR):** veri sorumlusu **Voldi Creative** (Konya) · işlenen kişisel veriler (hesap e-postası; müşteri tarafından girilen çalışan ad/ünvan/e-postaları — burada Mailmyra'nın **veri işleyen**, müşterinin veri sorumlusu olduğu açıkça yazılır; yüklenen görseller) · işleme amaçları (hizmet sunumu, kimlik doğrulama, işlemsel e-posta) · aktarım (yurt içi barındırma; üçüncü taraf analitik YOK) · saklama süresi (hesap silinene dek; silinince görseller dahil geri alınamaz imha) · md. 11 hakları + başvuru yolu (e-posta) · çerez: yalnız zorunlu oturum çerezi.

- [ ] **Step 4:** Account Legal listesi: `docType` etiketi ilgili sayfaya link olur (`terms` → LEGAL.terms.path).

- [ ] **Step 5:** `npx vitest run test/legal-links.test.ts` → PASS · typecheck → 0. Commit:

```bash
git add apps/web/lib/legal-links.ts apps/web/test/legal-links.test.ts "apps/web/app/(marketing)/terms" "apps/web/app/(marketing)/privacy" "apps/web/app/(marketing)/kvkk" "apps/web/app/(auth)/signup/SignupForm.tsx" "apps/web/app/(app)/app/account/page.tsx"
git commit -m "feat(legal): terms, privacy and kvkk drafts behind a single source"
```

---

### Task 8: Full verification + browser proof + final review + merge

- [ ] **Step 1:** `npm test` · `npm run test:db` · `npm run typecheck` — hepsi yeşil.
- [ ] **Step 2: Browser** (dev server, hesap-test hesabı): Plan kutusu rakamları · adres değiştirme isteği (dev'de mail konsola düşer — linki log'dan al, confirm sayfasını gez) · Danger zone çift kanıt (yanlış e-posta yazınca düğme pasif) · üç hukuk sayfası + signup linkleri. Silmeyi hesap-test'te SONUNA KADAR KOŞMA — ayrı çöp hesap aç, onu sil (hesap-test yerel demirbaş).
- [ ] **Step 3:** Final bütün-dal incelemesi (en yetkin model; merge-base `git merge-base main HEAD`; ledger Minor listesi triyaja) → bulgular tek fixer → re-review.
- [ ] **Step 4:** Main kirli-dosya kesişim kontrolü → ff-merge → backlog/hafıza güncelle.

**DEPLOY NOTU:** migration VAR (`email-change-token`) — ritüel yine: durdur → `.next`+`prisma/` → `migrate deploy` → `generate` → başlat.

---

## Self-review notu

- Spec kapsaması: §2→T6 · §3→T1/T2/T3/T5/T6 · §4→T4/T5/T6 · §5→T7 · §6→testler + T8.
- Tip tutarlılığı: flow imzaları T3/T4 ↔ T5 route'ları ↔ T6 hata eşlemeleri birebir; `Member`/`canRemoveMember` core imzasına işaret edildi.
- Bilinçli esneklikler: T3 test kodu niyet-yorumlu iskelet (dosyanın gerçek yardımcılarına uyum şart, RED kanıtı zorunlu); T5/T6/T7 "READ FIRST" dosyaları named; PRICING alan adı dosyadan doğrulanacak (uydurma yasak).
