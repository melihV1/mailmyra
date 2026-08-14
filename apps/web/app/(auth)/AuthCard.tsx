import type { ReactNode } from 'react';

/**
 * Temanın `auth-*-basic` kabuğu: ortalanmış kart + renkli logo. Login HARİÇ
 * bütün auth sayfaları bunu kullanır — login `auth-login-cover` düzeninde
 * (kendi page.tsx'i kurar; Hüseyin, 2026-08-14).
 */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="container-xxl">
      <div className="authentication-wrapper authentication-basic container-p-y">
        <div className="authentication-inner py-6">
          <div className="card px-sm-6 px-0">
            <div className="card-body">
              <div className="app-brand justify-content-center mb-6">
                {/* Pazarlama sitesi ayrı host — mutlak URL */}
                <a href="https://mailmyra.com" className="app-brand-link">
                  <img src="/brand/logo-ikonlu.svg" alt="Mailmyra" height={36} />
                </a>
              </div>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
