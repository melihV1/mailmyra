import { GrowthOverviewView } from '../../../ui/GrowthOperationsViews';
import { GrowthPage } from '../GrowthPage';

export const metadata = { title: 'Growth overview — Mailmyra staff' };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <GrowthPage path="/admin/growth/overview" crumb="Growth & content / Overview" title="Growth overview" support="Read registration, activation and product evidence without inventing traffic attribution." render={(source, now) => <GrowthOverviewView source={source} now={now} />} />;
}
