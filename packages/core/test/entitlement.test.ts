import { describe, expect, test } from 'vitest';

import { canExport, canPublish } from '../src/entitlement';

const T = new Date('2026-08-10T09:00:00Z');

const draft = { publishedAt: null, deactivatedAt: null };
const active = { publishedAt: T, deactivatedAt: null };
const inactive = { publishedAt: T, deactivatedAt: T };

const paid = { entitledSeats: 5, state: 'active' as const };

describe('publishing a sender', () => {
  test('a draft publishes while seats remain', () => {
    expect(canPublish({ entitlement: paid, activeSeats: 4, target: draft })).toEqual({
      allowed: true,
    });
  });

  test('a draft is refused when the last seat is taken', () => {
    expect(canPublish({ entitlement: paid, activeSeats: 5, target: draft })).toEqual({
      allowed: false,
      reason: 'seat_limit',
    });
  });

  test('re-publishing an already active sender consumes no extra seat', () => {
    // Tavan doluyken bile geçmeli: bu işlem koltuk sayısını değiştirmiyor.
    expect(canPublish({ entitlement: paid, activeSeats: 5, target: active })).toEqual({
      allowed: true,
    });
  });

  test('reactivating a deactivated sender needs a free seat like any other', () => {
    expect(canPublish({ entitlement: paid, activeSeats: 5, target: inactive })).toEqual({
      allowed: false,
      reason: 'seat_limit',
    });
    expect(canPublish({ entitlement: paid, activeSeats: 4, target: inactive })).toEqual({
      allowed: true,
    });
  });

  test('a trial publishes exactly like a paid workspace', () => {
    const trial = { entitledSeats: 1, state: 'trial' as const };
    expect(canPublish({ entitlement: trial, activeSeats: 0, target: draft })).toEqual({
      allowed: true,
    });
    expect(canPublish({ entitlement: trial, activeSeats: 1, target: draft })).toEqual({
      allowed: false,
      reason: 'seat_limit',
    });
  });

  test('a cancelled workspace publishes nothing, even with seats to spare', () => {
    const dead = { entitledSeats: 50, state: 'cancelled' as const };
    expect(canPublish({ entitlement: dead, activeSeats: 0, target: draft })).toEqual({
      allowed: false,
      reason: 'not_entitled',
    });
  });

  test('a past-due workspace keeps its people working but adds no one new', () => {
    const late = { entitledSeats: 5, state: 'past_due' as const };
    expect(canPublish({ entitlement: late, activeSeats: 0, target: draft })).toEqual({
      allowed: false,
      reason: 'not_entitled',
    });
    expect(canPublish({ entitlement: late, activeSeats: 3, target: active })).toEqual({
      allowed: true,
    });
  });

  test('a workspace over its cap cannot publish more, however it got there', () => {
    // Koltuk düşürüldüğünde (ya da elle veri düzeltmesinde) sayım tavanı aşabilir.
    expect(canPublish({ entitlement: paid, activeSeats: 9, target: draft })).toEqual({
      allowed: false,
      reason: 'seat_limit',
    });
  });
});

describe('exporting a signature', () => {
  test('an active sender exports', () => {
    expect(canExport({ entitlement: paid, target: active })).toEqual({ allowed: true });
  });

  test('a draft cannot export — the gate is the sender, not the button', () => {
    expect(canExport({ entitlement: paid, target: draft })).toEqual({
      allowed: false,
      reason: 'not_published',
    });
  });

  test('a deactivated sender cannot export', () => {
    expect(canExport({ entitlement: paid, target: inactive })).toEqual({
      allowed: false,
      reason: 'not_published',
    });
  });

  test('a past-due workspace can still export the people it already published', () => {
    const late = { entitledSeats: 5, state: 'past_due' as const };
    expect(canExport({ entitlement: late, target: active })).toEqual({ allowed: true });
  });

  test('a cancelled workspace exports nothing', () => {
    const dead = { entitledSeats: 5, state: 'cancelled' as const };
    expect(canExport({ entitlement: dead, target: active })).toEqual({
      allowed: false,
      reason: 'not_entitled',
    });
  });
});
