import { SystemHealthView } from '../../../../(admin)/ui/PlatformOperationsViews';
import { PlatformPreviewPage } from '../PlatformPreviewPage';

export default function Page() { return <PlatformPreviewPage crumb="Platform / System health" title="System health" support="Monitor service availability, dependency latency and current operating posture." render={(source) => <SystemHealthView source={source} preview />} />; }
