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
