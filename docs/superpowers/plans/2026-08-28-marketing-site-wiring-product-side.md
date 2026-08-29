# Pazarlama sitesi bağlantısı — ÜRÜN TARAFI (Plan 1/2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pazarlama sitesindeki iki ölü formun yazabileceği halka açık bir lead ucu açmak ve builder'a `?template=` desteği eklemek — böylece site tarafı (Plan 2) bağlanacak gerçek bir hedef bulur.

**Architecture:** Yeni `POST /api/leads` ucu, auth uçlarındaki form-post desenini birebir izler (form-encoded gövde → 303 yönlendirme, JSON değil). Staff yolu (`createLead`) hiç değişmez; halka açık yol ayrı bir repo fonksiyonu (`createInboundLead`) kullanır, denetim defterine kişi bilgisi yazmaz ve bildirimi `senders.ts`/`members.ts` emsalindeki gibi repo katmanından gönderir. `Lead` modeli formların dört alanını taşıyamadığı için tek kolonluk bir migration eklenir.

**Tech Stack:** Next.js App Router (route handlers), Prisma 7 + MariaDB, vitest (birim: `test/`, DB: `test-db/`), nodemailer soyutlaması (`lib/mail`).

## Global Constraints

- **Paket yöneticisi npm.** Kökten `npm test`, `npm run typecheck`, `npm run build`; tek workspace için `npm run <script> -w apps/web`. **pnpm/corepack kullanma.**
- **Veritabanı MariaDB 11.8.3**, Prisma provider `mysql`. `JSON` aslında LONGTEXT — indekslenemez. Dizi kolonu yok. Bütün tablolar `utf8mb4`.
- **Migration panelden koşulur** (Plesk > Node.js > "Komut dosyası çalıştır" → `prisma migrate deploy`). Mac'ten prod DB'ye bağlanılmaz.
- **İşlemsel e-postalar İngilizce kalır** (kilitli karar). Şablon metni İngilizce yazılır, i18n sözlüğüne girmez.
- **Sağlayıcıya özel e-posta SDK'sı kullanma** — yalnız `lib/mail` soyutlaması.
- **E-posta HTML kuralları** işlemsel postalarda da geçerli: tablo tabanlı, CSS satır içi, `border="0"`. `renderLayout` bunu zaten sağlıyor — yeni kabuk yazma.
- **Denetim defteri sözleşmesi:** `AdminAction` payload'ına kişi bilgisi (`contact`, `note`) **girmez** (`lib/repo/admin.ts:2005` governance sözleşmesi).
- **Açık yönlendirme yasağı:** yönlendirme hedefi `Origin`/`Referer`'dan **asla** türetilmez; `marketingOrigin()` env'den okur (`app/api/auth/_shared.ts`).
- Birim testleri veritabanısız koşar (`npm test -w apps/web`). DB gerektirenler `test-db/` altına gider, `npm run test:db -w apps/web` ile koşar.
- Yorumlar Türkçe; kod, değişken adları ve commit mesajları İngilizce.

---

### Task 1: `Lead.note` kolonu

Formlar `Lead`'in taşımadığı dört şey gönderiyor: mesaj, e-posta platformu, ünvan, şirket URL'i. `nextStep` (VarChar 200) personelin bir sonraki aksiyonu için — oraya müşteri metni yazmak alanın anlamını bozar ve mesaja yetmez.

**Files:**
- Modify: `apps/web/prisma/schema.prisma` (`model Lead`, ~satır 812-828)
- Create: `apps/web/prisma/migrations/<timestamp>_lead_inbound_note/migration.sql`
- Test: `apps/web/test-db/schema.test.ts`

**Interfaces:**
- Produces: `Lead.note: string | null` — Task 4 yazar, admin ekranı okur.

- [ ] **Step 1: Şemaya kolonu ekle**

`apps/web/prisma/schema.prisma`, `model Lead` içinde `nextStep` satırından sonra:

```prisma
  /// Gelen formdan düşen serbest metin: mesaj, e-posta platformu, ünvan,
  /// şirket URL'i. Personel yazmaz — `createInboundLead` doldurur, panel
  /// yalnız okur. Kişi bilgisi içerebilir: denetim payload'ına GİRMEZ.
  note String? @db.Text
```

- [ ] **Step 2: Migration üret**

```bash
npm run db:migrate -w apps/web -- --name lead_inbound_note
```

Beklenen: `apps/web/prisma/migrations/<timestamp>_lead_inbound_note/migration.sql` oluşur, içinde `ALTER TABLE \`Lead\` ADD COLUMN \`note\` TEXT NULL;` bulunur, yerel DB'ye uygulanır.

- [ ] **Step 3: Şema testi yaz**

`apps/web/test-db/schema.test.ts` sonuna ekle:

```ts
describe('Lead.note', () => {
  it('gelen talebin serbest metnini saklar ve boş bırakılabilir', async () => {
    const withNote = await prisma.lead.create({
      data: {
        company: 'Acme',
        contact: 'Ayşe <ayse@acme.com>',
        source: 'inbound-demo',
        note: 'Uzun mesaj '.repeat(50),
      },
    });
    const withoutNote = await prisma.lead.create({
      data: { company: 'Beta', contact: 'staff girdisi', source: 'referral' },
    });

    expect(withNote.note).toBe('Uzun mesaj '.repeat(50));
    expect(withoutNote.note).toBeNull();
  });
});
```

- [ ] **Step 4: Testi koş**

```bash
npm run test:db -w apps/web -- schema
```

