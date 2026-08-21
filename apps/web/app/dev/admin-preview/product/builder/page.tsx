import { BuilderUsageView } from '../../../../(admin)/ui/ProductOperationsViews';
import { ProductPreviewPage } from '../ProductPreviewPage';
export default function Page() { return <ProductPreviewPage crumb="Product / Builder" title="Builder usage" support="Inspect saved design configuration, assignment and recent editing activity." render={(source, now) => <BuilderUsageView source={source} now={now} preview />} />; }
