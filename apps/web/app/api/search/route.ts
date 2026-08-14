import { currentSession } from '../../../lib/auth/current';
import { listMembers } from '../../../lib/repo/members';
import { listSenders } from '../../../lib/repo/senders';
import { listSignatures } from '../../../lib/repo/signatures';
import { json } from '../auth/_shared';

export interface SearchHit {
  group: 'Signatures' | 'Senders' | 'Members';
  label: string;
  sublabel: string;
  href: string;
}

const PER_GROUP = 5;

/**
 * Navbar araması (⌘K) — org kapsamı zaten listeleyicilerde: hepsi
 * çağıranın kendi org'unu okur, buradan yabancı veri sızamaz. Veri hacmi
 * Faz 2 gerçekliğinde küçük olduğu için süzme bellekte.
 */
export async function GET(req: Request): Promise<Response> {
  const session = await currentSession();
  if (!session) return json(401, { error: 'unauthenticated' });

  const q = new URL(req.url).searchParams.get('q')?.trim().toLocaleLowerCase('en') ?? '';
  if (q.length < 2) return json(200, { hits: [] });

  const [signatures, senders, members] = await Promise.all([
    listSignatures(session.user.id),
    listSenders(session.user.id),
    listMembers(session.user.id),
  ]);

  const match = (s: string | null | undefined) => (s ?? '').toLocaleLowerCase('en').includes(q);

  const hits: SearchHit[] = [
    ...signatures
      .filter((s) => match(s.name) || match(s.senderName))
      .slice(0, PER_GROUP)
      .map((s) => ({
        group: 'Signatures' as const,
        label: s.name,
        sublabel: s.senderName ? `Assigned to ${s.senderName}` : 'Not assigned',
        href: '/app/signatures',
      })),
    ...senders
      .filter((s) => match(s.displayName) || match(s.email) || match(s.jobTitle))
      .slice(0, PER_GROUP)
      .map((s) => ({
        group: 'Senders' as const,
        label: s.displayName,
        sublabel: s.email,
        href: '/app/senders',
      })),
    ...members
      .filter((m) => match(m.email))
      .slice(0, PER_GROUP)
      .map((m) => ({
        group: 'Members' as const,
        label: m.email,
        sublabel: m.role,
        href: '/app/members',
      })),
  ];

  return json(200, { hits });
}
