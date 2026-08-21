import { ProductOverviewView } from '../../../ui/ProductOperationsViews';
import { ProductPage } from '../ProductPage';
export const metadata = { title: 'Product overview — Mailmyra staff' }; export const dynamic = 'force-dynamic';
export default function Page() { return <ProductPage path="/admin/product/overview" crumb="Product / Overview" title="Product overview" support="Monitor durable adoption, activation and export evidence across Mailmyra." render={(source, now) => <ProductOverviewView source={source} now={now} />} />; }
