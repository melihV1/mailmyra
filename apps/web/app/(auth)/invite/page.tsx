import { redirect } from 'next/navigation';

import { currentSession } from '../../../lib/auth/current';
import { AcceptInvite } from './AcceptInvite';

export const metadata = { title: 'Invitation — Mailmyra' };

/**
 * Davet linkinin indiği yer. Kabul oturum ister: davetli önce giriş yapar
 * ya da normal akışla kaydolur, sonra buraya döner (`next` korunur).
 * Token linkte tek kullanımlık — kabulde tüketilir, sayfa yüklemede değil.
 */
export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === 'string' ? params.token : '';

  const session = await currentSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/invite?token=${token}`)}`);
  }

  return <AcceptInvite token={token} />;
}
