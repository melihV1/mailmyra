import { PageLoader } from '../../components/ui/PageLoader';

/**
 * Panelin tamamının yükleme durumu. `(app)` grubunun kökünde durduğu için
 * ALTINDAKİ her rota (dashboard, signatures, senders, members, brand,
 * activity, notifications, account/*, guides) bunu otomatik kullanır —
 * sayfa başına ayrı dosya gerekmez. Kabuk `layout.tsx`ten geldiği için
 * sidebar ve navbar yerinde kalır, yalnız içerik alanı bekler.
 */
export default function AppLoading() {
  return <PageLoader />;
}
