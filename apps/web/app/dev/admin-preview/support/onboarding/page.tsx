import { SupportOnboardingView } from '../../../../(admin)/ui/SupportOperationsViews';
import { SupportPreviewPage } from '../SupportPreviewPage';

export default function Page() {
  return <SupportPreviewPage crumb="Support / Onboarding" title="Onboarding" support="Guide workspaces toward first export using observable product milestones." render={(source, now) => <SupportOnboardingView source={source} now={now} preview />} />;
}
