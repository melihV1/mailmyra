import { SupportOnboardingView } from '../../../ui/SupportOperationsViews';
import { SupportPage } from '../SupportPage';

export default function Page() {
  return <SupportPage path="/admin/support/onboarding" crumb="Support / Onboarding" title="Onboarding" support="Guide workspaces toward first export using observable product milestones." render={(source, now) => <SupportOnboardingView source={source} now={now} />} />;
}
