import type { ReactNode } from 'react';

import '../(app)/panel-overrides.css';

/**
 * Auth kabuğu (karar 2026-08-14: giriş, kayıt, şifremi unuttum vb. panelin
 * kapısıdır, tema diline geçti). Burada yalnız Vuexy CSS'i ve zemin var;
 * kart iskeleti sayfaların işi — çoğu `AuthCard` (basic) kullanır, login
 * `auth-login-cover` düzenini kendisi kurar.
 *
 * Panel kabuğuyla aynı yalıtım: Vuexy CSS'i <link>le gelir, bundle'a girmez,
 * bu rotadan çıkınca DOM'dan düşer. Tema tercihi bilerek YOK — auth her
 * zaman açık; koyu mod tercihi oturumla birlikte panelde devreye girer.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/vuexy/core.css" />
      <link rel="stylesheet" href="/vuexy/icons.css" />
      <link rel="stylesheet" href="/vuexy/page-auth.css" />
      <div className="mm-panel" data-bs-theme="light">
        {children}
      </div>
    </>
  );
}
