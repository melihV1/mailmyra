import { JobsView } from '../../../../(admin)/ui/PlatformOperationsViews';
import { PlatformPreviewPage } from '../PlatformPreviewPage';

export default function Page() { return <PlatformPreviewPage crumb="Platform / Jobs" title="Jobs" support="Operate scheduled work through explicit queue, attempt and terminal states." render={(source) => <JobsView source={source} preview />} />; }
