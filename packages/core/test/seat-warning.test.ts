import { describe, expect, test } from 'vitest';

import { seatWarningDue } from '../src/entitlement';

/**
 * `activeSeats` her zaman az önce biten publish SONRASI sayım — publish tek
 * koltuk tüketir, bu yüzden "öncesi" tanım gereği bir eksiği.
 */
describe('the 80% seat warning', () => {
  test('fires when the publish crosses the line from below', () => {
    // 3/5 %60'tı, 4/5 %80 — çizgi bu publish'le geçildi.
    expect(seatWarningDue({ activeSeats: 4, entitledSeats: 5 })).toBe(true);
  });

  test('stays quiet while usage is still below the line', () => {
    expect(seatWarningDue({ activeSeats: 3, entitledSeats: 5 })).toBe(false);
  });

  test('does not repeat once the line is already behind', () => {
    // 4/5 zaten %80'di; 5. koltuk ikinci bir mail atmamalı.
    expect(seatWarningDue({ activeSeats: 5, entitledSeats: 5 })).toBe(false);
  });

  test('a one-seat workspace is warned on its only publish', () => {
    // %0 → %100: çizgi geçildi ve bu son koltuktu — bilmesi gereken an bu.
    expect(seatWarningDue({ activeSeats: 1, entitledSeats: 1 })).toBe(true);
  });

  test('a two-seat workspace is warned when it fills up', () => {
    // 1/2 %50 çizginin altında; uyarı ancak ikinci koltukta düşer.
    expect(seatWarningDue({ activeSeats: 1, entitledSeats: 2 })).toBe(false);
    expect(seatWarningDue({ activeSeats: 2, entitledSeats: 2 })).toBe(true);
  });

  test('ten seats: the eighth fires, the ninth does not', () => {
    expect(seatWarningDue({ activeSeats: 8, entitledSeats: 10 })).toBe(true);
    expect(seatWarningDue({ activeSeats: 9, entitledSeats: 10 })).toBe(false);
  });

  test('nonsense inputs stay quiet instead of dividing by zero', () => {
    // Tavanı 0 olan org zaten publish edemez; buraya düşerse de mail atılmaz.
    expect(seatWarningDue({ activeSeats: 0, entitledSeats: 0 })).toBe(false);
    expect(seatWarningDue({ activeSeats: 0, entitledSeats: 5 })).toBe(false);
  });
});
