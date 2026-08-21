import { TemplatesView } from '../../../../(admin)/ui/ProductOperationsViews';
import { ProductPreviewPage } from '../ProductPreviewPage';
export default function Page() { return <ProductPreviewPage crumb="Product / Templates" title="Template portfolio" support="Compare current template adoption, assignment and recent editing signals." render={(source, now) => <TemplatesView source={source} now={now} preview />} />; }
