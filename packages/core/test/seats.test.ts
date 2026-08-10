import { describe, expect, test } from 'vitest';

import { countActiveSeats, seatStatus } from '../src/seats';

const T = new Date('2026-08-10T09:00:00Z');
const LATER = new Date('2026-08-10T10:00:00Z');

const draft = { id: 'a', publishedAt: null, deactivatedAt: null };
const active = { id: 'b', publishedAt: T, deactivatedAt: null };
const inactive = { id: 'c', publishedAt: T, deactivatedAt: LATER };

describe('seat status', () => {
  test('an unpublished identity is a draft and is free', () => {
    expect(seatStatus(draft)).toBe('draft');
  });

  test('a published identity is active and consumes a seat', () => {
    expect(seatStatus(active)).toBe('active');
  });

  test('a deactivated identity releases its seat', () => {
    expect(seatStatus(inactive)).toBe('inactive');
  });

  test('deactivation wins over publication regardless of order of dates', () => {
    // Saat kayması ya da elle veri düzeltmesi tarihleri ters çevirebilir.
    // Koltuk sayımı buna güvenmemeli: `deactivatedAt` varsa koltuk boştur.
    expect(seatStatus({ publishedAt: LATER, deactivatedAt: T })).toBe('inactive');
  });

  test('an identity deactivated before it was ever published is not a draft', () => {
    expect(seatStatus({ publishedAt: null, deactivatedAt: T })).toBe('inactive');
  });
});

describe('counting active seats', () => {
  test('an empty org uses no seats', () => {
    expect(countActiveSeats([])).toBe(0);
  });

  test('only active identities are counted', () => {
    expect(countActiveSeats([draft, active, inactive])).toBe(1);
  });

  test('drafts stay free no matter how many there are', () => {
    const drafts = Array.from({ length: 50 }, (_, i) => ({
      id: `d${i}`,
      publishedAt: null,
      deactivatedAt: null,
    }));
    expect(countActiveSeats(drafts)).toBe(0);
  });

  test('counting is a plain sum across whatever list it is handed', () => {
    // Ajans senaryosunda çağıran, org ağacının tamamını tek listede verir;
    // sayım kimin hangi org'da olduğunu bilmez, bilmek zorunda da değil.
    const many = [active, { ...active, id: 'b2' }, { ...active, id: 'b3' }];
    expect(countActiveSeats(many)).toBe(3);
  });
});
