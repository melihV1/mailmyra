import { SupportCasesView } from '../../../../(admin)/ui/SupportOperationsViews';
import { supportPreviewCases } from '../../support-fixtures';
import { SupportPreviewPage } from '../SupportPreviewPage';

export default function Page() {
  return <SupportPreviewPage crumb="Support / Cases" title="Cases" support="Review the durable support portfolio without mixing customer activity into ticket history." render={(_source, now) => <SupportCasesView rows={supportPreviewCases} now={now} preview />} />;
}
