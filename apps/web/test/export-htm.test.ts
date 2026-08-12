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