Beklenen: PASS. (`globalSetup` migration'ları test veritabanına kendisi uygular.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/prisma/schema.prisma apps/web/prisma/migrations apps/web/test-db/schema.test.ts
git commit -m "feat(leads): add Lead.note for inbound form detail"
```

---

### Task 2: `appUrl()` tek yere çıkar

`process.env.APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'` şu an **dört dosyada birebir kopya**: `lib/auth/flows.ts:28`, `lib/repo/admin.ts:1842`, `lib/repo/members.ts:22`, `lib/repo/senders.ts:75`. Task 3 beşinci tüketiciyi ekliyor — beşinci kopyayı yazmak yerine ortak dosyaya alınır.

**Files:**
- Create: `apps/web/lib/app-url.ts`
- Modify: `apps/web/lib/auth/flows.ts`, `apps/web/lib/repo/admin.ts`, `apps/web/lib/repo/members.ts`, `apps/web/lib/repo/senders.ts`
- Test: `apps/web/test/app-url.test.ts`

**Interfaces:**
- Produces: `export function appUrl(env?: Record<string, string | undefined>): string` — Task 3 ve 4 kullanır.

- [ ] **Step 1: Kırmızı test yaz**

Create `apps/web/test/app-url.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { appUrl } from '../lib/app-url';

describe('appUrl', () => {
  it('sondaki eğik çizgiyi atar', () => {
    expect(appUrl({ APP_URL: 'https://app.mailmyra.com/' })).toBe('https://app.mailmyra.com');
  });

  it('eğik çizgi yoksa aynen döner', () => {
    expect(appUrl({ APP_URL: 'https://app.mailmyra.com' })).toBe('https://app.mailmyra.com');
  });

  it('tanımsızsa yerel adrese düşer', () => {
    expect(appUrl({})).toBe('http://localhost:3000');
  });
});
```

- [ ] **Step 2: Testi koş — kırmızı olmalı**

```bash
npm test -w apps/web -- app-url
```

Beklenen: FAIL — `Cannot find module '../lib/app-url'`.

- [ ] **Step 3: Ortak dosyayı yaz**

Create `apps/web/lib/app-url.ts`:

```ts
/**
 * Panelin kendi kökü — e-postalara konan bağlantılar buradan kurulur.
 *
 * Dört dosyada birebir kopyalanmıştı (`auth/flows.ts`, `repo/admin.ts`,
 * `repo/members.ts`, `repo/senders.ts`); beşinci tüketici gelince tek yere
 * alındı. Env'den okunur ve istekten TÜRETİLMEZ — `marketingOrigin()`
 * ile aynı gerekçe: `Origin`/`Referer`e güvenmek açık yönlendirmedir.
 */
export function appUrl(env: Record<string, string | undefined> = process.env): string {
  return env.APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
}
```

- [ ] **Step 4: Testi koş — yeşil olmalı**

```bash
npm test -w apps/web -- app-url
```

Beklenen: PASS (3 test).

- [ ] **Step 5: Dört kopyayı sil, ortak fonksiyonu kullan**

Dört dosyanın her birinde yerel `appUrl` tanımını **sil** ve import ekle. Doğru import yolu dosyanın derinliğine göre değişir:

- `apps/web/lib/auth/flows.ts` → `import { appUrl } from '../app-url';`
- `apps/web/lib/repo/admin.ts` → `import { appUrl } from '../app-url';`
- `apps/web/lib/repo/members.ts` → `import { appUrl } from '../app-url';`
- `apps/web/lib/repo/senders.ts` → `import { appUrl } from '../app-url';`

Çağrı yerleri (`appUrl()`) değişmez — imza aynı.

Silinecek blokları bulmak için:

```bash
grep -n "APP_URL" apps/web/lib/auth/flows.ts apps/web/lib/repo/admin.ts apps/web/lib/repo/members.ts apps/web/lib/repo/senders.ts
```

- [ ] **Step 6: Tam takım koş — hiçbir davranış değişmemeli**

```bash
npm test && npm run typecheck
```

Beklenen: hepsi PASS. Bu adım saf yeniden düzenleme; tek bir test bile kırmızıya dönerse import yolu yanlıştır.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/app-url.ts apps/web/lib/auth/flows.ts apps/web/lib/repo apps/web/test/app-url.test.ts
git commit -m "refactor: extract appUrl() to one module"
```

---

### Task 3: Bildirim e-postası şablonu

Talep geldiğinde personele bilgi düşer — kimse paneli sürekli izlemek zorunda kalmasın.

**Files:**
- Modify: `apps/web/lib/mail/templates/index.ts`
- Modify: `apps/web/lib/mail/index.ts` (export listesi)
- Create: `apps/web/test/mail-inbound-lead.test.ts`

**Interfaces:**
- Consumes: `renderLayout`, `renderText`, `escapeHtml` (`lib/mail/templates/layout.ts`)
- Produces:
  ```ts
  export interface InboundLeadMailInput {
    actionUrl: string; company: string; contact: string; source: string; seats: number; note: string | null;
  }
  export function inboundLeadEmail(input: InboundLeadMailInput): MailBody;
  ```
  Task 4 çağırır.

**Not:** `renderLayout` `actionUrl`/`actionLabel`/`footnote` alanlarını **zorunlu** ister ve `renderText(lines, actionUrl, footnote)` de öyle. Bu yüzden ortak kabuk **değiştirilmez**; bildirim kendi bağlantısını taşır: personel leads ekranı. Alıcı zaten personel, panel adresi ona kapalı bir bilgi değil.

- [ ] **Step 1: Kırmızı test yaz**

Create `apps/web/test/mail-inbound-lead.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { inboundLeadEmail } from '../lib/mail/templates';

const base = {
  actionUrl: 'https://app.mailmyra.com/admin/growth/leads',
  company: 'Acme',
  contact: 'Ayşe <ayse@acme.com>',
  source: 'inbound-demo',
  seats: 25,
  note: null as string | null,
};

describe('inboundLeadEmail', () => {
  it('konu satırında şirket ve kaynak geçer', () => {
    expect(inboundLeadEmail(base).subject).toBe('New enquiry from Acme (inbound-demo)');
  });

  it('özet alanları metin gövdesinde yer alır', () => {
    const mail = inboundLeadEmail(base);

    expect(mail.text).toContain('Company: Acme');
    expect(mail.text).toContain('Contact: Ayşe <ayse@acme.com>');
    expect(mail.text).toContain('Source: inbound-demo');
    expect(mail.text).toContain('Seats: 25');
  });

  it('HTML gövdesinde kullanıcı metni kaçırılır', () => {
    const mail = inboundLeadEmail({
      ...base,
      company: '<script>alert(1)</script>',
      note: '<img src=x onerror=alert(1)>',
    });

    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('onerror=');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('note doluysa Details bölümü gelir, boşsa hiç gelmez', () => {
    expect(inboundLeadEmail({ ...base, note: 'Message: merhaba' }).text).toContain('Details');
    expect(inboundLeadEmail(base).text).not.toContain('Details');
  });

  it('note içindeki satır sonları HTML gövdesinde <br> olur', () => {
    const mail = inboundLeadEmail({ ...base, note: 'Message: a\nPlatform: b' });

    expect(mail.html).toContain('Message: a<br>Platform: b');
  });
});
```

- [ ] **Step 2: Testi koş — kırmızı olmalı**

```bash
npm test -w apps/web -- mail-inbound-lead
```

Beklenen: FAIL — `inboundLeadEmail` export edilmemiş.

- [ ] **Step 3: Şablonu yaz**

`apps/web/lib/mail/templates/index.ts` sonuna ekle. Dosyanın mevcut `escapeHtml` / `renderLayout` / `renderText` import'ları kullanılır — yenisini yazma, yeni kabuk kurma:

```ts
export interface InboundLeadMailInput {
  actionUrl: string;
  company: string;
  contact: string;
  source: string;
  seats: number;
  note: string | null;
}

/**
 * Pazarlama sitesinin formlarından gelen talebin personele bildirimi.
 * İngilizce — işlemsel e-postalar İngilizce kalır (kilitli karar).
 *
 * Talebin kendisi `Lead` satırında duruyor; bu e-posta "bir şey geldi"
 * demek için. Yine de özet taşır ki personel panele girmeden talebin
 * ciddiyetini görebilsin. Müşteri metni (`note`) kaçırılarak basılır:
 * gövde HTML ve içeriği tamamen kullanıcı yazımı.
 */
export function inboundLeadEmail({
  actionUrl,
  company,
  contact,
  source,
  seats,
  note,
}: InboundLeadMailInput): MailBody {
  const lines = [
    `Company: ${company}`,
    `Contact: ${contact}`,
    `Source: ${source}`,
    `Seats: ${seats}`,
  ];

  const detailHtml = note
    ? [`<strong>Details</strong><br>${escapeHtml(note).replace(/\n/g, '<br>')}`]
    : [];

  return {
    // Konu satırı HTML değil; ham hâliyle gider.
    subject: `New enquiry from ${company} (${source})`,
    html: renderLayout({
      heading: 'New enquiry',
      paragraphs: [lines.map((l) => escapeHtml(l)).join('<br>'), ...detailHtml],
      actionUrl,
      actionLabel: 'Open in the panel',
      footnote: 'Sent by the contact and demo forms on mailmyra.com.',
    }),
    text: renderText(
      ['New enquiry', '', ...lines, ...(note ? ['', 'Details', note] : [])],
      actionUrl,
      'Sent by the contact and demo forms on mailmyra.com.',
    ),
  };
}
```

- [ ] **Step 4: Export'a ekle**

`apps/web/lib/mail/index.ts` içindeki `export { ... } from './templates';` listesine alfabetik sırada ekle — `emailChangedNoticeEmail,` ile `inviteEmail,` arasına:

```ts
  inboundLeadEmail,
```

- [ ] **Step 5: Testleri koş**

```bash
npm test -w apps/web
```

Beklenen: yeni 5 test PASS, mevcut testlerin hepsi hâlâ PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/mail apps/web/test/mail-inbound-lead.test.ts
git commit -m "feat(mail): add inbound lead notification template"
```

---

### Task 4: `createInboundLead()` — halka açık yazma yolu + bildirim

`createLead()` `requireStaff` + `requireReason` + `audit()` zinciri koşuyor; halka açık formun ne staff kullanıcısı ne denetim gerekçesi var. Ayrı fonksiyon yazılır, **`createLead` hiç değişmez.** Bildirim repo katmanından gider — `senders.ts:104` (koltuk uyarısı) ve `members.ts:84` (davet) emsali.

**Files:**
- Create: `apps/web/lib/repo/leads.ts`
- Modify: `apps/web/test-db/helpers.ts`
- Create: `apps/web/test-db/leads-inbound.test.ts`

**Interfaces:**
- Consumes: `Lead.note` (Task 1), `appUrl` (Task 2), `inboundLeadEmail` (Task 3), `getMailer` (`lib/mail`)
- Produces:
  ```ts
  export interface InboundLeadInput {
    company: string; contact: string; source: string; seats?: number; note?: string;
  }
  export function createInboundLead(input: InboundLeadInput): Promise<{ id: string }>;
  ```
  Task 5 çağırır.

- [ ] **Step 1: `truncateAll`'a Lead'i ekle**

`apps/web/test-db/helpers.ts` içindeki `prisma.$transaction([...])` dizisinde `prisma.adminAction.deleteMany(),` satırından **sonra**:

```ts
    prisma.lead.deleteMany(),
```

- [ ] **Step 2: Kırmızı test yaz**

Create `apps/web/test-db/leads-inbound.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '../lib/db';
import { createInboundLead } from '../lib/repo/leads';
import { truncateAll } from './helpers';

const send = vi.fn();
vi.mock('../lib/mail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/mail')>()),
  getMailer: () => ({ kind: 'memory' as const, send: (...a: unknown[]) => send(...a) }),
}));

beforeEach(async () => {
  await truncateAll();
  send.mockReset();
  process.env.LEADS_NOTIFY_TO = 'hello@mailmyra.com';
});

describe('createInboundLead', () => {
  it('lead açar, alanları kırpar, varsayılanları şemadan alır', async () => {
    const { id } = await createInboundLead({
      company: '  Acme A.Ş.  ',
      contact: 'Ayşe Yılmaz <ayse@acme.com>',
      source: 'inbound-demo',
      seats: 25,
      note: 'Platform: microsoft-365',
    });

    const row = await prisma.lead.findUniqueOrThrow({ where: { id } });
    expect(row.company).toBe('Acme A.Ş.');
    expect(row.contact).toBe('Ayşe Yılmaz <ayse@acme.com>');
    expect(row.source).toBe('inbound-demo');
    expect(row.seats).toBe(25);
    expect(row.note).toBe('Platform: microsoft-365');
    expect(row.stage).toBe('new');
    expect(row.nextStep).toBe('');
  });

  it('seats verilmezse, sıfırsa ya da kesirliyse 1 olur', async () => {
    const rows = await Promise.all([
      createInboundLead({ company: 'A', contact: 'a@a.com', source: 'inbound-contact' }),
      createInboundLead({ company: 'B', contact: 'b@b.com', source: 'inbound-contact', seats: 0 }),
      createInboundLead({ company: 'C', contact: 'c@c.com', source: 'inbound-contact', seats: 7.5 }),
    ]);

    for (const { id } of rows) {
      expect((await prisma.lead.findUniqueOrThrow({ where: { id } })).seats).toBe(1);
    }
  });

  it('kolon sınırını aşan girdiyi kırpar, veritabanı hatası vermez', async () => {
    const { id } = await createInboundLead({
      company: 'x'.repeat(400),
      contact: 'y'.repeat(400),
      source: 'z'.repeat(80),
    });

    const row = await prisma.lead.findUniqueOrThrow({ where: { id } });
    expect(row.company).toHaveLength(160);
    expect(row.contact).toHaveLength(255);
    expect(row.source).toHaveLength(48);
  });

  it('zorunlu alan boşsa reddeder ve satır açmaz', async () => {
    await expect(
      createInboundLead({ company: '   ', contact: 'a@a.com', source: 'inbound-demo' }),
    ).rejects.toThrow();
    await expect(
      createInboundLead({ company: 'A', contact: '   ', source: 'inbound-demo' }),
    ).rejects.toThrow();

    expect(await prisma.lead.count()).toBe(0);
  });

  it('denetim defterine satır YAZMAZ — kişi bilgisi iç deftere birikmesin', async () => {
    await createInboundLead({ company: 'Acme', contact: 'ayse@acme.com', source: 'inbound-demo' });

    expect(await prisma.adminAction.count()).toBe(0);
  });

  it('bildirim e-postası gönderir', async () => {
    await createInboundLead({ company: 'Acme', contact: 'ayse@acme.com', source: 'inbound-demo', seats: 3 });

    expect(send).toHaveBeenCalledTimes(1);
    const mail = send.mock.calls[0][0];
    expect(mail.to).toBe('hello@mailmyra.com');
    expect(mail.kind).toBe('notification');
    expect(mail.subject).toBe('New enquiry from Acme (inbound-demo)');
  });

  it('LEADS_NOTIFY_TO boşsa lead yine açılır, posta gönderilmez', async () => {
    delete process.env.LEADS_NOTIFY_TO;

    const { id } = await createInboundLead({ company: 'Acme', contact: 'a@a.com', source: 'inbound-demo' });

    expect(await prisma.lead.findUnique({ where: { id } })).not.toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  it('posta gönderimi patlarsa lead YİNE kayıtlı kalır', async () => {
    send.mockRejectedValue(new Error('smtp down'));

    const { id } = await createInboundLead({ company: 'Acme', contact: 'a@a.com', source: 'inbound-demo' });

    expect(await prisma.lead.findUnique({ where: { id } })).not.toBeNull();
  });
});
```

- [ ] **Step 3: Testi koş — kırmızı olmalı**

```bash
npm run test:db -w apps/web -- leads-inbound
```

Beklenen: FAIL — `Cannot find module '../lib/repo/leads'`.

- [ ] **Step 4: Fonksiyonu yaz**

Create `apps/web/lib/repo/leads.ts`:

```ts
import { appUrl } from '../app-url';
import { prisma } from '../db';
import { getMailer, inboundLeadEmail } from '../mail';

/**
 * Pazarlama sitesinin formlarından gelen talep. `admin.ts`'teki
 * `createLead`in halka açık kardeşi — üç farkı var ve üçü de kasıtlı:
 *
 * ① Staff kimliği yok, `requireStaff` çağrılmaz (gönderen ziyaretçi).
 * ② Denetim defterine (`AdminAction`) satır YAZILMAZ. Defter personelin ne
 *    yaptığını tutar; burada personel bir şey yapmıyor. Üstelik payload'a
 *    kişi bilgisi koymama sözleşmesi (admin.ts §createLead) burada da
 *    geçerli ve en temiz uygulaması hiç yazmamak.
 * ③ `stage`/`nextStep` verilmez — şemanın kendi varsayılanları geçerli olur;
 *    gelen talebin aşamasını personel belirler.
 *
 * Kırpma sessiz: alan doğrulaması ucun işi (`app/api/leads/route.ts`),
 * buradaki amaç kolon sınırını aşan girdinin veritabanı hatasına dönüşmemesi.
 */
export interface InboundLeadInput {
  company: string;
  contact: string;
  source: string;
  seats?: number;
  note?: string;
}

export async function createInboundLead(input: InboundLeadInput): Promise<{ id: string }> {
  const company = input.company.trim().slice(0, 160);
  if (!company) throw new Error('Şirket adı zorunlu.');
  const contact = input.contact.trim().slice(0, 255);
  if (!contact) throw new Error('İletişim bilgisi zorunlu.');
  const source = input.source.trim().slice(0, 48);
  if (!source) throw new Error('Kaynak zorunlu.');

  // Aralık seçeneklerinden gelen değer tam sayı olmayabilir; 1'in altına
  // düşmesine de izin verilmez (şemadaki `@default(1)` ile aynı taban).
  const seats =
    typeof input.seats === 'number' && Number.isInteger(input.seats) && input.seats >= 1
      ? input.seats
      : 1;

  const note = input.note?.trim() || null;

  const lead = await prisma.lead.create({
    data: { company, contact, source, seats, note },
    select: { id: true },
  });

  // Bildirim EN-İYİ-ÇABA: talep deftere yazıldı, SMTP çökmesi ziyaretçiye
  // hata göstermeyi haklı çıkarmaz (`lib/mail/index.ts`teki teslim defteri
  // kararının aynı mantığı — posta işin kendisi değil, haber verme).
  const notifyTo = process.env.LEADS_NOTIFY_TO;
  if (notifyTo) {
    try {
      await getMailer().send({
        to: notifyTo,
        kind: 'notification',
        ...inboundLeadEmail({
          actionUrl: `${appUrl()}/admin/growth/leads`,
          company,
          contact,
          source,
          seats,
          note,
        }),
      });
    } catch {
      // yutulur — bkz. yukarıdaki gerekçe
    }
  }

  return lead;
}
```

- [ ] **Step 5: Testi koş — yeşil olmalı**

```bash
npm run test:db -w apps/web -- leads-inbound
```

Beklenen: PASS (8 test).

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/repo/leads.ts apps/web/test-db/leads-inbound.test.ts apps/web/test-db/helpers.ts
git commit -m "feat(leads): add createInboundLead with best-effort staff notification"
```

---

### Task 5: Halka açık `POST /api/leads` ucu

**Files:**
- Create: `apps/web/app/api/leads/route.ts`
- Create: `apps/web/test/api-public-leads-route.test.ts`
- Modify: `.env.example`, `.env.production.example`

**Interfaces:**
- Consumes: `createInboundLead` (Task 4); `readBody`/`field`/`seeOther`/`marketingOrigin` (`app/api/auth/_shared.ts`); `clientIp`; `createRateLimiter`; `envInt`
- Produces: `POST /api/leads` — Plan 2'deki iki form buraya post eder.

**Sözleşme:** Gövde form-encoded gelir, cevap **303**. Ziyaretçi ham JSON görmez (`_shared.ts` baş yorumundaki gerekçe). Hedef sayfa **whitelist'ten** seçilir, `Referer`'dan türetilmez. Middleware yalnız `/app/*` ve `/admin/*` eşliyor (`middleware.ts` matcher) — bu uç halka açık kalır, ek ayar gerekmez.

- [ ] **Step 1: Kırmızı test yaz**

Create `apps/web/test/api-public-leads-route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Route seviyesi: gövde → repo argümanı eşlemesi ve HTTP çevirisi. Repo
 * davranışı `test-db/leads-inbound.test.ts`te gerçek DB'ye karşı test
 * ediliyor; burada DB yok, bu yüzden CI'da her zaman koşar.
 */

const createInboundLead = vi.fn();

vi.mock('../lib/repo/leads', () => ({
  createInboundLead: (...args: unknown[]) => createInboundLead(...args),
}));

let ip = '203.0.113.1';
vi.mock('../lib/client-ip', () => ({ clientIp: () => ip }));

const { POST } = await import('../app/api/leads/route');

function formReq(pairs: Record<string, string>): Request {
  return new Request('https://app.mailmyra.com/api/leads', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(pairs),
  });
}

let ipCounter = 0;

beforeEach(() => {
  createInboundLead.mockReset();
  createInboundLead.mockResolvedValue({ id: 'lead1' });
  process.env.MARKETING_ORIGIN = 'https://mailmyra.com';
  // Sayaç bellekte ve modül ömrü boyunca yaşıyor; her test taze bir IP alır
  // ki komşu testin doldurduğu pencere bunu etkilemesin.
  ipCounter += 1;
  ip = `203.0.113.${ipCounter}`;
});

describe('demo formu', () => {
  it('alanları eşler ve anasayfaya 303 döner', async () => {
    const res = await POST(
      formReq({
        form: 'demo',
        name: 'Alex Carter',
        email: 'alex@northwind.com',
        company: 'Northwind',
        team_size: '25',
        platform: 'microsoft-365',
        job_title: 'Marketing Lead',
        message: 'Ekibimiz için imza istiyoruz',
      }),
    );

    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe(
      'https://mailmyra.com/index.html?sent=1#mailmyra-demo-form',
    );
    expect(await res.text()).toBe('');
    expect(createInboundLead).toHaveBeenCalledWith({
      company: 'Northwind',
      contact: 'Alex Carter <alex@northwind.com>',
      source: 'inbound-demo',
      seats: 25,
      note: 'Message: Ekibimiz için imza istiyoruz\nPlatform: microsoft-365\nJob title: Marketing Lead',
    });
  });

  it('demo formunda onay kutusu aranmaz — sayfada yok', async () => {
    const res = await POST(
      formReq({ form: 'demo', name: 'A', email: 'a@a.com', company: 'A' }),
    );

    expect(res.headers.get('Location')).toContain('sent=1');
    expect(createInboundLead).toHaveBeenCalledTimes(1);
  });
});

describe('contact formu', () => {
  it('segment kaynağa, koltuk aralığı alt sınıra döner', async () => {
    const res = await POST(
      formReq({
        form: 'contact',
        segment: 'agency',
        name: 'Ayşe Yılmaz',
        email: 'ayse@acme.com',
        company: 'Acme',
        seats: '50-199',
        message: 'Merhaba',
        company_url: 'https://acme.com',
        consent: 'on',
      }),
    );

    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe(
      'https://mailmyra.com/contact.html?sent=1#mm-contact-form',
    );
    expect(createInboundLead).toHaveBeenCalledWith({
      company: 'Acme',
      contact: 'Ayşe Yılmaz <ayse@acme.com>',
      source: 'inbound-agency',
      seats: 50,
      note: 'Message: Merhaba\nCompany URL: https://acme.com',
    });
  });

  it('beş segmentin her biri kendi kaynağını üretir', async () => {
    for (const segment of ['agency', 'enterprise', 'team', 'freelancer', 'support']) {
      createInboundLead.mockClear();
      ipCounter += 1;
      ip = `198.51.100.${ipCounter}`;

      await POST(
        formReq({ form: 'contact', segment, name: 'A', email: 'a@a.com', company: 'A', consent: 'on' }),
      );

      expect(createInboundLead.mock.calls[0][0].source).toBe(`inbound-${segment}`);
    }
  });

  it('bilinmeyen segment jenerik kaynağa düşer', async () => {
    await POST(
      formReq({ form: 'contact', segment: 'uydurma', name: 'A', email: 'a@a.com', company: 'A', consent: 'on' }),
    );

    expect(createInboundLead.mock.calls[0][0].source).toBe('inbound-contact');
  });

  it('onay kutusu işaretsizse reddeder ve kayıt açmaz', async () => {
    const res = await POST(formReq({ form: 'contact', name: 'A', email: 'a@a.com', company: 'A' }));

    expect(res.headers.get('Location')).toBe(
      'https://mailmyra.com/contact.html?error=consent_required#mm-contact-form',
    );
    expect(createInboundLead).not.toHaveBeenCalled();
  });

  it('bilinmeyen form değeri contact sayılır — hedef whitelist dışına çıkmaz', async () => {
    const res = await POST(
      formReq({ form: 'https://kotu.example/', name: 'A', email: 'a@a.com', company: 'A', consent: 'on' }),
    );

    expect(res.headers.get('Location')).toBe(
      'https://mailmyra.com/contact.html?sent=1#mm-contact-form',
    );
  });
});

describe('doğrulama ve koruma', () => {
  it('e-posta boşsa hata koduyla geri döner', async () => {
    const res = await POST(formReq({ form: 'demo', name: 'A', company: 'A', email: '' }));

    expect(res.headers.get('Location')).toBe(
      'https://mailmyra.com/index.html?error=missing_fields#mailmyra-demo-form',
    );
    expect(createInboundLead).not.toHaveBeenCalled();
  });

  it('honeypot doluysa başarı gibi davranır ama kayıt açmaz', async () => {
    const res = await POST(
      formReq({ form: 'demo', name: 'Bot', email: 'bot@bot.com', company: 'Bot', website: 'spam' }),
    );

    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe(
      'https://mailmyra.com/index.html?sent=1#mailmyra-demo-form',
    );
    expect(createInboundLead).not.toHaveBeenCalled();
  });

  it('aynı IP pencereyi doldurunca reddedilir', async () => {
    ip = '198.51.100.200';
    for (let i = 0; i < 5; i += 1) {
      await POST(formReq({ form: 'demo', name: 'A', email: `a${i}@a.com`, company: 'A' }));
    }

    const res = await POST(formReq({ form: 'demo', name: 'A', email: 'son@a.com', company: 'A' }));

    expect(res.headers.get('Location')).toBe(
      'https://mailmyra.com/index.html?error=rate_limited#mailmyra-demo-form',
    );
    expect(createInboundLead).toHaveBeenCalledTimes(5);
  });

  it('repo patlarsa ziyaretçi hata koduyla döner', async () => {
    createInboundLead.mockRejectedValue(new Error('db down'));

    const res = await POST(formReq({ form: 'demo', name: 'A', email: 'a@a.com', company: 'A' }));

    expect(res.headers.get('Location')).toBe(
      'https://mailmyra.com/index.html?error=server_error#mailmyra-demo-form',
    );
  });
});
```

- [ ] **Step 2: Testi koş — kırmızı olmalı**

```bash
npm test -w apps/web -- api-public-leads-route
```

Beklenen: FAIL — `Cannot find module '../app/api/leads/route'`.

- [ ] **Step 3: Ucu yaz**

Create `apps/web/app/api/leads/route.ts`:

```ts
import { field, marketingOrigin, readBody, seeOther } from '../auth/_shared';
import { clientIp } from '../../../lib/client-ip';
import { envInt } from '../../../lib/env';
import { createInboundLead } from '../../../lib/repo/leads';
import { createRateLimiter } from '../../../lib/rate-limit';

/**
 * Pazarlama sitesindeki iki formun (anasayfadaki "Schedule a demo" ve
 * /contact) yazdığı halka açık uç.
 *
 * Neden `/api/admin/leads` kullanılmıyor: o uç staff oturumu ve denetim
 * gerekçesi istiyor; ziyaretçide ikisi de yok.
 *
 * Neden cevap 303: gövde düz bir `<form method="post">` gönderimiyle geliyor
 * ve tarayıcı cevabı doğrudan ekrana basıyor — JSON dönmek ziyaretçiye ham
 * `{"error":"..."}` göstermek demek (auth uçlarındaki gerekçenin aynısı,
 * `_shared.ts` baş yorumu). Aynı sebeple JavaScript kapalıyken de çalışır.
 *
 * Dönüş adresi WHITELIST'ten seçilir, `Referer`dan TÜRETİLMEZ — açık
 * yönlendirme açığı olurdu (`marketingOrigin()` yorumundaki aynı ders).
 * `form` alanı bilinmeyen bir değer taşırsa contact sayılır; böylece
 * dışarıdan gelen hiçbir dize hedefi belirleyemez.
 */

const RETURN = {
  demo: { page: 'index.html', hash: '#mailmyra-demo-form' },
  contact: { page: 'contact.html', hash: '#mm-contact-form' },
} as const;

type FormKey = keyof typeof RETURN;

/** contact.html'deki segment çipinin beş değeri — başkası jeneriğe düşer. */
const SEGMENTS: readonly string[] = ['agency', 'enterprise', 'team', 'freelancer', 'support'];

/** contact.html'deki `<select name="seats">` seçenekleri → aralığın alt sınırı. */
const SEAT_RANGES: Record<string, number> = {
  '1': 1,
  '5-9': 5,
  '10-49': 10,
  '50-199': 50,
  '200+': 200,
};

const limiter = createRateLimiter({
  limit: envInt(process.env.LEADS_RATE_LIMIT_PER_HOUR, 5),
  windowMs: 60 * 60 * 1000,
});

function back(form: FormKey, query: string): Response {
  const { page, hash } = RETURN[form];
  // Sorgu FRAGMENT'TEN ÖNCE gelmeli: `#y?x` yazılırsa tarayıcı sorguyu
  // fragment'in parçası sayar ve sayfa şeridi hiç açılmaz.
  return seeOther(`${marketingOrigin()}/${page}?${query}${hash}`);
}

function seatsFrom(body: Record<string, unknown>): number {
  const range = field(body, 'seats');
  if (range && Object.prototype.hasOwnProperty.call(SEAT_RANGES, range)) return SEAT_RANGES[range];
  const teamSize = Number.parseInt(field(body, 'team_size'), 10);
  return Number.isInteger(teamSize) && teamSize >= 1 ? teamSize : 1;
}

/** Serbest alanları tek metne toplar; boş olan hiç yazılmaz. */
function noteFrom(body: Record<string, unknown>): string {
  const parts: string[] = [];
  const message = field(body, 'message').trim();
  const platform = field(body, 'platform').trim();
  const jobTitle = field(body, 'job_title').trim();
  const companyUrl = field(body, 'company_url').trim();

  if (message) parts.push(`Message: ${message}`);
  if (platform) parts.push(`Platform: ${platform}`);
  if (jobTitle) parts.push(`Job title: ${jobTitle}`);
  if (companyUrl) parts.push(`Company URL: ${companyUrl}`);

  return parts.join('\n');
}

export async function POST(req: Request): Promise<Response> {
  const { body } = await readBody(req);

  const form: FormKey = field(body, 'form') === 'demo' ? 'demo' : 'contact';

  // Gizli alan: gerçek ziyaretçi göremez, bot doldurur. Doluysa BAŞARI gibi
  // davranılır — bota "yakalandın" demek denemesini değiştirmesine yarar.
  if (field(body, 'website').trim()) return back(form, 'sent=1');

  if (!limiter.check(clientIp(req), Date.now())) return back(form, 'error=rate_limited');

  const name = field(body, 'name').trim();
  const email = field(body, 'email').trim();
  const company = field(body, 'company').trim();
  if (!name || !email || !company) return back(form, 'error=missing_fields');

  // KVKK onayı yalnız contact formunda var ve zorunlu; demo formunda kutu yok.
  if (form === 'contact' && !field(body, 'consent').trim()) {
    return back(form, 'error=consent_required');
  }

  const segment = field(body, 'segment').trim();
  const source =
    form === 'demo'
      ? 'inbound-demo'
      : SEGMENTS.includes(segment)
        ? `inbound-${segment}`
        : 'inbound-contact';

  const note = noteFrom(body);

  try {
    await createInboundLead({
      company,
      contact: `${name} <${email}>`,
      source,
      seats: seatsFrom(body),
      note: note || undefined,
    });
  } catch {
    return back(form, 'error=server_error');
  }

  return back(form, 'sent=1');
}
```

- [ ] **Step 4: Testi koş — yeşil olmalı**

```bash
npm test -w apps/web -- api-public-leads-route
```

Beklenen: PASS (11 test).

- [ ] **Step 5: Env örneklerine yeni değişkenleri ekle**

`.env.example` ve `.env.production.example` dosyalarında posta bloğunun yanına:

```
# Pazarlama sitesindeki demo/iletişim formlarından gelen taleplerin
# bildirileceği adres. Boş bırakılırsa lead yine kaydedilir, posta gitmez.
LEADS_NOTIFY_TO=hello@mailmyra.com
# IP başına saatlik talep sınırı (varsayılan 5).
LEADS_RATE_LIMIT_PER_HOUR=5
```

- [ ] **Step 6: Tam takım koş**

```bash
npm test && npm run typecheck
```

Beklenen: hepsi PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/api/leads apps/web/test/api-public-leads-route.test.ts .env.example .env.production.example
git commit -m "feat(api): public POST /api/leads for the marketing site forms"
```

---

### Task 6: Builder `?template=` desteği

Galeri linkleri (`/builder?template=classic-horizontal`) şu an sessizce yok sayılıyor — kullanıcı seçtiği şablonu değil varsayılanı görüyor.

**Files:**
- Create: `apps/web/app/builder/template-param.ts`
- Create: `apps/web/test/builder-template-param.test.ts`
- Modify: `apps/web/app/builder/page.tsx`
- Modify: `apps/web/app/builder/BuilderClient.tsx`

**Interfaces:**
- Consumes: `TEMPLATE_IDS` (`@mailmyra/renderer`)
- Produces: `templateFromParam(raw)` ve `BuilderClient` üzerinde yeni opsiyonel prop `initialTemplateId?: string`

- [ ] **Step 1: Kırmızı test yaz**

Create `apps/web/test/builder-template-param.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { templateFromParam } from '../app/builder/template-param';

describe('templateFromParam', () => {
  it('geçerli id aynen döner', () => {
    expect(templateFromParam('classic-horizontal')).toBe('classic-horizontal');
    expect(templateFromParam('cta-banner')).toBe('cta-banner');
    expect(templateFromParam('photo-first')).toBe('photo-first');
  });

  it('geçersiz, boş, tanımsız veya dizi girdi undefined döner — 404 YOK', () => {
    // Galeri linki bayatlarsa ziyaretçi yine builder'a girsin; hata sayfası
    // görmesi için bir sebep yok.
    expect(templateFromParam('modern-split')).toBeUndefined();
    expect(templateFromParam('')).toBeUndefined();
    expect(templateFromParam(undefined)).toBeUndefined();
    expect(templateFromParam(['classic-horizontal'])).toBeUndefined();
  });
});
```

- [ ] **Step 2: Testi koş — kırmızı olmalı**

```bash
npm test -w apps/web -- builder-template-param
```

Beklenen: FAIL — modül yok.

- [ ] **Step 3: Yardımcıyı yaz**

Create `apps/web/app/builder/template-param.ts`:

```ts
import { TEMPLATE_IDS } from '@mailmyra/renderer';

/**
 * `/builder?template=<id>` — pazarlama sitesindeki şablon galerisinin
 * "Open in builder" linkleri buradan geliyor.
 *
 * Geçersiz değer sessizce yok sayılır, 404 verilmez: galeri statik bir
 * sitede yaşıyor, bir şablon adı değişirse eski linkler bir süre daha
 * dolaşımda kalır. O linke tıklayan ziyaretçiyi hata sayfasına düşürmek
 * varsayılan şablonla builder'ı açmaktan kötüdür.
 */
export function templateFromParam(raw: string | string[] | undefined): string | undefined {
  if (typeof raw !== 'string' || !raw) return undefined;
  return (TEMPLATE_IDS as readonly string[]).includes(raw) ? raw : undefined;
}
```

- [ ] **Step 4: Testi koş — yeşil olmalı**

```bash
npm test -w apps/web -- builder-template-param
```

Beklenen: PASS (2 test).

- [ ] **Step 5: Sayfaya bağla**

`apps/web/app/builder/page.tsx`:

① Import bloğunun sonuna ekle:

```ts
import { templateFromParam } from './template-param';
```

② `const sig = typeof params.sig === 'string' ? params.sig : undefined;` satırından **sonra** ekle:

```ts
  // Kayıtlı imza düzenlenirken (`?sig=`) onun şablonu kazanır: bindirilmiş
  // verinin şablonu zaten kilitli (BuilderClient'taki `applied` yorumu) ve
  // galeri parametresinin araya girmesi kullanıcının kaydını bozardı.
  const initialTemplateId = sig ? undefined : templateFromParam(params.template);
```

③ `<BuilderClient ... />` çağrısına prop'u ekle (`iconBaseUrl` satırından sonra):

```tsx
      initialTemplateId={initialTemplateId}
```

- [ ] **Step 6: `BuilderClient`'ta prop'u karşıla**

`apps/web/app/builder/BuilderClient.tsx`:

① Yıkım (destructuring) listesine `initialData,` satırından sonra ekle:

```tsx
  initialTemplateId,
```

② Tip bloğunda `initialData?: unknown;` satırından sonra ekle:

```tsx
  /** `/builder?template=` ile gelen şablon. Yalnız anonim/taslak kipinde dolu. */
  initialTemplateId?: string;
```

③ Açılış `useEffect`'inde, `if (draft) dispatch({ type: 'load', ... });` satırından **sonra**, `loadedRef.current = true;`ten **önce** ekle:

```tsx
    // Adresteki şablon taslağın üstüne yazar: kullanıcı galeriden belirli bir
    // şablonu seçerek geldiyse niyeti taslaktakinden tazedir. `load`dan SONRA
    // gönderilmesi şart — önce gönderilseydi taslak onu ezerdi.
    if (initialTemplateId) {
      dispatch({ type: 'patchLayout', value: { templateId: initialTemplateId } });
    }
```

- [ ] **Step 7: Tam takım koş**

```bash
npm test && npm run typecheck && npm run build
```

Beklenen: hepsi PASS.

- [ ] **Step 8: Elle duman testi**

```bash
npm run dev:web
```

Sırayla aç ve doğrula:
- `http://localhost:3000/builder?template=cta-banner` → Stil adımında **CTA bantlı** seçili gelir
- `http://localhost:3000/builder?template=modern-split` → hata yok, varsayılan şablon
- `http://localhost:3000/builder` → eski davranış değişmemiş
- Builder'da bir şablon seç, sayfayı yenile (`?template=` olmadan) → taslak korunuyor

- [ ] **Step 9: Commit**

```bash
git add apps/web/app/builder apps/web/test/builder-template-param.test.ts
git commit -m "feat(builder): honour ?template= from the marketing gallery"
```

---

### Task 7: Panelin nav'ındaki "Real renders" iddiası

`apps/web/components/nav/menu-data.ts:87` → Template gallery açıklaması **`'Real renders, not screenshots.'`**. Bu cümle site tarafında da 30 sayfanın mega menüsünde geçiyor ve **Plan 2 Task 11 Step 6**'da düzeltiliyor; ikisi ayrı depoda olduğu için ayrı ayrı yapılmalı, yoksa panel ile site çelişir.

**Files:**
- Modify: `apps/web/components/nav/menu-data.ts:87`

**Interfaces:**
- Consumes: yok. Produces: yok — yalnız metin.

- [ ] **Step 1: Mevcut hâli gör**

```bash
grep -n "Real renders" apps/web/components/nav/menu-data.ts
```

Beklenen: tek eşleşme, satır 87.

- [ ] **Step 2: Metni değiştir**

`apps/web/components/nav/menu-data.ts` içinde:

```ts
            description: 'Real renders, not screenshots.',
```

→

```ts
            description: 'Rendered by the engine that writes your signature.',
```

Plan 2 Task 11 Step 6'daki metinle **birebir aynı** olmalı — iki yüzey aynı cümleyi söylemeli.

- [ ] **Step 3: Testleri koş**

```bash
npm test -w apps/web && npm run typecheck -w apps/web
```

Beklenen: PASS. Bir nav testi eski dizeyi bekliyorsa onu da güncelle.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/nav/menu-data.ts
git commit -m "fix(nav): drop the real-renders claim until the gallery earns it"
```

---

## Plan sonu: deploy

⚠️ **Bu plan migration İSTER** (Task 1). Tam zincir — `SupportMessage` turundakinin aynısı:

1. Plesk'te uygulamayı **DURDUR**
2. `node scripts/deploy.js` (ilk koşu FTP pasif-mod zaman aşımına düşerse tekrar koş — bilinen davranış)
3. Panelden `exec -- prisma migrate deploy`
4. Panelden `exec -- prisma generate`
5. **BAŞLAT**

Ayrıca `LEADS_NOTIFY_TO` ve `LEADS_RATE_LIMIT_PER_HOUR` **prod ortam değişkenlerine** eklenmeli — eksikse lead yine kaydedilir, yalnız bildirim gitmez.

Deploy sonrası dış duman:

```bash
curl -i -X POST https://app.mailmyra.com/api/leads -d "form=demo&name=T&email=t@t.com&company=T"
```

Beklenen: `303`, `Location: https://mailmyra.com/index.html?sent=1#mailmyra-demo-form`.

Sonra: `/admin/growth/leads` ekranında satır göründü mü ve `note` doldu mu · `hello@mailmyra.com`'a bildirim düştü mü · `https://app.mailmyra.com/builder?template=cta-banner` CTA bantlı geliyor mu.

**Plan 2 (site tarafı) bu deploy'dan SONRA bağlanır** — formlar var olmayan bir uca post etmesin.
