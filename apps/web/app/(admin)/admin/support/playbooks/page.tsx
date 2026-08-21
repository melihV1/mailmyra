import { SupportPlaybooksView } from '../../../ui/SupportOperationsViews';
import { SupportPage } from '../SupportPage';

export default function Page() {
  return <SupportPage path="/admin/support/playbooks" crumb="Support / Playbooks" title="Playbooks" support="Use consistent, auditable procedures for recurring support work." render={() => <SupportPlaybooksView />} />;
}
