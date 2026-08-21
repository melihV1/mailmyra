import { ExportsView } from '../../../../(admin)/ui/ProductOperationsViews';
import { ProductPreviewPage } from '../ProductPreviewPage';
export default function Page() { return <ProductPreviewPage crumb="Product / Exports" title="Export analytics" support="Review completed export evidence and active-sender coverage without inferring installation." render={(source, now) => <ExportsView source={source} now={now} preview />} />; }
