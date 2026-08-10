import { redirect } from 'next/navigation';

/** `/app` tek başına bir ekran değil — panelin ana ekranına gider. */
export default function AppIndex() {
  redirect('/app/signatures');
}
