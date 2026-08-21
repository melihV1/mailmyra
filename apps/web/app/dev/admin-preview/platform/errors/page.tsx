import { ErrorsView } from '../../../../(admin)/ui/PlatformOperationsViews';
import { PlatformPreviewPage } from '../PlatformPreviewPage';

export default function Page() { return <PlatformPreviewPage crumb="Platform / Errors" title="Errors" support="Triage scrubbed, deduplicated platform failures by impact and recency." render={(source) => <ErrorsView source={source} preview />} />; }
