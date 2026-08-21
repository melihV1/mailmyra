import { GrowthOverviewView } from '../../../../(admin)/ui/GrowthOperationsViews';
import { GrowthPreviewPage } from '../GrowthPreviewPage';

export default function Page() { return <GrowthPreviewPage crumb="Growth & content / Overview" title="Growth overview" support="Read registration, activation and product evidence without inventing traffic attribution." render={(source, now) => <GrowthOverviewView source={source} now={now} preview />} />; }
