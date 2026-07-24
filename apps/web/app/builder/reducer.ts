import type { SignatureData } from '@mailmyra/renderer';

export function createEmptyData(): SignatureData {
  return {
    identity: { fullName: '' },
    contact: {},
    visuals: {
      brandColor: '#719ad1',
      textColor: '#1a1a1a',
      mutedColor: '#6d6e71',
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
