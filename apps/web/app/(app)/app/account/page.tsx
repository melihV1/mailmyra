import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { prisma } from '../../../../lib/db';
import { LEGAL } from '../../../../lib/legal-links';
import { primaryOrgId, roleFor } from '../../../../lib/repo/senders';
import { AccountTabs } from './AccountTabs';
import { DangerZone } from './DangerZone';
import { EmailChangeForm } from './EmailChangeForm';

export const metadata = { title: 'Account — Mailmyra' };

/** `LegalAcceptance.docType` → ilgili sayfa (dpa henüz sayfaya bağlı değil,
 *  haritada yok — link olmadan düz metin kalır). Tek kaynak lib/legal-links. */
const LEGAL_DOC_LINK: Record<string, string> = {
  terms: LEGAL.terms.path,
  privacy: LEGAL.privacy.path,
};

/**
 * Account sekmesi — kimlik kartı + e-posta değiştirme + hukuk kabulleri +
 * hesap silme. Sekmeli yapı: temanın pages-account-settings-* düzeni
 * (karar 2026-08-14); Security/Billing/Notifications kendi rotalarında.
 */
export default async function AccountPage() {
  // Layout korumasına GÜVENME (paralel render — canlıda 500 görüldü, 2026-08-11).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/account');

  const orgId = await primaryOrgId(session.user.id);
  const [role, acceptances] = await Promise.all([
    orgId ? roleFor(session.user.id, orgId) : null,
    prisma.legalAcceptance.findMany({
      where: { userId: session.user.id },
      orderBy: { acceptedAt: 'desc' },
      select: { id: true, docType: true, version: true, acceptedAt: true },
    }),
  ]);

  const initial = session.user.email.slice(0, 1).toUpperCase();
  const roleLabel = role ? role.slice(0, 1).toUpperCase() + role.slice(1) : 'Member';

  return (
    <section>
      <AccountTabs />

      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex align-items-center flex-wrap gap-4">
            <div className="avatar avatar-xl">
              {/* Navbar/üye listesiyle aynı kaynak: yüklü avatar varsa o, yoksa harf. */}
              {session.user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.avatarUrl} alt="" className="rounded" />
              ) : (
                <span className="avatar-initial rounded bg-label-primary fs-3">{initial}</span>
              )}
            </div>
            <div>
              <h5 className="mb-1">{session.user.email}</h5>
              <div className="d-flex flex-wrap gap-2">
                <span className="badge bg-label-primary">{roleLabel}</span>
                {session.user.emailVerifiedAt ? (
                  <span className="badge bg-label-success">Verified</span>
                ) : (
                  <span className="badge bg-label-warning">Not verified</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header pb-2">
          <h5 className="card-title mb-1">Change e-mail</h5>
          <p className="card-subtitle mb-0">
            We send a confirmation to the new address — the switch happens when you confirm.
          </p>
        </div>
        <div className="card-body">
          <EmailChangeForm />
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header pb-2">
          <h5 className="card-title mb-0">Legal</h5>
        </div>
        {acceptances.length === 0 ? (
          <div className="card-body">
            <p className="text-body-secondary mb-0">No recorded acceptances.</p>
          </div>
        ) : (
          <div className="table-responsive text-nowrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Version</th>
                  <th>Accepted</th>
                </tr>
              </thead>
              <tbody className="table-border-bottom-0">
                {acceptances.map((a) => {
                  const href = LEGAL_DOC_LINK[a.docType];
                  return (
                    <tr key={a.id}>
                      <td>{href ? <a href={href}>{a.docType}</a> : a.docType}</td>
                      <td>v{a.version}</td>
                      <td>
                        <time dateTime={a.acceptedAt.toISOString()}>
                          {a.acceptedAt.toLocaleDateString('en-GB')}
                        </time>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DangerZone userEmail={session.user.email} />
    </section>
  );
}
