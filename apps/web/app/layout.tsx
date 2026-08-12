import type { ReactNode } from 'react';
import './tokens.css';
import './fonts.css';
import { MotionProvider } from '../components/motion/MotionProvider';

export const metadata = { title: 'Mailmyra Dev' };

/* tokens.css'teki `color-scheme: only light` kararının meta karşılığı.
   İkisi birden gerekli: Chrome Android'in Auto Dark Mode'u bazı sürümlerde
   yalnız meta etiketini tanıyor. Tema kararı 2026-07-27: koyu yüzeyler
   renklerini kendisi boyar, tarayıcı karartmaz. */
export const viewport = { colorScheme: 'only light' };

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
