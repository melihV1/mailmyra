import { describe, it, expect } from 'vitest';
import { isExportGated } from '../lib/export-gate';

describe('isExportGated', () => {
  it('defaults to gated when env is missing', () => {
    expect(isExportGated({} as NodeJS.ProcessEnv)).toBe(true);
  });
  it('is open only for the literal string false', () => {
    expect(isExportGated({ EXPORT_REQUIRES_AUTH: 'false' } as NodeJS.ProcessEnv)).toBe(false);
    expect(isExportGated({ EXPORT_REQUIRES_AUTH: 'FALSE' } as NodeJS.ProcessEnv)).toBe(false);
    expect(isExportGated({ EXPORT_REQUIRES_AUTH: 'true' } as NodeJS.ProcessEnv)).toBe(true);
    expect(isExportGated({ EXPORT_REQUIRES_AUTH: '0' } as NodeJS.ProcessEnv)).toBe(true);
  });
});
