import { ExportPipelineView } from '../../../ui/PlatformOperationsViews';
import { PlatformPage } from '../PlatformPage';

export default function Page() { return <PlatformPage path="/admin/platform/exports" crumb="Platform / Export pipeline" title="Export pipeline" support="Trace validation, rendering and packaging across signature exports." render={(source) => <ExportPipelineView source={source} />} />; }
