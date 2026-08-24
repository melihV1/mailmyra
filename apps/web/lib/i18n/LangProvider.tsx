'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { Lang } from './types';

/**
 * Sunucu layout'un çözdüğü dili istemci ağacına taşır. Varsayılan 'en':
 * provider'sız kalan bir istemci bileşeni sessizce İngilizce kalır,
 * kırılmaz.
 */
const LangContext = createContext<Lang>('en');

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}
