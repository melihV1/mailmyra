import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminProduct } from '../../../../../lib/i18n/dict/admin-product';
import { ProductOverviewView } from '../../../ui/ProductOperationsViews';
import { ProductPage } from '../ProductPage';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.productOverview} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

export default async function Page() {
  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminProduct[lang].pages.overview;
  return (
    <ProductPage
      path="/admin/product/overview"
      crumb={`${nav.product} / ${t.crumbLeaf}`}
      title={nav.productOverview}
      support={t.support}
      render={(source, now) => <ProductOverviewView source={source} now={now} />}
    />
  );
}
