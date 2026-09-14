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

// Monogram dalı fixture'larda tetiklenmiyor (hepsinin avatari var), bu yuzden
// yasak yapi kontrolu fotografsiz cikti icin ayrica kosulur. Kontrol listesi
// MODES döngüsüyle AYNI dizilerden (ALL_FORBIDDEN_CONSTRUCTS) geliyor —
// böylece bu blok, adının vaat ettiği "no forbidden constructs" kapsamını
// gerçekten karşılıyor; MODES tarafına yeni bir kontrol eklendiğinde bu
// blok elle güncellenmeden pariteyi korur.
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
