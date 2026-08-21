import { SupportQueueView } from '../../../../(admin)/ui/SupportOperationsViews';
import { supportPreviewCases } from '../../support-fixtures';
import { SupportPreviewPage } from '../SupportPreviewPage';

export default function Page() {
  return <SupportPreviewPage crumb="Support / Queue" title="Support queue" support="Prioritize inbound customer work by SLA, ownership and current state." render={(_source, now) => <SupportQueueView rows={supportPreviewCases} now={now} preview />} />;
}
