import { describe, expect, it } from 'vitest';

import { preferredLang } from '../lib/i18n/detect';

/**
 * Tarayıcı dili ayrıştırma sözleşmesi (Dalga B): yalnız tr/en tanınır,
 * en yüksek q kazanır, eşitlikte listede önce gelen; boş/bozuk → en.
 */
describe('preferredLang', () => {
  it('boş ya da tanınmayan başlık en', () => {
    expect(preferredLang('')).toBe('en');
    expect(preferredLang('de-DE,fr;q=0.8')).toBe('en');
  });

  it('tr-TR bölge etiketi tanınır', () => {
    expect(preferredLang('tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7')).toBe('tr');
  });

  it('q değeri sırayı yener', () => {
    expect(preferredLang('en;q=0.5,tr;q=0.9')).toBe('tr');
    expect(preferredLang('tr;q=0.3,en')).toBe('en');
  });

  it('eşit q değerinde listede önce gelen kazanır', () => {
    expect(preferredLang('en,tr')).toBe('en');
    expect(preferredLang('tr,en')).toBe('tr');
  });

  it('büyük harf ve boşluk toleransı', () => {
    expect(preferredLang(' TR-tr ')).toBe('tr');
  });

  it('bozuk q değeri 1 sayılır', () => {
    expect(preferredLang('tr;q=abc,en;q=0.9')).toBe('tr');
  });

  it('q=0 RFC 9110 gereği kabul edilemez sayılır, aday elenir', () => {
    expect(preferredLang('tr;q=0,en;q=0.5')).toBe('en');
    expect(preferredLang('tr;q=0')).toBe('en');
  });
});
