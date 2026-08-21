import { FeatureFlagsView } from '../../../../(admin)/ui/PlatformOperationsViews';
import { PlatformPreviewPage } from '../PlatformPreviewPage';

export default function Page() { return <PlatformPreviewPage crumb="Platform / Feature flags" title="Feature flags" support="Govern staged runtime behavior with rollout scope and auditable controls." render={(source) => <FeatureFlagsView source={source} preview />} />; }
