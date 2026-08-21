import { ErrorsView } from '../../../ui/PlatformOperationsViews';
import { PlatformPage } from '../PlatformPage';

export default function Page() { return <PlatformPage path="/admin/platform/errors" crumb="Platform / Errors" title="Errors" support="Triage scrubbed, deduplicated platform failures by impact and recency." render={(source) => <ErrorsView source={source} />} />; }
