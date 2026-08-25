import { redirect } from 'next/navigation';

import { can } from '@mailmyra/core';
import { currentSession } from '../../../../lib/auth/current';
import { senders as sendersDict } from '../../../../lib/i18n/dict/senders';
import { getLang } from '../../../../lib/i18n/lang.server';
import { listSenders, primaryOrgId, roleFor, seatSummary } from '../../../../lib/repo/senders';
import { AddSenderForm } from './AddSenderForm';
import { ImportCsv } from './ImportCsv';
import { SenderTable } from './SenderTable';

export async function generateMetadata() {
  return { title: sendersDict[await getLang()].pageTitle };
}

/**
 * Koltuk muhasebesinin görüldüğü yer (panel-brief §2.6). Gösterge her zaman
 * üstte; %80'de uyarı tonu, %100'de yayına alma pasifleşir ve açıklanır —
 * düğme gizlenmez. Görsel dil: Vuexy `app-user-list` düzeni (stat kartları +
 * tablo kartı), karar 2026-08-13.
 */
export default async function SendersPage() {
  // Layout korumasına GÜVENME: App Router layout ile sayfayı paralel render
  // edebiliyor; layout redirect'e karar verirken sayfa null oturumla çalışır
  // (canlıda 500 olarak görüldü, 2026-08-11).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/senders');
  const lang = await getLang();
  const t = sendersDict[lang];
  const [seats, senders] = await Promise.all([
    seatSummary(session.user.id),
    listSenders(session.user.id),
  ]);

  const orgId = await primaryOrgId(session.user.id);
  const role = orgId ? await roleFor(session.user.id, orgId) : null;
  const showExport = Boolean(role && can(role, 'signature:export'));

  const pct = seats.entitled > 0 ? Math.min(100, (seats.active / seats.entitled) * 100) : 0;
  const full = seats.active >= seats.entitled;
  const warn = !full && pct >= 80;

  const drafts = senders.filter((s) => s.status === 'draft').length;
  const inactive = senders.filter((s) => s.status === 'inactive').length;

  const stats = [
    {
      label: t.page.liveSenders.label,
      value: String(seats.active),
      note: t.page.liveSenders.note,
      icon: 'tabler-send',
      tone: 'success',
    },
    {
      label: t.page.drafts.label,
      value: String(drafts),
      note: t.page.drafts.note,
      icon: 'tabler-users',
      tone: 'secondary',
    },
    {
      label: t.page.inactiveStat.label,
      value: String(inactive),
      note: t.page.inactiveStat.note,
      icon: 'tabler-user-cog',
      tone: 'warning',
    },
  ] as const;

  return (
    <section>
      <h4 className="mb-4">{t.page.heading}</h4>

      <div className="row g-4 mb-4">
        {/* Koltuk kartı: sayaç + ilerleme çubuğu — brief'teki gösterge burada yaşıyor */}
        <div className="col-sm-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-heading mb-1">{t.page.seatsUsed}</p>
                  <h4 className="mb-2" role="status">
                    {seats.active} <span className="text-body-secondary">/ {seats.entitled}</span>
                  </h4>
                </div>
                <span className="avatar">
                  <span className="avatar-initial rounded bg-label-primary">
                    <i className="icon-base ti tabler-users icon-md" aria-hidden="true" />
                  </span>
                </span>
              </div>
              <div className="progress" style={{ height: 6 }} aria-hidden="true">
                <div
                  className={`progress-bar${full ? ' bg-danger' : warn ? ' bg-warning' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {full && <small className="text-danger d-block mt-2">{t.page.seatsFullNote}</small>}
            </div>
          </div>
        </div>

        {stats.map((s) => (
          <div key={s.label} className="col-sm-6 col-xl-3">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <p className="text-heading mb-1">{s.label}</p>
                    <h4 className="mb-1">{s.value}</h4>
                    <small className="text-body-secondary">{s.note}</small>
                  </div>
                  <span className="avatar">
                    <span className={`avatar-initial rounded bg-label-${s.tone}`}>
                      <i className={`icon-base ti ${s.icon} icon-md`} aria-hidden="true" />
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card mb-4">
        <div className="card-header pb-0">
          <h5 className="card-title mb-0">{t.page.addSenderTitle}</h5>
          <p className="card-subtitle text-body-secondary mt-1">{t.page.addSenderSubtitle}</p>
        </div>
        <div className="card-body">
          <AddSenderForm />
          <ImportCsv />
        </div>
      </div>

      {senders.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <h5>{t.page.emptyTitle}</h5>
            <p className="text-body-secondary mb-0">{t.page.emptyBody}</p>
          </div>
        </div>
      ) : (
        <SenderTable
          rows={senders}
          showExport={showExport}
          activeSeats={seats.active}
          entitledSeats={seats.entitled}
        />
      )}
    </section>
  );
}
