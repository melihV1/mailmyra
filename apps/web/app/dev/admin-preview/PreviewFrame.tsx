import type { ReactNode } from 'react';
import { AdminShell } from '../../(admin)/AdminShell';
import '../../(app)/panel-overrides.css';

export function PreviewFrame({ children }: { children: ReactNode }) {
  return <><link rel="stylesheet" href="/vuexy/core.css" /><link rel="stylesheet" href="/vuexy/icons.css" /><link rel="stylesheet" href="/vuexy/layout.css" /><AdminShell email="staff@voldi.net">{children}</AdminShell></>;
}
