import { AuthCard } from '../AuthCard';
import { VerifyRunner } from './VerifyRunner';

export const metadata = { title: 'Verify email — Mailmyra' };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === 'string' ? params.token : '';
  return (
    <AuthCard>
      <VerifyRunner token={token} />
    </AuthCard>
  );
}
