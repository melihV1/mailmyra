import { SupportPlaybooksView } from '../../../../(admin)/ui/SupportOperationsViews';
import { SupportPreviewPage } from '../SupportPreviewPage';

export default function Page() {
  return <SupportPreviewPage crumb="Support / Playbooks" title="Playbooks" support="Use consistent, auditable procedures for recurring support work." render={() => <SupportPlaybooksView preview />} />;
}
