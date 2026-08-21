import { ReleasesView } from '../../../../(admin)/ui/PlatformOperationsViews';
import { PlatformPreviewPage } from '../PlatformPreviewPage';

export default function Page() { return <PlatformPreviewPage crumb="Platform / Releases" title="Releases" support="Bind deployments to version, checks, environment and rollback evidence." render={(source) => <ReleasesView source={source} preview />} />; }
