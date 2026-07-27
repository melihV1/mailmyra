import { describe, it, expect } from 'vitest';
import type { SignatureData } from '@mailmyra/renderer';
import { contrastWarnings } from '../app/builder/steps/StyleStep';

function visuals(overrides: Partial<SignatureData['visuals']>): SignatureData['visuals'] {
  return {
    brandColor: '#719ad1',
    iconColor: '#7b9fd3',
    textColor: '#333333',
    mutedColor: '#666666',
    fontFamily: 'Arial, Helvetica, sans-serif',
    ...overrides,
  };
}

// Spec (2026-07-25-week-2-polish-design.md §1): iki BAĞIMSIZ kontrol.
// 1) Açık-zemin: contrastRatio(renk,#ffffff) < 4.5 (text) / < 3 (muted)
// 2) Saf-siyah tabanı: contrastRatio(renk,#000000) < 1.2 (≈ #000–#111 bandı)
// Eski "koyu zeminde (#1a1a1a) okunurluk" kontrolü KALDIRILDI — o kontrol
// hiçbir textColor seçiminin iki zeminde birden uyarısız kalamamasına yol
// açıyordu (eski test dosyasının son test bloğunda belgelenmişti).
describe('contrastWarnings — susması gerekenler', () => {
  it('is silent for the new defaults (#333333 text, #666666 muted)', () => {
    expect(contrastWarnings(visuals({}))).toEqual([]);
  });
  it('is silent for #1a1a1a as text color (dark but not near-pure-black)', () => {
    expect(contrastWarnings(visuals({ textColor: '#1a1a1a' }))).toEqual([]);
  });
  it('is silent for #666666 as text color (≈5.7 on white, well clear of black)', () => {
    // #666666 beyaza karşı ≈5.7 (≥4.5) ve siyaha karşı ≈3.7 (≥1.2) → sessiz.
    expect(contrastWarnings(visuals({ textColor: '#666666' }))).toEqual([]);
  });
});

describe('contrastWarnings — uyarması gerekenler', () => {
  it('warns near-pure-black for #000000 text color, without a white-bg warning', () => {
    expect(contrastWarnings(visuals({ textColor: '#000000' }))).toEqual([
      'Metin rengi saf siyaha çok yakın; koyu modda sorun çıkarabilir.',
    ]);
  });
  it('warns white-bg for #ffffff text color, without a near-black warning', () => {
    expect(contrastWarnings(visuals({ textColor: '#ffffff' }))).toEqual([
      'Metin rengi beyaz zeminde zor okunur.',
    ]);
  });
  it('warns white-bg for a light gray (#cccccc) text color', () => {
    expect(contrastWarnings(visuals({ textColor: '#cccccc' }))).toEqual([
      'Metin rengi beyaz zeminde zor okunur.',
    ]);
  });
  it('warns near-pure-black for #000000 muted color with the muted label', () => {
    expect(contrastWarnings(visuals({ mutedColor: '#000000' }))).toEqual([
      'İkincil metin rengi saf siyaha çok yakın; koyu modda sorun çıkarabilir.',
    ]);
  });
  it('applies the looser muted threshold: #888888 passes as muted (≈3.5 ≥ 3) but a lighter #cccccc fails', () => {
    expect(contrastWarnings(visuals({ mutedColor: '#888888' }))).toEqual([]);
    expect(contrastWarnings(visuals({ mutedColor: '#cccccc' }))).toEqual([
      'İkincil metin rengi beyaz zeminde zor okunur.',
    ]);
  });
});

describe('contrastWarnings — bozuk girdi', () => {
  it('stays silent for an invalid hex instead of throwing', () => {
    expect(contrastWarnings(visuals({ textColor: 'not-a-color' }))).toEqual([]);
  });
});
