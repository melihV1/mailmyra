import { CohortsView } from '../../../ui/ProductOperationsViews';
import { ProductPage } from '../ProductPage';
export const metadata = { title: 'Cohorts & retention — Mailmyra staff' }; export const dynamic = 'force-dynamic';
export default function Page() { return <ProductPage path="/admin/product/cohorts" crumb="Product / Cohorts" title="Cohorts & retention" support="Compare registration cohorts with current activation and recent operational return." render={(source, now) => <CohortsView source={source} now={now} />} />; }
