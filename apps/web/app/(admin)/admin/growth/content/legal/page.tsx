import { LegalContentView } from '../../../../ui/GrowthOperationsViews';
import { GrowthPage } from '../../GrowthPage';

export const metadata = { title: 'Legal content — Mailmyra staff' };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <GrowthPage path="/admin/growth/content/legal" crumb="Growth & content / Legal content" title="Legal content" support="Compare published policy routes with acceptance evidence capability." render={() => <LegalContentView />} />;
}
