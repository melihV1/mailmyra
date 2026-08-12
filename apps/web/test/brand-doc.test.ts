import { describe, expect, it } from 'vitest';

import { parseBrandDocument } from '../lib/brand-doc';

const good = {
  brandColor: { value: '#7b9fd3', mode: 'locked' },
  fontFamily: { value: 'Georgia, serif', mode: 'default' },
  cta: { value: { label: 'Book a call', url: 'https://voldi.net' }, mode: 'default' },
};

// Final inceleme notu (2026-08-12): CTA dalı ensureHttp ile normalize edip
// SONRA doğruluyor — bu üç test o davranışı sabitler.
describe('cta URL normalization', () => {
  it('accepts a schemeless url and stores it normalized', () => {
    const doc = parseBrandDocument({
      cta: { value: { label: 'Book', url: 'voldi.net' }, mode: 'default' },
    });
    expect(doc?.cta?.value.url).toBe('https://voldi.net');
  });

  it('still rejects an empty url after normalization', () => {
    expect(
      parseBrandDocument({ cta: { value: { label: 'Book', url: '' }, mode: 'default' } }),
    ).toBeNull();
  });

  it('still rejects a javascript: url on the cta branch', () => {
    expect(
      parseBrandDocument({
        cta: { value: { label: 'X', url: 'javascript:alert(1)' }, mode: 'locked' },
      }),
    ).toBeNull();
  });
});

describe('parseBrandDocument', () => {
  it('accepts a valid document and returns it typed', () => {
    const doc = parseBrandDocument(good);
    expect(doc?.brandColor).toEqual({ value: '#7b9fd3', mode: 'locked' });
    expect(doc?.cta?.value.url).toBe('https://voldi.net');
  });

  it('accepts the empty document — org yönetmiyor demek', () => {
    expect(parseBrandDocument({})).toEqual({});
  });

  it('rejects an unknown field name', () => {
    expect(parseBrandDocument({ evil: { value: 'x', mode: 'locked' } })).toBeNull();
  });

  it('rejects an unknown mode', () => {
    expect(parseBrandDocument({ brandColor: { value: '#123456', mode: 'suggested' } })).toBeNull();
  });

  it('rejects a malformed hex color', () => {
    expect(parseBrandDocument({ textColor: { value: 'mavi', mode: 'locked' } })).toBeNull();
  });

  it('rejects a font outside the web-safe list', () => {
    expect(parseBrandDocument({ fontFamily: { value: 'Comic Sans MS', mode: 'locked' } })).toBeNull();
  });

  it('rejects a template the renderer does not know', () => {
    expect(parseBrandDocument({ templateId: { value: 'fancy-neon', mode: 'locked' } })).toBeNull();
  });

  it('rejects a non-http(s) logo url', () => {
    expect(parseBrandDocument({ logoUrl: { value: 'javascript:alert(1)', mode: 'locked' } })).toBeNull();
  });

  it('rejects a cta missing its label', () => {
    expect(
      parseBrandDocument({ cta: { value: { label: ' ', url: 'https://voldi.net' }, mode: 'locked' } }),
    ).toBeNull();
  });

  it('rejects extra keys inside a field entry', () => {
    expect(
      parseBrandDocument({ brandColor: { value: '#123456', mode: 'locked', note: 'x' } }),
    ).toBeNull();
  });

  it('rejects non-object roots', () => {
    expect(parseBrandDocument(null)).toBeNull();
    expect(parseBrandDocument([])).toBeNull();
    expect(parseBrandDocument('x')).toBeNull();
  });
});
