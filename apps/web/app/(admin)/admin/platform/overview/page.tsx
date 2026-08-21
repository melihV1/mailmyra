import { SystemHealthView } from '../../../ui/PlatformOperationsViews';
import { PlatformPage } from '../PlatformPage';

export default function Page() { return <PlatformPage path="/admin/platform/overview" crumb="Platform / System health" title="System health" support="Monitor service availability, dependency latency and current operating posture." render={(source) => <SystemHealthView source={source} />} />; }
