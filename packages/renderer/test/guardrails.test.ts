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
          expect(html).not.toMatch(/<div[\s/>]/i);
          expect(html).not.toMatch(/display\s*:\s*flex/i);
          expect(html).not.toMatch(/display\s*:\s*grid/i);
          expect(html).not.toMatch(/float\s*:/i);
          expect(html).not.toMatch(/position\s*:/i);
        });

        it('has no <style> block and no class attributes', () => {
          expect(html).not.toMatch(/<style/i);
          expect(html).not.toMatch(/\sclass=/i);
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
          expect(html).not.toMatch(/<svg/i);
          expect(html).not.toMatch(/\.webp/i);
          expect(html).not.toMatch(/src\s*=\s*["']data:/i);
          expect(html).not.toMatch(/<script/i);
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
