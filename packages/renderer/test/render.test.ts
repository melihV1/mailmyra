import { describe, it, expect } from 'vitest';
import { renderSignature, TEMPLATE_IDS } from '../src/render';
import { fixtures } from '../src/fixtures/samples';

const full = fixtures.find((f) => f.id === 'full')!.data;

describe('renderSignature', () => {
  it('lists classic-horizontal as an available template', () => {
    expect(TEMPLATE_IDS).toContain('classic-horizontal');
  });
  it('renders through a known template id', () => {
    expect(renderSignature(full, 'classic-horizontal')).toContain('<table');
  });
  it('throws on an unknown template id', () => {
    expect(() => renderSignature(full, 'nope')).toThrow(/Unknown templateId/);
  });
  it('accepts an optional RenderOptions argument without changing output when absent', () => {
    const plain = renderSignature(full, 'classic-horizontal');
    const withUndefined = renderSignature(full, 'classic-horizontal', undefined);
    expect(withUndefined).toBe(plain);
  });
  it('threads opts through to the template (smoke: no throw with iconBaseUrl)', () => {
    expect(() =>
      renderSignature(full, 'classic-horizontal', { iconBaseUrl: 'https://cdn.example.com' }),
    ).not.toThrow();
  });
});
