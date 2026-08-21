import { ExportsView } from '../../../ui/ProductOperationsViews';
import { ProductPage } from '../ProductPage';
export const metadata = { title: 'Exports — Mailmyra staff' }; export const dynamic = 'force-dynamic';
export default function Page() { return <ProductPage path="/admin/product/exports" crumb="Product / Exports" title="Export analytics" support="Review completed export evidence and active-sender coverage without inferring installation." render={(source, now) => <ExportsView source={source} now={now} />} />; }
