import { describe, expect, it } from 'vitest';

import { KVKK_STATUTORY_DAYS, statutoryDueDate } from '../lib/kvkk';

describe('statutoryDueDate', () => {
  it('kanuni süre tam 30 gündür ve girdiyi değiştirmez', () => {
    const received = new Date(Date.UTC(2026, 7, 21, 10, 0));
    const due = statutoryDueDate(received);

    expect(KVKK_STATUTORY_DAYS).toBe(30);
    expect(due.toISOString()).toBe('2026-09-20T10:00:00.000Z');
    expect(received.toISOString()).toBe('2026-08-21T10:00:00.000Z');
  });
});
