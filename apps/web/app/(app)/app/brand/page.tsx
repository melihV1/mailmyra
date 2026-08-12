import { redirect } from 'next/navigation';
import { can } from '@mailmyra/core';

import { currentSession } from '../../../../lib/auth/current';
import { prisma } from '../../../../lib/db';
import { getBrand } from '../../../../lib/repo/brand';
import { primaryOrgId, roleFor } from '../../../../lib/repo/senders';
import { BrandClient } from './BrandClient';

export const metadata = { title: 'Brand — Mailmyra' };

export default async function BrandPage() {
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/brand');
  const orgId = await primaryOrgId(session.user.id);
  const role = orgId ? await roleFor(session.user.id, orgId) : null;

  // Ölü uç yok: yetkisiz rol sayfayı görür ama açıklamayla.
  if (!orgId || !role || !can(role, 'brand:manage')) {
    return (
      <section>
        <h1>Brand</h1>
        <p>Brand settings are managed by workspace owners and admins.</p>
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
