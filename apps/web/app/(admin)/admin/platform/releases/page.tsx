import { ReleasesView } from '../../../ui/PlatformOperationsViews';
import { PlatformPage } from '../PlatformPage';

export default function Page() { return <PlatformPage path="/admin/platform/releases" crumb="Platform / Releases" title="Releases" support="Bind deployments to version, checks, environment and rollback evidence." render={(source) => <ReleasesView source={source} />} />; }
