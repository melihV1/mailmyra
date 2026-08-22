import { describe, expect, it } from 'vitest';

import { SUPPORT_SLA_HOURS, slaDueDate } from '../lib/support-sla';

describe('slaDueDate', () => {
  const FROM = new Date(Date.UTC(2026, 7, 22, 10, 0));

  it('urgent: +4 saat', () => {
    expect(SUPPORT_SLA_HOURS.urgent).toBe(4);
    expect(slaDueDate(FROM, 'urgent').toISOString()).toBe('2026-08-22T14:00:00.000Z');
  });

  it('high: +24 saat', () => {
    expect(SUPPORT_SLA_HOURS.high).toBe(24);
    expect(slaDueDate(FROM, 'high').toISOString()).toBe('2026-08-23T10:00:00.000Z');
  });

  it('normal: +48 saat', () => {
    expect(SUPPORT_SLA_HOURS.normal).toBe(48);
    expect(slaDueDate(FROM, 'normal').toISOString()).toBe('2026-08-24T10:00:00.000Z');
  });

  it('low: +120 saat', () => {
    expect(SUPPORT_SLA_HOURS.low).toBe(120);
    expect(slaDueDate(FROM, 'low').toISOString()).toBe('2026-08-27T10:00:00.000Z');
  });

  it('girdi Date nesnesini mutasyona uğratmaz', () => {
    const before = FROM.getTime();
    slaDueDate(FROM, 'urgent');
    expect(FROM.getTime()).toBe(before);
  });
});
