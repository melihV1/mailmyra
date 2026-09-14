import { describe, it, expect } from 'vitest';
import { initialsFrom } from '../src/utils/monogram';

describe('initialsFrom', () => {
  it('takes first and last word initials', () => {
    expect(initialsFrom('Elif Kaya')).toBe('EK');
  });
  it('uses the LAST word, not the second', () => {
    expect(initialsFrom('Ayse Nur Demir')).toBe('AD');
  });
  it('returns one letter for a single word', () => {
    expect(initialsFrom('Cher')).toBe('C');
  });
  it('leaves an already-uppercase Turkish dotted I alone', () => {
    expect(initialsFrom('İlker Yılmaz')).toBe('İY');
  });
  it('uppercases lowercase Turkish i to the dotted capital', () => {
    expect(initialsFrom('ilker yılmaz')).toBe('İY');
  });
  it('leaves an already-uppercase English I alone', () => {
    expect(initialsFrom('Ian Smith')).toBe('IS');
  });
  it('handles particles by taking first and last', () => {
    expect(initialsFrom('van der Berg')).toBe('VB');
  });
  it('keeps punctuation as typed', () => {
    expect(initialsFrom('J. Smith')).toBe('JS');
  });
  it('collapses runs of whitespace', () => {
    expect(initialsFrom('  Elif   Kaya  ')).toBe('EK');
  });
  it('returns empty for an empty or blank name', () => {
    expect(initialsFrom('')).toBe('');
    expect(initialsFrom('   ')).toBe('');
  });
  it('passes through scripts without case', () => {
    expect(initialsFrom('田中 太郎')).toBe('田太');
  });
  it('is code-point safe for astral characters', () => {
    expect(initialsFrom('🙂 Kaya')).toBe('🙂K');
  });
});
