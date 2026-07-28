import type { ReactNode } from 'react';
import './tokens.css';
import './fonts.css';
import { MotionProvider } from '../components/motion/MotionProvider';

export const metadata = { title: 'Mailmyra Dev' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>
        {/* MotionProvider (LazyMotion + domAnimation, Karar D1) tüm rotaları
            sarmalar ama `domAnimation` chunk'ı yalnız bir `m.*` bileşeni
            gerçekten render olunca indirilir — builder/login motion
            kullanmadığı için ekstra ağırlık almaz (bkz. MotionProvider.tsx
            yorumu). Font sağlayıcı: tokens.css + fonts.css (General Sans /
            Inter / ClashDisplay @font-face tanımları) zaten burada. */}
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
