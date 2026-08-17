/**
 * 6 istemci test matrisi için malzeme üretici (CLAUDE.md §Test matrisi).
 *
 * Her şablonu AYRI bir e-postanın gövdesi olarak yollar: tek gelen kutusu
 * doldurulur, aynı posta altı istemcide açılır, fark istemcinin render
 * motorundan gelir. Konu satırı şablon adını taşır ki telefonda hangisine
 * baktığın belli olsun.
 *
 * ⚠️ GÖRSELLER: fixture'ların avatar/logo yolları GÖRECELİ
 * (`/brand-fixture/...`) — e-postada taban URL yoktur, kırık çıkarlar.
 * `--assets` ile mutlak taban ver; vermezsen uyarır. Gerçek müşteri verisi
 * bu sorunu yaşamaz (yükleme hattı her zaman CDN mutlak URL'i yazar).
 *
 * Kullanım (repo kökünden):
 *   npx tsx scripts/send-test-signatures.mts --to sen@ornek.com \
 *     [--assets https://cdn.mailmyra.com/brand-fixture] \
 *     [--icons https://cdn.mailmyra.com] [--fixture full] [--dry]
 *
 * SMTP ayarları apps/web/.env.local'den okunur.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fixtures, renderSignature, TEMPLATE_IDS } from '../packages/renderer/src/index';
import type { SignatureData } from '../packages/renderer/src/types';
import { wrapExportDoc } from '../apps/web/lib/export-htm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const DRY = process.argv.includes('--dry');

/** apps/web/.env.local → process.env (yalnız eksik olanlar). */
function loadEnv(): void {
  const file = path.join(ROOT, 'apps/web/.env.local');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m && process.env[m[1]!] === undefined) process.env[m[1]!] = m[2]!.replace(/^"|"$/g, '');
  }
}

const isRelative = (u?: string): boolean => Boolean(u && u.startsWith('/'));

/** Göreceli görsel yollarını mutlak tabana taşır (yukarıdaki uyarı). */
function absolutise(data: SignatureData, base: string): SignatureData {
  const fix = (u?: string) =>
    isRelative(u) ? `${base.replace(/\/$/, '')}${u!.replace(/^\/brand-fixture/, '')}` : u;
  return {
    ...data,
    visuals: {
      ...data.visuals,
      avatarUrl: fix(data.visuals.avatarUrl),
      logoUrl: fix(data.visuals.logoUrl),
      handSignatureUrl: fix(data.visuals.handSignatureUrl),
    },
  };
}

async function main(): Promise<void> {
  loadEnv();
  const to = arg('to');
  if (!to) throw new Error('--to eksik: npx tsx scripts/send-test-signatures.mts --to sen@ornek.com');

  const only = arg('fixture', 'full')!;
  const fx = fixtures.find((f) => f.id === only);
  if (!fx) throw new Error(`Bilinmeyen fixture: ${only} (${fixtures.map((f) => f.id).join(', ')})`);

  const assets = arg('assets');
  const icons = arg('icons');
  let data = fx.data;
  const relatives = [
    data.visuals.avatarUrl,
    data.visuals.logoUrl,
    data.visuals.handSignatureUrl,
  ].filter(isRelative);

  if (relatives.length > 0) {
    if (assets) data = absolutise(data, assets);
    else
      console.warn(
        `⚠️  "${only}" fixture'ında ${relatives.length} GÖRECELİ görsel yolu var; --assets\n` +
          '   verilmediği için görseller e-postada KIRIK çıkacak. Ya --assets <mutlak-taban>\n' +
          '   ver, ya da görselsiz fixture seç (--fixture noLogo veya --fixture minimal).',
      );
  }
  if (!icons) console.warn('ℹ️  --icons verilmedi: sosyal bağlantılar METİN olarak render edilir.');

  const opts = icons ? { iconBaseUrl: icons } : undefined;
  const mails = TEMPLATE_IDS.map((id) => ({
    to,
    subject: `[Mailmyra test] ${id} · ${only}`,
    html: wrapExportDoc(renderSignature(data, id, opts)),
    text: `Mailmyra render testi — şablon: ${id}, fixture: ${only}.`,
  }));

  if (DRY) {
    for (const m of mails) console.log(`${m.subject} — ${Math.round(m.html.length / 102.4) / 10}KB`);
    console.log('\n--dry: hiçbir posta gönderilmedi.');
    return;
  }

  const { getMailer } = await import('../apps/web/lib/mail/index');
  const mailer = getMailer();
  for (const m of mails) {
    await mailer.send(m);
    console.log(`gönderildi → ${m.subject}`);
  }
  console.log(`\n${mails.length} posta ${to} adresine gitti. Altı istemcide de aç.`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
