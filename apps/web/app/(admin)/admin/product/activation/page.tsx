import { getLang } from '../../../../../lib/i18n/lang.server';
import { adminNav } from '../../../../../lib/i18n/dict/admin-nav';
import { adminProduct } from '../../../../../lib/i18n/dict/admin-product';
import { ActivationFunnelView } from '../../../ui/ProductOperationsViews';
import { ProductPage } from '../ProductPage';

export async function generateMetadata() {
  const lang = await getLang();
  return { title: `${adminNav[lang].menu.productActivation} — Mailmyra staff` };
}
export const dynamic = 'force-dynamic';

export default async function Page() {
  const lang = await getLang();
  const nav = adminNav[lang].menu;
  const t = adminProduct[lang].pages.activation;
  return (
    <ProductPage
      path="/admin/product/activation"
      crumb={`${nav.product} / ${t.crumbLeaf}`}
      title={nav.productActivation}
      support={t.support}
      render={(source) => <ActivationFunnelView source={source} />}
    />
  );
}
