import { LeadsView } from '../../../../(admin)/ui/GrowthOperationsViews';
import { growthPreviewLeads } from '../../growth-fixtures';
import { GrowthPreviewPage } from '../GrowthPreviewPage';

export default function Page() { return <GrowthPreviewPage crumb="Growth & content / Leads" title="Leads" support="Operate a consent-aware pipeline once a real lead source is connected." render={() => <LeadsView rows={growthPreviewLeads} preview />} />; }
