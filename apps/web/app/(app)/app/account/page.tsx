import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { prisma } from '../../../../lib/db';
import { account as accountDict } from '../../../../lib/i18n/dict/account';
import { nav as navDict } from '../../../../lib/i18n/dict/nav';
import { getLang } from '../../../../lib/i18n/lang.server';
import { LEGAL } from '../../../../lib/legal-links';
import { primaryOrgId, roleFor } from '../../../../lib/repo/senders';
import { AccountTabs } from './AccountTabs';
import { DangerZone } from './DangerZone';
import { EmailChangeForm } from './EmailChangeForm';

export async function generateMetadata() {
  return { title: accountDict[await getLang()].pageTitles.account };
}

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
  const lang = await getLang();
  const t = accountDict[lang];
  const nt = navDict[lang];

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
  const roleKey = (role ?? 'member') as keyof typeof nt.roleLabels;
  const roleLabel = nt.roleLabels[roleKey] ?? role;

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
                  <span className="badge bg-label-success">{t.verified}</span>
                ) : (
                  <span className="badge bg-label-warning">{t.notVerified}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header pb-2">
          <h5 className="card-title mb-1">{t.page.changeEmailTitle}</h5>
          <p className="card-subtitle mb-0">{t.page.changeEmailSubtitle}</p>
        </div>
        <div className="card-body">
          <EmailChangeForm />
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header pb-2">
          <h5 className="card-title mb-0">{t.page.legalTitle}</h5>
        </div>
        {acceptances.length === 0 ? (
          <div className="card-body">
            <p className="text-body-secondary mb-0">{t.page.legalEmpty}</p>
          </div>
        ) : (
          <div className="table-responsive text-nowrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.page.legalTable.colDocument}</th>
                  <th>{t.page.legalTable.colVersion}</th>
                  <th>{t.page.legalTable.colAccepted}</th>
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
                          {a.acceptedAt.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-GB')}
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
