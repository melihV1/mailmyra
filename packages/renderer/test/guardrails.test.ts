import { describe, it, expect } from 'vitest';
import { renderSignature, TEMPLATE_IDS } from '../src/render';
import { fixtures } from '../src/fixtures/samples';

const WEB_SAFE_FONTS = [
  'Arial, Helvetica, sans-serif',
  'Georgia, serif',
  'Times New Roman, serif',
  'Verdana, Geneva, sans-serif',
  'Tahoma, Geneva, sans-serif',
  'Trebuchet MS, sans-serif',
];

// Yasak yapı listeleri TEK yerde tanımlanır — MODES döngüsü ve aşağıdaki
// "monogram branch" bloğu AYNI dizileri kullanır. Biri buraya kontrol
// eklediğinde diğeri otomatik pariteyi korur (bu ikisinin ayrı ayrı elle
// yazılmış olması, monogram tarafının MODES'un zayıf bir alt kümesi kalıp
// geride kalmasına yol açan asıl kusurdu).
const FORBIDDEN_LAYOUT = [
  /<div[\s/>]/i,
  /display\s*:\s*flex/i,
  /display\s*:\s*grid/i,
  /float\s*:/i,
  /position\s*:/i,
];

const FORBIDDEN_STYLE_MARKUP = [/<style/i, /\sclass=/i];

const FORBIDDEN_ASSETS = [/<svg/i, /\.webp/i, /src\s*=\s*["']data:/i, /<script/i];

const ALL_FORBIDDEN_CONSTRUCTS = [
  ...FORBIDDEN_LAYOUT,
  ...FORBIDDEN_STYLE_MARKUP,
  ...FORBIDDEN_ASSETS,
];

// Spec (§3c): guardrail suite'i her şablon×fixture için İKİ modda koşar —
// metin-link (iconBaseUrl'süz) ve ikonlu. İkon <img> kuralları ancak ikinci
// modda tetiklenir.
/**
 * Zemin rengi taşıyan hücreleri, İÇERİKLERİYLE birlikte çıkarır.
 *
 * Neden elle tarayıcı: `<td ...>(.*?)</td>` gibi tembel bir regex iç içe
 * tabloda YANLIŞ kapanışı yakalar — panel hücresi gibi içinde tablo taşıyan
 * hücreler bu şablonlarda var (`photo-first`). Derinlik sayarak eşleşen
 * kapanışı buluyoruz.
 */
function paintedCells(html: string): { open: string; inner: string }[] {
  const out: { open: string; inner: string }[] = [];
  const openTag = /<t[dh]\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = openTag.exec(html)) !== null) {
    const tag = m[0];
    const painted = /\sbgcolor\s*=/i.test(tag) || /background-color\s*:/i.test(tag);
    if (!painted) continue;
    // Eşleşen kapanışı derinlik sayarak bul.
    const scan = /<t[dh]\b[^>]*>|<\/t[dh]>/gi;
    scan.lastIndex = openTag.lastIndex;
    let depth = 1;
    let end = -1;
    let n: RegExpExecArray | null;
    while ((n = scan.exec(html)) !== null) {
      if (n[0].startsWith('</')) {
        depth -= 1;
        if (depth === 0) { end = n.index; break; }
      } else {
        depth += 1;
      }
    }
    if (end === -1) continue; // kapanışsız hücre — ayrı bir sorun, burada değil
    out.push({ open: tag, inner: html.slice(openTag.lastIndex, end) });
  }
  return out;
}

/**
 * Hücre GÖRSEL OLARAK boş mu. `&nbsp;` içerik SAYILIR (kuralın çözümü odur),
 * bir `<img>` ya da iç tablo da içeriktir — iç tablonun kendi hücreleri aynı
 * kuralla ayrıca denetlenir.
 */
function looksEmpty(inner: string): boolean {
  if (/<img\b|<table\b/i.test(inner)) return false;
  return inner.replace(/<[^>]*>/g, '').trim() === '';
}

