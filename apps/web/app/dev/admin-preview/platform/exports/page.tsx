import { ExportPipelineView } from '../../../../(admin)/ui/PlatformOperationsViews';
import { PlatformPreviewPage } from '../PlatformPreviewPage';

export default function Page() { return <PlatformPreviewPage crumb="Platform / Export pipeline" title="Export pipeline" support="Trace validation, rendering and packaging across signature exports." render={(source) => <ExportPipelineView source={source} preview />} />; }
