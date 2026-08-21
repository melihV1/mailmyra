import { JobsView } from '../../../ui/PlatformOperationsViews';
import { PlatformPage } from '../PlatformPage';

export default function Page() { return <PlatformPage path="/admin/platform/jobs" crumb="Platform / Jobs" title="Jobs" support="Operate scheduled work through explicit queue, attempt and terminal states." render={(source) => <JobsView source={source} />} />; }
