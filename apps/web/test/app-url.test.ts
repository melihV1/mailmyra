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
