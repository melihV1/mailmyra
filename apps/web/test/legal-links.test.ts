import { describe, expect, it } from 'vitest';
import { LEGAL } from '../lib/legal-links';

const VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

describe('legal-links', () => {
  it('has a path/version/title entry for terms, privacy and kvkk', () => {
    expect(Object.keys(LEGAL).sort()).toEqual(['kvkk', 'privacy', 'terms']);
  });

  for (const key of ['terms', 'privacy', 'kvkk'] as const) {
    // MUTLAK adres (karar 2026-09-14, bkz. legal-links.ts docblock): app
    // artık kendi /privacy /terms /kvkk kopyalarını sunmuyor, link doğrudan
    // siteye gider. Sabit "mailmyra.com" dizesine değil desene bakılır —
    // origin `NEXT_PUBLIC_MARKETING_ORIGIN`den geliyor (I3) ve staging'de
    // farklı olabilir; test hangi origin olursa olsun "mutlak https + doğru
    // yol" değişmezini sınar.
    it(`${key}: path is an absolute https URL ending in /${key}`, () => {
      expect(LEGAL[key].path).toMatch(new RegExp(`^https://[^/]+/${key}$`));
    });

    it(`${key}: version matches YYYY-MM-DD`, () => {
      expect(LEGAL[key].version).toMatch(VERSION_PATTERN);
    });

    it(`${key}: has a non-empty title`, () => {
      expect(LEGAL[key].title.length).toBeGreaterThan(0);
    });
  }

  // SignupForm, LEGAL.terms.version'ı `termsVersion` olarak gönderir — bu
  // testin amacı yalnızca modül şeklini sınamak (brief §Step1), gerçek kayıt
  // akışı auth-flows.test.ts'de kapsanıyor.
  it('terms.version is the single source SignupForm sends as termsVersion', () => {
    expect(LEGAL.terms.version).toMatch(VERSION_PATTERN);
  });
});
