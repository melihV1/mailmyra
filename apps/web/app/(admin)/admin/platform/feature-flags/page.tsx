import { FeatureFlagsView } from '../../../ui/PlatformOperationsViews';
import { PlatformPage } from '../PlatformPage';

export default function Page() { return <PlatformPage path="/admin/platform/feature-flags" crumb="Platform / Feature flags" title="Feature flags" support="Govern staged runtime behavior with rollout scope and auditable controls." render={(source) => <FeatureFlagsView source={source} />} />; }