const MODES = [
  { name: 'text-link', opts: undefined },
  { name: 'icons', opts: { iconBaseUrl: 'https://cdn.example.com' } },
] as const;

for (const mode of MODES) {
  for (const templateId of TEMPLATE_IDS) {
    for (const fx of fixtures) {
      describe(`guardrails: ${templateId} / ${fx.id} / ${mode.name}`, () => {
        const html = renderSignature(fx.data, templateId, mode.opts);

        it('uses no <div>, flexbox, grid, float, or position', () => {
          for (const re of FORBIDDEN_LAYOUT) {
            expect(html).not.toMatch(re);
          }
        });

        it('has no <style> block and no class attributes', () => {
          for (const re of FORBIDDEN_STYLE_MARKUP) {
            expect(html).not.toMatch(re);
          }
        });

        it('every <table> declares border="0" and border:none', () => {
          const tables = html.match(/<table[^>]*>/gi) ?? [];
          expect(tables.length).toBeGreaterThan(0);
          for (const t of tables) {
            expect(t).toContain('border="0"');
            expect(t).toContain('border:none');
          }
        });

        it('never paints a cell that renders empty (Outlook skips the fill)', () => {
          // CLAUDE.md: "Outlook boş hücreye arka plan boyamıyor." Zemin rengi
          // verilen her hücrenin görünür bir içeriği olmalı; çözüm `&nbsp;`.
          //
          // DİKKAT: iddia hücrenin KENDİ alt ağacına bakar, belgenin tamamına
          // değil — belge genelinde `&nbsp;` aramak, bir hücrenin boşluğunu
          // BAŞKA bir hücrenin içeriğiyle örtbas ederdi.
          for (const { open, inner } of paintedCells(html)) {
            expect({ cell: open, empty: looksEmpty(inner) }).toEqual({ cell: open, empty: false });
          }
        });

        it('uses no svg, webp, data-uri images, or scripts', () => {
          for (const re of FORBIDDEN_ASSETS) {
            expect(html).not.toMatch(re);
          }
        });

        it('every <img> carries a width attribute', () => {
          const imgs = html.match(/<img[^>]*>/gi) ?? [];
          for (const img of imgs) {
            expect(img).toMatch(/\swidth=/i);
          }
        });

        // PAZARLIKSIZ (spec §3c): ikon img'leri width VE height taşır —
        // Outlook height'sız dış boyutu tanımaz.
        it('every icon <img> (src containing /icons/) carries width AND height', () => {
          const imgs = html.match(/<img[^>]*>/gi) ?? [];
          for (const img of imgs) {
            if (/src="[^"]*\/icons\//i.test(img)) {
              expect(img).toMatch(/\swidth=/i);
              expect(img).toMatch(/\sheight=/i);
            }
          }
        });

        if (mode.name === 'icons' && fx.data.social.length > 0) {
          it('actually renders icon imgs in icons mode (rule above is not vacuous)', () => {
            expect(html).toMatch(/<img[^>]*src="[^"]*\/icons\//i);
          });
        }

        it('uses only web-safe font families', () => {
          const fonts = [...html.matchAll(/font-family:([^;"']+)/gi)].map((m) =>
            (m[1] ?? '').trim(),
          );
          for (const f of fonts) {
            expect(WEB_SAFE_FONTS).toContain(f);
          }
        });
      });
    }
  }
}

// ⚠️ Düzeltme (final review): bu bloğun önceki yorumu "monogram dalı
// fixture'larda tetiklenmiyor (hepsinin avatari var)" diyordu — YANLIŞ.
// `src/fixtures/samples.ts`'teki `minimal` ve `noLogo` fixture'larının
// `avatarUrl`'ü YOK; yani yukarıdaki MODES döngüsü zaten her şablon × bu
// iki fixture × iki mod için monogram dalını çalıştırıyor. Bu blok var
// olmayan bir boşluğu KAPATMIYOR — asıl işi, dalı fixture bileşimine
// güvenmeden AÇIKÇA sabitlemek: MODES'un kapsamı fixture listesi
// değiştiğinde (ör. bütün fixture'lara avatarUrl eklenirse) sessizce
// daralabilir, burası her zaman fotoğrafsız bir SignatureData ile
// çağrıldığı için o riski taşımaz. Bu yüzden SİLİNMEDİ, tutuldu.
//
// Paylaşılan-sabit çıkarımı (ALL_FORBIDDEN_CONSTRUCTS, MODES ile AYNI
// diziler) iyi bir iyileştirme olarak KALDI: MODES tarafına yeni bir
// kontrol eklendiğinde bu blok elle güncellenmeden pariteyi korur.
describe('guardrails: the empty-painted-cell rule is not vacuous', () => {
  // Yukarıdaki kural, hiç boyalı hücre bulunmazsa sessizce "geçer". Bu blok
  // taramanın gerçekten iş gördüğünü kilitler.
  const found: { tpl: string; cells: number; nested: number }[] = [];
  for (const templateId of TEMPLATE_IDS) {
    let cells = 0;
    let nested = 0;
    for (const fx of fixtures) {
      const html = renderSignature(fx.data, templateId, { iconBaseUrl: 'https://cdn.example.com' });
      for (const c of paintedCells(html)) {
        cells += 1;
        if (/<table\b/i.test(c.inner)) nested += 1;
      }
    }
    found.push({ tpl: templateId, cells, nested });
  }

  it('finds painted cells in every template', () => {
    for (const f of found) {
      expect({ tpl: f.tpl, any: f.cells > 0 }).toEqual({ tpl: f.tpl, any: true });
    }
  });

  it('exercises the nested-table path (a painted cell that wraps a table)', () => {
    // Derinlik sayan tarayıcının varlık sebebi. Bu vaka kaybolursa tembel bir
    // `<td>(.*?)</td>` regex'i de yeterdi — ve o regex iç içe tabloda YANLIŞ
    // kapanışı yakalayıp kuralı sessizce bozardı.
    expect(found.some((f) => f.nested > 0)).toBe(true);
  });
});

describe('guardrails: monogram branch', () => {
  for (const templateId of TEMPLATE_IDS) {
    it(`${templateId} emits no forbidden constructs without a photo`, () => {
      const html = renderSignature(
        {
          identity: { fullName: 'Elif Kaya' },
          contact: { email: 'elif@voldi.net' },
          visuals: {
            brandColor: '#7b9fd3', iconColor: '#7b9fd3', textColor: '#111827', mutedColor: '#6b7280',
            fontFamily: 'Arial, Helvetica, sans-serif',
          },
          social: [],
          layout: { templateId, size: 'medium', iconStyle: 'mono', showDividers: false },
        },
        templateId,
      );
      for (const re of ALL_FORBIDDEN_CONSTRUCTS) {
        expect(html).not.toMatch(re);
      }
    });
  }
});

// Aksan alani ve isim harf araligi, fixture'larla tetiklenmeyen kod yollari:
// fixture'larda `accentBand`/`nameSpacing` alanlari yok, dolayisiyla varsayilan
// disi kombinasyonlar MODES dongusunden gecmiyor.
describe('guardrails: accent + name spacing', () => {
  for (const templateId of TEMPLATE_IDS) {
    it(`${templateId} stays clean with the accent on and the tracking open`, () => {
      const html = renderSignature(
        {
          identity: { fullName: 'Elif Kaya' },
          contact: { email: 'elif@voldi.net' },
          visuals: {
            brandColor: '#7b9fd3', iconColor: '#7b9fd3', textColor: '#111827',
            mutedColor: '#6b7280', fontFamily: 'Arial, Helvetica, sans-serif',
          },
          social: [],
          layout: { templateId, size: 'medium', iconStyle: 'mono', showDividers: false, accentBand: 'auto', nameSpacing: 'wide' },
        },
        templateId,
      );
      for (const pattern of ALL_FORBIDDEN_CONSTRUCTS) {
        expect(html).not.toMatch(pattern);
      }
    });
  }
});
