import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminProduct } from '../../../../../lib/i18n/dict/admin-product';
import { TemplatesView } from '../../../ui/ProductOperationsViews';
import { ProductPage } from '../ProductPage';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.productTemplates} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

export default async function Page() {
  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminProduct[lang].pages.templates;
  return (
    <ProductPage
      path="/admin/product/templates"
      crumb={`${nav.product} / ${nav.productTemplates}`}
      title={t.title}
      support={t.support}
      render={(source, now) => <TemplatesView source={source} now={now} />}
    />
  );
}
