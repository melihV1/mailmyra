import { redirect } from 'next/navigation';

import { currentSession } from '../../../../lib/auth/current';
import { seedBrandDefaults } from '../../../../lib/brand-apply';
import { AssignSelect } from './AssignSelect';
import { NewSignatureButton } from './NewSignatureButton';
import { RowActions } from './RowActions';
import { getBrand } from '../../../../lib/repo/brand';
import { listSenders, primaryOrgId } from '../../../../lib/repo/senders';
import { listSignatures } from '../../../../lib/repo/signatures';
import { mergeWithEmpty } from '../../../builder/reducer';

export const metadata = { title: 'Signatures — Mailmyra' };

/**
 * Panelin ana ekranı (panel-brief §2.4). Kayıt akışı adım 7'de geliyor;
 * bugün her yeni hesap boş durumu görür — brief'in dediği gibi yönerge,
 * boş kutu değil.
 */
export default async function SignaturesPage() {
  // Layout korumasına GÜVENME: App Router layout ile sayfayı paralel render
  // edebiliyor; layout redirect'e karar verirken sayfa null oturumla çalışır
  // (canlıda 500 olarak görüldü, 2026-08-11).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/signatures');

  const [signatures, senders, orgId] = await Promise.all([
    listSignatures(session.user.id),
    listSenders(session.user.id),
    primaryOrgId(session.user.id),
  ]);
  const options = senders.map((x) => ({ id: x.id, displayName: x.displayName }));

  // Yeni imza tohumu (T8): org'un markası varsa kilitli + varsayılan
  // alanlar baştan doludur — kullanıcı boş formdan başlamaz.
  const brand = orgId ? await getBrand(orgId) : null;
  const seedData = seedBrandDefaults(mergeWithEmpty({}), brand);
  const SENDER_BADGE: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Draft', cls: 'bg-label-secondary' },
    active: { label: 'Live', cls: 'bg-label-success' },
    inactive: { label: 'Inactive', cls: 'bg-label-warning' },
  };

  return (
    <section>
      <h4 className="mb-4">Signatures</h4>

      {signatures.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <div className="avatar avatar-lg mx-auto mb-3">
              <span className="avatar-initial rounded-circle bg-label-primary">
                <i className="icon-base ti tabler-signature icon-26px" aria-hidden="true" />
              </span>
            </div>
            <h5>No signatures yet</h5>
            <p className="text-body-secondary mb-4">
              Build your first signature in a few minutes — pick a template, fill in your
              details, watch the live preview.
            </p>
            <NewSignatureButton seedData={seedData} />
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
            <h5 className="card-title mb-0">
              All signatures{' '}
              <span className="badge bg-label-primary ms-1">{signatures.length}</span>
            </h5>
            <NewSignatureButton seedData={seedData} />
          </div>
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Signature</th>
                  <th>Assigned to</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th style={{ width: '1%' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="table-border-bottom-0">
                {signatures.map((s) => {
                  const badge = s.senderStatus ? SENDER_BADGE[s.senderStatus] : null;
                  return (
                    <tr key={s.id}>
                      <td>
                        <span className="d-block fw-medium text-heading mb-1">{s.name}</span>
                        <span className="badge bg-label-info">{s.templateId}</span>
                      </td>
                      <td>
                        <AssignSelect signatureId={s.id} current={s.senderId} senders={options} />
                      </td>
                      <td>
                        {badge ? (
                          <span className={`badge ${badge.cls}`}>{badge.label}</span>
                        ) : (
                          <span className="badge bg-label-secondary">Unassigned</span>
                        )}
                      </td>
                      <td>
                        <time dateTime={s.updatedAt.toISOString()}>
                          {s.updatedAt.toLocaleDateString('en-GB')}
                        </time>
                      </td>
                      <td>
                        <RowActions id={s.id} name={s.name} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
