import { LegalContentView } from '../../../../../(admin)/ui/GrowthOperationsViews';
import { GrowthPreviewPage } from '../../GrowthPreviewPage';

export default function Page() { return <GrowthPreviewPage crumb="Growth & content / Legal content" title="Legal content" support="Compare published policy routes with acceptance evidence capability." render={() => <LegalContentView preview />} />; }
