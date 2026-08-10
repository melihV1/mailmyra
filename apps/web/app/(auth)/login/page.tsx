import { safeNextPath } from '../../../lib/auth/next-param';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Sign in — Mailmyra' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = typeof params.next === 'string' ? params.next : undefined;
  // Süzme sunucuda: istemci koduna hiç güvenmeden open redirect kapanıyor.
  return <LoginForm next={safeNextPath(raw)} />;
}
