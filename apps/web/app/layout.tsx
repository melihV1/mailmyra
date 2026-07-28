import type { ReactNode } from 'react';
import './tokens.css';
import './fonts.css';

export const metadata = { title: 'Mailmyra Dev' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
