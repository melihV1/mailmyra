import { describe, it, expect, beforeEach } from 'vitest';
import { fixtures } from '@mailmyra/renderer';
import { saveDraft, loadDraft, clearDraft, DRAFT_KEY, type StorageLike } from '../lib/draft';

const DAY = 24 * 60 * 60 * 1000;
const data = fixtures.find((f) => f.id === 'full')!.data;

function fakeStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe('draft', () => {
  let storage: ReturnType<typeof fakeStorage>;
  beforeEach(() => {
    storage = fakeStorage();
  });

  it('round-trips signature data', () => {
    saveDraft(storage, data, 1000);
    expect(loadDraft(storage, 2000)).toEqual(data);
  });
  it('expires drafts older than 30 days and removes the record', () => {
    saveDraft(storage, data, 0);
    expect(loadDraft(storage, 31 * DAY)).toBeNull();
    expect(storage.map.has(DRAFT_KEY)).toBe(false);
  });
  it('keeps drafts younger than 30 days', () => {
    saveDraft(storage, data, 0);
    expect(loadDraft(storage, 29 * DAY)).not.toBeNull();
  });
  it('never persists data: URIs', () => {
    const dirty = {
      ...data,
      visuals: { ...data.visuals, avatarUrl: 'data:image/png;base64,AAAA' },
    };
    saveDraft(storage, dirty, 1000);
    const loaded = loadDraft(storage, 2000)!;
    expect(loaded.visuals.avatarUrl).toBeUndefined();
    expect(storage.map.get(DRAFT_KEY)).not.toContain('base64');
  });
  it('returns null for corrupt records', () => {
    storage.setItem(DRAFT_KEY, '{bozuk json');
    expect(loadDraft(storage, 0)).toBeNull();
  });
  it('clearDraft removes the record', () => {
    saveDraft(storage, data, 0);
    clearDraft(storage);
    expect(loadDraft(storage, 1)).toBeNull();
  });
});
