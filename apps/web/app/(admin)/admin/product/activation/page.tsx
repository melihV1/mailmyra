import { ActivationFunnelView } from '../../../ui/ProductOperationsViews';
import { ProductPage } from '../ProductPage';
export const metadata = { title: 'Activation funnel — Mailmyra staff' }; export const dynamic = 'force-dynamic';
export default function Page() { return <ProductPage path="/admin/product/activation" crumb="Product / Activation" title="Activation funnel" support="Find the largest observable gaps from workspace creation to evidenced export." render={(source) => <ActivationFunnelView source={source} />} />; }
