import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminProduct } from '../../../../../lib/i18n/dict/admin-product';
import { BuilderUsageView } from '../../../ui/ProductOperationsViews';
import { ProductPage } from '../ProductPage';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.productBuilder} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

export default async function Page() {
  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminProduct[lang].pages.builder;
  return (
    <ProductPage
      path="/admin/product/builder"
      crumb={`${nav.product} / ${t.crumbLeaf}`}
      title={nav.productBuilder}
      support={t.support}
      render={(source, now) => <BuilderUsageView source={source} now={now} />}
    />
  );
}
