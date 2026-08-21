import type { ReactNode } from 'react';

/**
 * Sayfa başlığı — redesign brief §5.1: breadcrumb `Staff / …`, başlık,
 * en çok 90 karakterlik destek cümlesi, sağda opsiyonel eylem alanı.
 * Breadcrumb markup'ı temanın kendi `breadcrumb` bileşeni.
 */
export function AdminPageHeader({
  crumb,
  title,
  support,
  right,
}: {
  crumb: string;
  title: string;
  support?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mm-admin-page-heading d-flex flex-wrap justify-content-between align-items-start gap-3 mb-6">
      <div className="mm-admin-page-heading__copy">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb breadcrumb-style1 mb-1">
            <li className="breadcrumb-item text-body-secondary">Staff</li>
            <li className="breadcrumb-item active" aria-current="page">
              {crumb}
            </li>
          </ol>
        </nav>
        <h4 className="mb-1">{title}</h4>
        {support && <p className="text-body-secondary mb-0">{support}</p>}
      </div>
      {right && <div className="mm-admin-page-actions d-flex align-items-center gap-2">{right}</div>}
    </div>
  );
}
