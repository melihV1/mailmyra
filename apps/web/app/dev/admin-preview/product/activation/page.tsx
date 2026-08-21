import { ActivationFunnelView } from '../../../../(admin)/ui/ProductOperationsViews';
import { ProductPreviewPage } from '../ProductPreviewPage';
export default function Page() { return <ProductPreviewPage crumb="Product / Activation" title="Activation funnel" support="Find the largest observable gaps from workspace creation to evidenced export." render={(source) => <ActivationFunnelView source={source} preview />} />; }
