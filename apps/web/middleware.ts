import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { SESSION_COOKIE } from './lib/auth/cookie';
import { loginRedirectPath } from './lib/auth/next-param';

/**
 * Middleware yalnız ÖN KONTROL — güvenlik kapısı DEĞİL.
 *
 * `(app)/layout.tsx` ve `(admin)/layout.tsx` sayfayla PARALEL render
 * olduğundan, layout'taki `redirect('/login?next=/app/signatures')` /
 * `redirect('/login?next=/admin')` çoğu zaman sayfanın kendi (doğru
 * `next`'li) korumasını yarışta geçiyordu — `/app/support`e giden
 * girişsiz kullanıcı, girişten sonra `/app/signatures`de buluyordu
 * kendini. Bu dosya o yarışı önden bitirir: `mm_session` çerezi YOKSA
 * istek sayfaya hiç ulaşmadan burada `/login?next=<gerçek yol>`e döner.
 *
 * Çerez VARSA (bayat ya da sahte olsa bile) middleware araya girmez,
 * `NextResponse.next()` der ve işi layout'a bırakır — asıl güvenlik kapısı
 * ORADA: layout'lar her istekte DB'den gerçek oturumu doğrular. Bayat
 * çerezle gelen kullanıcı buradan geçer ama layout'ta yakalanır; o durumda
 * layout'un eski sabit `next` değerine döner — nadir ve kabul edilebilir
 * bir geri düşüş (bkz. layout'ların kendi baş yorumu).
 *
 * Neden burada tam oturum doğrulaması YOK: middleware Edge çalışma
 * zamanında koşuyor, orada Prisma yok (bkz. CLAUDE.md §Stack ve
 * `(app)/layout.tsx` baş yorumu — aynı kısıt). Bu yüzden bağımlılık
 * kasıtlı sınırlı: `next/server` + çerez adı sabiti dışında hiçbir şey
 * import edilmez (Prisma yok, `lib/db` yok, Node-only modül yok).
 * `SESSION_COOKIE` doğrudan `lib/auth/cookie.ts`'ten geliyor çünkü o dosya
 * zaten import'suz, saf bir modül — Edge'de sorunsuz derleniyor.
 */
export function middleware(req: NextRequest) {
  if (req.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }
  const target = loginRedirectPath(req.nextUrl.pathname, req.nextUrl.search);
  return NextResponse.redirect(new URL(target, req.url));
}

export const config = {
  matcher: ['/app/:path*', '/admin/:path*'],
};
