import type { ReactNode } from 'react';
import '../effects.css';
import { Header } from '../../components/nav/Header';
import styles from './layout.module.css';

/**
 * Karar C1 (step1-manifesto.md) — pazarlama route grubu: koyu tema +
 * mega menülü Header burada yaşar. `app/builder/` ve `app/login/` bu
 * layout'un DIŞINDA kaldığı için (route group'a taşınmadılar) açık
 * temada, Header'sız kalmaya devam eder — Next.js route group'ları URL'e
 * segment eklemez (`/` hâlâ `/`), yalnız hangi layout'un sarmaladığını
 * belirler.
 *
 * `effects.css` (glow reçetesi + arka plan atmosferi) yalnız burada import
 * edilir — builder/login hiç yüklemez.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <Header />
      {children}
    </div>
  );
}
