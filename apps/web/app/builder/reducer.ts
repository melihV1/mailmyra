import type { SignatureData } from '@mailmyra/renderer';

export function createEmptyData(): SignatureData {
  return {
    identity: { fullName: '' },
    contact: {},
    visuals: {
      brandColor: '#719ad1',
      textColor: '#333333',
      mutedColor: '#666666',
      fontFamily: 'Arial, Helvetica, sans-serif',
    },
    social: [],
    extras: {},
    layout: {
      templateId: 'classic-horizontal',
      size: 'medium',
      iconStyle: 'mono',
      showDividers: true,
    },
  };
}

/**
 * Bozuk/kısmi bir taslağı (ör. eski bir şemadan kalan veya elle bozulmuş
 * localStorage kaydı) eksiksiz bir `SignatureData`'ya tamamlar. Bölüm bazlı
 * (identity/contact/visuals/layout) object-spread yapılır — böylece kısmi
 * bir bölüm, o bölümün TAMAMINI değil yalnızca verdiği alanları geçersiz
 * kılar; eksik alanlar `createEmptyData()` varsayılanlarından gelir.
 * `dispatch({ type: 'load', ... })` bunu atlayıp doğrudan `action.value`'yu
 * state yaparsa, eksik bir zorunlu alan (ör. `visuals.brandColor`) render
 * sırasında beyaz ekrana (crash) yol açabilir — bu fonksiyon o çökme
 * dikişini (crash seam) builder mount noktasında kapatır.
 */
export function mergeWithEmpty(partial: Partial<SignatureData>): SignatureData {
  const empty = createEmptyData();
  return {
    identity: { ...empty.identity, ...partial.identity },
    contact: { ...empty.contact, ...partial.contact },
    visuals: { ...empty.visuals, ...partial.visuals },
    social: Array.isArray(partial.social) ? partial.social : empty.social,
    extras: { ...empty.extras, ...partial.extras },
    layout: { ...empty.layout, ...partial.layout },
  };
}

export type BuilderAction =
  | { type: 'patchIdentity'; value: Partial<SignatureData['identity']> }
  | { type: 'patchContact'; value: Partial<SignatureData['contact']> }
  | { type: 'patchVisuals'; value: Partial<SignatureData['visuals']> }
  | { type: 'patchLayout'; value: Partial<SignatureData['layout']> }
  | { type: 'patchExtras'; value: Partial<NonNullable<SignatureData['extras']>> }
  | { type: 'setSocial'; value: SignatureData['social'] }
  | { type: 'load'; value: SignatureData }
  | { type: 'reset' };

export function builderReducer(state: SignatureData, action: BuilderAction): SignatureData {
  switch (action.type) {
    case 'patchIdentity':
      return { ...state, identity: { ...state.identity, ...action.value } };
    case 'patchContact':
      return { ...state, contact: { ...state.contact, ...action.value } };
    case 'patchVisuals':
      return { ...state, visuals: { ...state.visuals, ...action.value } };
    case 'patchLayout':
      return { ...state, layout: { ...state.layout, ...action.value } };
    case 'patchExtras':
      return { ...state, extras: { ...state.extras, ...action.value } };
    case 'setSocial':
      return { ...state, social: action.value };
    case 'load':
      return action.value;
    case 'reset':
      return createEmptyData();
  }
}
