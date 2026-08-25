import { redirect } from 'next/navigation';
import { can } from '@mailmyra/core';

import { currentSession } from '../../../../lib/auth/current';
import { prisma } from '../../../../lib/db';
import { brand as brandDict } from '../../../../lib/i18n/dict/brand';
import { getLang } from '../../../../lib/i18n/lang.server';
import { getBrand } from '../../../../lib/repo/brand';
import { primaryOrgId, roleFor } from '../../../../lib/repo/senders';
import { BrandClient } from './BrandClient';

export async function generateMetadata() {
  return { title: brandDict[await getLang()].pageTitle };
}

export default async function BrandPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/brand');
  const lang = await getLang();
  const t = brandDict[lang];
  const orgId = await primaryOrgId(session.user.id);
  const role = orgId ? await roleFor(session.user.id, orgId) : null;

  // Ölü uç yok: yetkisiz rol sayfayı görür ama açıklamayla.
  if (!orgId || !role || !can(role, 'brand:manage')) {
    return (
      <section>
        <h4 className="mb-4">{t.heading}</h4>
        <div className="card">
          <div className="card-body text-center py-5">
            <div className="avatar avatar-lg mx-auto mb-3">
              <span className="avatar-initial rounded-circle bg-label-warning">
                <i className="icon-base ti tabler-lock icon-26px" aria-hidden="true" />
              </span>
            </div>
            <h5>{t.unauthorized.title}</h5>
            <p className="text-body-secondary mb-0">{t.unauthorized.body}</p>
          </div>
        </div>
      </section>
    );
  }

  const [brand, liveSignatures] = await Promise.all([
    getBrand(orgId),
    // Etki diyaloğunun sayısı: yayındaki göndericilere atanmış imzalar.
    prisma.signature.count({
      where: { orgId, sender: { publishedAt: { not: null }, deactivatedAt: null } },
    }),
  ]);

  return (
    <BrandClient
      initialBrand={brand}
      liveSignatures={liveSignatures}
      iconBaseUrl={process.env.CDN_PUBLIC_URL ?? ''}
    />
  );
}
