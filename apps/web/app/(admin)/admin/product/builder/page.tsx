import { BuilderUsageView } from '../../../ui/ProductOperationsViews';
import { ProductPage } from '../ProductPage';
export const metadata = { title: 'Builder usage — Mailmyra staff' }; export const dynamic = 'force-dynamic';
export default function Page() { return <ProductPage path="/admin/product/builder" crumb="Product / Builder" title="Builder usage" support="Inspect saved design configuration, assignment and recent editing activity." render={(source, now) => <BuilderUsageView source={source} now={now} />} />; }
