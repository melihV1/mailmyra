import { safeNextPath } from '../../../lib/auth/next-param';
import { AuthCard } from '../AuthCard';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Sign in — Mailmyra' };

/**
 * Login — temanın `auth-login-basic` ortalanmış kartı (2026-08-14: cover
 * denemesi Hüseyin tarafından reddedildi, "normal login" istendi; diğer
 * auth sayfalarıyla aynı AuthCard kabuğu).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = typeof params.next === 'string' ? params.next : undefined;
  // Süzme sunucuda: istemci koduna hiç güvenmeden open redirect kapanıyor.
  return (
    <AuthCard>
      <LoginForm next={safeNextPath(raw)} />
    </AuthCard>
  );
}
