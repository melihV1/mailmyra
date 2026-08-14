import { redirect } from 'next/navigation';

import { currentSession } from '../../../lib/auth/current';
import { AuthCard } from '../AuthCard';
import { VerifyPending } from './VerifyPending';

export const metadata = { title: 'Verify your email — Mailmyra' };

/** Kapının arkası: oturum yoksa login'e, zaten doğrulanmışsa panele. */
export default async function VerifyPendingPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/app');
  if (session.user.emailVerifiedAt) redirect('/app');

  return (
    <AuthCard>
      <VerifyPending email={session.user.email} />
    </AuthCard>
  );
}
