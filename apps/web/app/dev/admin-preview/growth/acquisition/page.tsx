import { AcquisitionView } from '../../../../(admin)/ui/GrowthOperationsViews';
import { GrowthPreviewPage } from '../GrowthPreviewPage';

export default function Page() { return <GrowthPreviewPage crumb="Growth & content / Acquisition" title="Acquisition" support="Follow the durable path from workspace creation to export evidence." render={(source, now) => <AcquisitionView source={source} now={now} preview />} />; }
