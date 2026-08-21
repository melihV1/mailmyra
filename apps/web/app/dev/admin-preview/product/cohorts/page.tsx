import { CohortsView } from '../../../../(admin)/ui/ProductOperationsViews';
import { ProductPreviewPage } from '../ProductPreviewPage';
export default function Page() { return <ProductPreviewPage crumb="Product / Cohorts" title="Cohorts & retention" support="Compare registration cohorts with current activation and recent operational return." render={(source, now) => <CohortsView source={source} now={now} preview />} />; }
