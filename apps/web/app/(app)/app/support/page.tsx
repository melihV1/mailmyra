import Link from 'next/link';
import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { formatDate } from '../../../../lib/i18n/format';
import { support as supportDict } from '../../../../lib/i18n/dict/support';
import { getLang } from '../../../../lib/i18n/lang.server';
import { listOwnSupportCases } from '../../../../lib/repo/support';
import { NewTicketForm } from './NewTicketForm';
import { statusLook, TICKET_CATEGORIES } from './support-labels';

export async function generateMetadata() {
  return { title: supportDict[await getLang()].pageTitle };
}

/**
 * Müşteri ticket v1 (spec 2026-08-24) + v2 (spec 2026-08-26): satırlar artık
 * `/app/support/[id]`e link — SenderTable'daki satır-link deseni aynen
 * (linklenen hücre `d-block fw-medium text-heading`, tablo semantiği
 * değişmez). Liste sunucu tarafında repo'dan (GET ucu yok, senders emsali);
 * başka org'un vakası sorguya zaten giremez.
 *
 * `page.subheading` / `form.openedToast` v2 lansmanında güncellendi (fix
 * dalgası, code review bulgusu): "yanıtlar e-postayla gelir" artık YANLIŞ —
 * v2'de yanıt panelde yaşıyor, e-posta yalnız bildirim. Dalga B'nin "mevcut
 * anahtarlar bayt-korunur" kuralı ÇEVİRİ PARİTESİ için var (en/tr birebir
 * eşleşsin diye) — ürünün kendisinin yalanladığı metni korumak için değil.
 */
export default async function SupportPage() {
  // Layout korumasına GÜVENME (paralel render — canlıda 500 görüldü, 2026-08-11).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/support');

  const lang = await getLang();
  const t = supportDict[lang];
  const cases = await listOwnSupportCases(session.user.id);

  if (cases === null) {
    return (
      <section>
        <h4 className="mb-4">{t.page.heading}</h4>
        <div className="card">
          <div className="card-body text-center py-5">
            <div className="avatar avatar-lg mx-auto mb-3">
              <span className="avatar-initial rounded-circle bg-label-secondary">
                <i className="icon-base ti tabler-headset icon-26px" aria-hidden="true" />
              </span>
            </div>
            <h5>{t.page.noWorkspaceTitle}</h5>
            <p className="text-body-secondary mb-0">{t.page.noWorkspaceBody}</p>
          </div>
        </div>
      </section>
    );
  }

  const categories = TICKET_CATEGORIES(lang);
  const categoryLabel = (value: string) =>
    categories.find((c) => c.value === value)?.label ?? value;

  return (
    <section>
      <h4 className="mb-1">{t.page.heading}</h4>
      <p className="text-body-secondary mb-4">{t.page.subheading}</p>

      <div className="row g-6">
        <div className="col-lg-5">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">{t.page.openCaseTitle}</h5>
            </div>
            <div className="card-body">
              <NewTicketForm />
            </div>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">{t.page.yourCasesTitle}</h5>
            </div>
            {cases.length ? (
              <div className="table-responsive text-nowrap">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>{t.page.table.colReference}</th>
                      <th>{t.page.table.colSubject}</th>
                      <th>{t.page.table.colCategory}</th>
                      <th>{t.page.table.colStatus}</th>
                      <th>{t.page.table.colOpened}</th>
                    </tr>
                  </thead>
                  <tbody className="table-border-bottom-0">
                    {cases.map((row) => {
                      const status = statusLook(lang, row.status);
                      return (
                        <tr key={row.id}>
                          <td><code>{row.reference}</code></td>
                          <td>
                            <Link
                              href={'/app/support/' + row.id}
                              className="d-block fw-medium text-heading"
                            >
                              {row.subject}
                            </Link>
                          </td>
                          <td>{categoryLabel(row.category)}</td>
                          <td>
                            <span className={`badge bg-label-${status.tone}`}>{status.label}</span>
                          </td>
                          <td>{formatDate(lang, row.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card-body text-center py-5">
                <p className="text-body-secondary mb-0">{t.page.emptyCases}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
