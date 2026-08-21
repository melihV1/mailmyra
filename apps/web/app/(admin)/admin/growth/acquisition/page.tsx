import { AcquisitionView } from '../../../ui/GrowthOperationsViews';
import { GrowthPage } from '../GrowthPage';

export const metadata = { title: 'Acquisition — Mailmyra staff' };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <GrowthPage path="/admin/growth/acquisition" crumb="Growth & content / Acquisition" title="Acquisition" support="Follow the durable path from workspace creation to export evidence." render={(source, now) => <AcquisitionView source={source} now={now} />} />;
}
