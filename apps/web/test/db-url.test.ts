import { describe, expect, it } from 'vitest';

import { pickDatabaseUrl } from '../lib/db-url';

const both = { DATABASE_URL: 'mysql://dev', TEST_DATABASE_URL: 'mysql://test' };

describe('choosing the database', () => {
  it('tests run against the test database', () => {
    expect(pickDatabaseUrl({ ...both, NODE_ENV: 'test' })).toBe('mysql://test');
  });

  it('development NEVER follows TEST_DATABASE_URL', () => {
    // Yaşandı: Next `.env.local`'i dev'de de yükler; test adresi koşulsuz
    // öne alınınca dev sunucusu test veritabanına yazdı ve entegrasyon
    // testlerinin her koşusu "canlı" dev hesaplarını sildi.
    expect(pickDatabaseUrl({ ...both, NODE_ENV: 'development' })).toBe('mysql://dev');
  });

  it('production never follows it either', () => {
    expect(pickDatabaseUrl({ ...both, NODE_ENV: 'production' })).toBe('mysql://dev');
  });

  it('a test run without a test URL falls back to the main one', () => {
    expect(pickDatabaseUrl({ DATABASE_URL: 'mysql://dev', NODE_ENV: 'test' })).toBe('mysql://dev');
  });
});
