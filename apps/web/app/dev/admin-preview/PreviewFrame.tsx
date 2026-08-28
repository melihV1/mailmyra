import type { ReactNode } from 'react';
import { AdminShell } from '../../(admin)/AdminShell';
import { LangProvider } from '../../../lib/i18n/LangProvider';
import { getLang } from '../../../lib/i18n/lang.server';
import '../../(app)/panel-overrides.css';

/**
 * Dalga-sonu cila: `AdminShell` (`useLang()` okur) burada `LangProvider`sız
 * monteydi — önizleme sessizce hep EN kalıyordu. Üretim kabuğu emsali
 * (`app/(admin)/layout.tsx`): sunucuda `getLang()` çöz, `LangProvider`la sar.
 * Dev-only yüzey — kapsam minimal tutuldu.
 */
export async function PreviewFrame({ children }: { children: ReactNode }) {
  const lang = await getLang();
  return <><link rel="stylesheet" href="/vuexy/core.css" /><link rel="stylesheet" href="/vuexy/icons.css" /><link rel="stylesheet" href="/vuexy/layout.css" /><LangProvider lang={lang}><AdminShell email="staff@voldi.net">{children}</AdminShell></LangProvider></>;
}
