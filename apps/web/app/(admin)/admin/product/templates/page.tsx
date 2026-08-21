import { TemplatesView } from '../../../ui/ProductOperationsViews';
import { ProductPage } from '../ProductPage';
export const metadata = { title: 'Templates — Mailmyra staff' }; export const dynamic = 'force-dynamic';
export default function Page() { return <ProductPage path="/admin/product/templates" crumb="Product / Templates" title="Template portfolio" support="Compare current template adoption, assignment and recent editing signals." render={(source, now) => <TemplatesView source={source} now={now} />} />; }
