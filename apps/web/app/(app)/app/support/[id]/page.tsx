import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { currentSession } from '../../../../../lib/auth/current';
import { formatDate } from '../../../../../lib/i18n/format';
import { support as supportDict } from '../../../../../lib/i18n/dict/support';
import { getLang } from '../../../../../lib/i18n/lang.server';
import { getOwnSupportCase } from '../../../../../lib/repo/support';
import { statusLook } from '../support-labels';
import { ReplyForm } from './ReplyForm';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const lang = await getLang();
  const t = supportDict[lang];
  const session = await currentSession();
  if (!session) return { title: t.pageTitle };
  const { id } = await params;
  const kase = await getOwnSupportCase(session.user.id, id);
  return { title: kase ? t.detail.pageTitle(kase.reference) : t.pageTitle };
}

/**
 * Vaka detayı (ticket v2, spec 2026-08-26 §6 müşteri) — oturum kapısı sayfada
 * (senders/[id] emsali: layout korumasına güvenme, 2026-08-11 canlı 500'ü).
 * `next` liste seviyesinde kalır (kararlı bilerek): [id]'ye dönüş kritik
 * değil, girişten sonra listeye düşüp oradan tekrar tıklamak yeterli.
 *
 * `getOwnSupportCase` başka org'un vakasını hiç DÖNDÜRMEZ (kapı repo
 * sorgusunda) — `null` burada varlık sızdırmadan `notFound()`e çevrilir
 * (invoices/[id] emsali).
 *
 * İplik: sanal açılış balonu (`summary` + `createdAt`, her zaman müşteri)
 * ardından gerçek `messages` satırları — repo zaten createdAt asc sıralı
 * döndürüyor, burada yeniden sıralanmaz. Balon tarafı `authorType`e göre:
 * müşteri sağ/"Sen", personel sol/"Mailmyra destek" — kişi adı YOK (spec
 * §8-2, dijest/aktivite emsali). Saat `formatDate` + lang-farkında
 * `toLocaleTimeString` (BrandClient.tsx `savedAt` emsali, Dalga B) — panel
 * genelinde tek bir tarih yardımcısı (`formatDate`) yok, saat için ayrı
 * yerel biçim gerekiyor.
 */
export default async function SupportCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/support');
  const lang = await getLang();
  const t = supportDict[lang];

  const { id } = await params;
  const kase = await getOwnSupportCase(session.user.id, id);
  if (!kase) notFound();

  const status = statusLook(lang, kase.status);
  const timeLocale = lang === 'tr' ? 'tr-TR' : 'en-GB';
  const timeOf = (d: Date) => d.toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' });

  // Sanal açılış balonu + gerçek iplik — geriye dönük doldurma yok (spec §2).
  const thread: Array<{ id: string; authorType: 'customer' | 'staff'; body: string; createdAt: Date }> = [
    { id: 'opening', authorType: 'customer', body: kase.summary, createdAt: kase.createdAt },
    ...kase.messages,
  ];

  return (
    <section>
      <div className="d-flex align-items-center gap-2 mb-1">
        <Link
          href="/app/support"
          className="btn btn-sm btn-icon btn-text-secondary rounded-pill"
          aria-label={t.detail.back}
        >
          <i className="icon-base ti tabler-chevron-left icon-md" aria-hidden="true" />
        </Link>
        <h4 className="mb-0">{kase.subject}</h4>
        <span className={`badge bg-label-${status.tone}`}>{status.label}</span>
      </div>
      <p className="text-body-secondary mb-4">
        <code>{kase.reference}</code> · {t.detail.openedOn(formatDate(lang, kase.createdAt))}
      </p>

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="card-title mb-0">{t.detail.threadHeading}</h5>
        </div>
        <div className="card-body d-flex flex-column gap-3">
          {thread.map((m) => {
            const mine = m.authorType === 'customer';
            return (
              <div key={m.id} className={`d-flex ${mine ? 'justify-content-end' : 'justify-content-start'}`}>
                <div
                  className={`rounded-3 p-3 ${mine ? 'bg-label-primary' : 'bg-label-secondary'}`}
                  style={{ maxWidth: '75%' }}
                >
                  <div className={`d-flex align-items-center gap-2 mb-1 ${mine ? 'justify-content-end' : ''}`}>
                    <strong className="text-heading">{mine ? t.detail.youLabel : t.detail.staffLabel}</strong>
                    <small className="text-body-secondary">
                      {formatDate(lang, m.createdAt)} · {timeOf(m.createdAt)}
                    </small>
                  </div>
                  <p className="text-body mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                    {m.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {kase.status === 'resolved' && (
        <div className="alert alert-secondary" role="note">
          {t.detail.resolvedNote}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">{t.detail.replyForm.label}</h5>
        </div>
        <div className="card-body">
          <ReplyForm caseId={kase.id} />
        </div>
      </div>
    </section>
  );
}
