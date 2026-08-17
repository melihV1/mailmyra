/**
 * İmza listesinin süzme/sıralama mantığı — ekranın state'inden bağımsız saf
 * fonksiyonlar (`export-plan.ts` emsali: karar tabloda, test burada).
 *
 * Süzgeç bilerek SUNUCUYA GİTMEZ: liste zaten org kapsamlı geliyor ve tek
 * hesabın imza sayısı sayfalanacak boyutta değil. Sunucuya taşımak her tuşa
 * basışta bir sorgu ucu + ikinci bir yetki kapısı demekti; ekranda süzmek
 * hem anında hem tek kapı.
 */

export interface SignatureFilterRow {
  id: string;
  name: string;
  templateId: string;
  updatedAt: Date;
  senderId: string | null;
}

export type AssignmentFilter = 'all' | 'assigned' | 'unassigned';
export type SignatureSort = 'recent' | 'oldest' | 'name';

export interface SignatureFilterState {
  /** Serbest metin: imza adı + şablon adı. */
  query: string;
  assignment: AssignmentFilter;
  /** Boş string = bütün şablonlar. */
  templateId: string;
  sort: SignatureSort;
}

export const EMPTY_FILTERS: SignatureFilterState = {
  query: '',
  assignment: 'all',
  templateId: '',
  sort: 'recent',
};

/**
 * "Clear filters" düğmesinin görünürlük şartı. Sıralama bilerek DIŞARIDA:
 * sıra bir süzgeç değil bir bakış açısıdır, temizleme onu bozmamalı.
 */
export function hasActiveFilters(state: SignatureFilterState): boolean {
  return state.query.trim() !== '' || state.assignment !== 'all' || state.templateId !== '';
}

/** Şablon seçeneği listesi ekrandaki satırlardan türer — sabit liste tutmuyoruz. */
export function templateOptions(rows: readonly SignatureFilterRow[]): string[] {
  return [...new Set(rows.map((r) => r.templateId))].sort((a, b) => a.localeCompare(b));
}

export function filterSignatures<T extends SignatureFilterRow>(
  rows: readonly T[],
  state: SignatureFilterState,
): T[] {
  const q = state.query.trim().toLowerCase();

  // `filter` zaten yeni dizi üretiyor; aşağıdaki `sort` prop dizisine
  // dokunmaz (yerinde sıralamak React'in gördüğü diziyi bozardı).
  const out = rows.filter((r) => {
    if (state.templateId !== '' && r.templateId !== state.templateId) return false;
    if (state.assignment === 'assigned' && r.senderId === null) return false;
    if (state.assignment === 'unassigned' && r.senderId !== null) return false;
    if (q === '') return true;
    return r.name.toLowerCase().includes(q) || r.templateId.toLowerCase().includes(q);
  });

  if (state.sort === 'oldest') {
    return out.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
  }
  if (state.sort === 'name') {
    return out.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  }
  return out.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}
