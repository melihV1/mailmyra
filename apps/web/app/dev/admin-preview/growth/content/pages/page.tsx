import { PagesSeoView } from '../../../../../(admin)/ui/GrowthOperationsViews';
import { GrowthPreviewPage } from '../../GrowthPreviewPage';

export default function Page() { return <GrowthPreviewPage crumb="Growth & content / Pages & SEO" title="Pages & SEO" support="Review the source-owned public route and metadata registry." render={() => <PagesSeoView preview />} />; }
