import { ProductOverviewView } from '../../../../(admin)/ui/ProductOperationsViews';
import { ProductPreviewPage } from '../ProductPreviewPage';
export default function Page() { return <ProductPreviewPage crumb="Product / Overview" title="Product overview" support="Monitor durable adoption, activation and export evidence across Mailmyra." render={(source, now) => <ProductOverviewView source={source} now={now} preview />} />; }
